import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Context, Hono } from "hono";
import { availabilities, events, user } from "../db/schema";
import { getDb } from "../db/client";
import {
  buildTimes,
  dayColumn,
  describeWindow,
  eachDate,
  filterSlots,
  timezoneLabel,
  validateEventInput,
  type EventInput,
} from "../lib/slots";
import { readSession } from "./auth";

const EVENT_ID = /^[a-z0-9]{8,32}$/;

type AppContext = Context<{ Bindings: Env }>;
type Viewer = { id: string; name: string };

function createId(size = 12): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const byte of bytes) id += alphabet[byte % alphabet.length];
  return id;
}

async function viewerOf(c: AppContext): Promise<Viewer | null> {
  const userRecord = await readSession(c.env, c.req.raw);
  if (!userRecord) return null;
  return { id: userRecord.id, name: userRecord.name };
}

function parseStoredSlots(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((slot): slot is string => typeof slot === "string");
  } catch {
    return [];
  }
}

async function loadHeat(database: ReturnType<typeof getDb>, eventId: string, viewerId: string | null) {
  const rows = await database
    .select({
      userId: availabilities.userId,
      name: user.name,
      slots: availabilities.slots,
    })
    .from(availabilities)
    .innerJoin(user, eq(user.id, availabilities.userId))
    .where(eq(availabilities.eventId, eventId));

  const counts: Record<string, number> = {};
  const people: { id: string; name: string; count: number }[] = [];
  let mine: string[] = [];

  for (const row of rows) {
    const slots = parseStoredSlots(row.slots);
    if (slots.length === 0) continue;
    if (viewerId && row.userId === viewerId) mine = slots;
    people.push({ id: row.userId, name: row.name, count: slots.length });
    for (const slot of slots) counts[slot] = (counts[slot] ?? 0) + 1;
  }

  people.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
  return { counts, mine, people };
}

function eventShape(row: typeof events.$inferSelect, ownerName: string, viewer: Viewer | null) {
  const input: EventInput = {
    title: row.title,
    timezone: row.timezone,
    startDate: row.startDate,
    endDate: row.endDate,
    startHour: row.startHour,
    endHour: row.endHour,
  };
  return {
    event: {
      id: row.id,
      title: row.title,
      timezone: row.timezone,
      timezoneLabel: timezoneLabel(row.timezone),
      startDate: row.startDate,
      endDate: row.endDate,
      startHour: row.startHour,
      endHour: row.endHour,
      ownerId: row.ownerId,
      ownerName,
      summary: describeWindow(input),
      createdAt: row.createdAt,
    },
    days: eachDate(row.startDate, row.endDate).map(dayColumn),
    times: buildTimes(row.startHour, row.endHour),
    input,
    isOwner: viewer?.id === row.ownerId,
    canEdit: Boolean(viewer),
  };
}

export function registerEventRoutes(app: Hono<{ Bindings: Env }>) {
  app.get("/api/events", async (c) => {
    const viewer = await viewerOf(c);
    if (!viewer) return c.json({ error: "Entre para ver seus encontros." }, 401);
    const database = getDb(c.env.DB);
    const owned = await database
      .select()
      .from(events)
      .where(eq(events.ownerId, viewer.id))
      .orderBy(desc(events.createdAt));
    const joinedRows = await database
      .select({ event: events })
      .from(availabilities)
      .innerJoin(events, eq(events.id, availabilities.eventId))
      .where(eq(availabilities.userId, viewer.id));
    const byId = new Map<string, { row: typeof events.$inferSelect; role: "owner" | "guest" }>();
    for (const row of owned) byId.set(row.id, { row, role: "owner" });
    for (const { event } of joinedRows) {
      if (!byId.has(event.id)) byId.set(event.id, { row: event, role: "guest" });
    }
    const ids = [...byId.keys()];
    const participantCounts = new Map<string, number>();
    if (ids.length > 0) {
      const grouped = await database
        .select({
          eventId: availabilities.eventId,
          total: sql<number>`count(*)`,
        })
        .from(availabilities)
        .where(inArray(availabilities.eventId, ids))
        .groupBy(availabilities.eventId);
      for (const row of grouped) participantCounts.set(row.eventId, Number(row.total));
    }
    const list = [...byId.values()]
      .sort((a, b) => b.row.createdAt.localeCompare(a.row.createdAt))
      .map(({ row, role }) => ({
        id: row.id,
        title: row.title,
        summary: describeWindow(row),
        createdAt: row.createdAt,
        role,
        participants: participantCounts.get(row.id) ?? 0,
      }));
    return c.json({ events: list });
  });

  app.post("/api/events", async (c) => {
    const viewer = await viewerOf(c);
    if (!viewer) return c.json({ error: "Entre para criar um encontro." }, 401);
    const body = await c.req.json().catch(() => null);
    const parsed = validateEventInput(body);
    if (!parsed.ok) return c.json({ error: "Confere os campos do encontro.", fields: parsed.errors }, 400);
    const database = getDb(c.env.DB);
    const id = createId();
    const createdAt = new Date().toISOString();
    await database.insert(events).values({
      id,
      ownerId: viewer.id,
      title: parsed.value.title,
      timezone: parsed.value.timezone,
      startDate: parsed.value.startDate,
      endDate: parsed.value.endDate,
      startHour: parsed.value.startHour,
      endHour: parsed.value.endHour,
      createdAt,
    });
    return c.json({ id }, 201);
  });

  app.get("/api/events/:id", async (c) => {
    const id = c.req.param("id");
    if (!EVENT_ID.test(id)) return c.json({ error: "Não achei esse encontro." }, 404);
    const database = getDb(c.env.DB);
    const [row] = await database.select().from(events).where(eq(events.id, id)).limit(1);
    if (!row) return c.json({ error: "Não achei esse encontro." }, 404);
    const [owner] = await database.select({ name: user.name }).from(user).where(eq(user.id, row.ownerId)).limit(1);
    const viewer = await viewerOf(c);
    const heat = await loadHeat(database, id, viewer?.id ?? null);
    const shape = eventShape(row, owner?.name ?? "Alguém", viewer);
    return c.json({
      event: shape.event,
      days: shape.days,
      times: shape.times,
      counts: heat.counts,
      mine: heat.mine,
      people: heat.people,
      isOwner: shape.isOwner,
      canEdit: shape.canEdit,
    });
  });

  app.put("/api/events/:id/availability", async (c) => {
    const viewer = await viewerOf(c);
    if (!viewer) return c.json({ error: "Entre para pintar seus horários." }, 401);
    const id = c.req.param("id");
    if (!EVENT_ID.test(id)) return c.json({ error: "Não achei esse encontro." }, 404);
    const database = getDb(c.env.DB);
    const [row] = await database.select().from(events).where(eq(events.id, id)).limit(1);
    if (!row) return c.json({ error: "Não achei esse encontro." }, 404);
    const body = await c.req.json().catch(() => null);
    const source = typeof body === "object" && body !== null ? (body as { slots?: unknown }).slots : null;
    const slots = filterSlots(
      {
        title: row.title,
        timezone: row.timezone,
        startDate: row.startDate,
        endDate: row.endDate,
        startHour: row.startHour,
        endHour: row.endHour,
      },
      source,
    );
    if (!slots) return c.json({ error: "Esses horários não cabem nesta grade." }, 400);
    if (slots.length === 0) {
      await database
        .delete(availabilities)
        .where(and(eq(availabilities.eventId, id), eq(availabilities.userId, viewer.id)));
    } else {
      await database
        .insert(availabilities)
        .values({
          eventId: id,
          userId: viewer.id,
          slots: JSON.stringify(slots),
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [availabilities.eventId, availabilities.userId],
          set: {
            slots: JSON.stringify(slots),
            updatedAt: new Date().toISOString(),
          },
        });
    }
    const heat = await loadHeat(database, id, viewer.id);
    return c.json(heat);
  });

  app.delete("/api/events/:id", async (c) => {
    const viewer = await viewerOf(c);
    if (!viewer) return c.json({ error: "Entre para apagar um encontro." }, 401);
    const id = c.req.param("id");
    if (!EVENT_ID.test(id)) return c.json({ error: "Não achei esse encontro." }, 404);
    const database = getDb(c.env.DB);
    const removed = await database
      .delete(events)
      .where(and(eq(events.id, id), eq(events.ownerId, viewer.id)))
      .returning({ id: events.id });
    if (removed.length === 0) return c.json({ error: "Só quem organiza pode apagar este encontro." }, 403);
    return c.json({ ok: true });
  });
}
