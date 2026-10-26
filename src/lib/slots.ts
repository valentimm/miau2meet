export const MAX_RANGE_DAYS = 14;
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const TIMEZONES = [
  { id: "America/Sao_Paulo", label: "Brasília (São Paulo)" },
  { id: "America/Manaus", label: "Manaus" },
  { id: "America/Cuiaba", label: "Cuiabá" },
  { id: "America/Belem", label: "Belém" },
  { id: "America/Fortaleza", label: "Fortaleza" },
  { id: "America/Recife", label: "Recife" },
  { id: "America/Bahia", label: "Salvador" },
  { id: "America/Noronha", label: "Fernando de Noronha" },
  { id: "America/Rio_Branco", label: "Rio Branco" },
  { id: "America/Porto_Velho", label: "Porto Velho" },
  { id: "America/Boa_Vista", label: "Boa Vista" },
  { id: "UTC", label: "UTC" },
] as const;

const TIMEZONE_IDS = new Set<string>(TIMEZONES.map((zone) => zone.id));
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/;

export type EventInput = {
  title: string;
  timezone: string;
  startDate: string;
  endDate: string;
  startHour: number;
  endHour: number;
};

export type FieldErrors = Partial<Record<keyof EventInput, string>>;

export type BestRange = {
  day: string;
  start: string;
  end: string;
  count: number;
  slots: number;
};

export type DayColumn = {
  date: string;
  weekday: string;
  day: string;
  month: string;
};

export function timezoneLabel(id: string): string {
  return TIMEZONES.find((zone) => zone.id === id)?.label ?? id;
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function parseDate(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftDate(iso: string, days: number): string {
  const date = parseDate(iso);
  if (!date) return iso;
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

export function todayInTimezone(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function eachDate(start: string, end: string): string[] {
  const first = parseDate(start);
  const last = parseDate(end);
  if (!first || !last || first > last) return [];
  const days: string[] = [];
  const cursor = new Date(first);
  while (cursor <= last && days.length <= MAX_RANGE_DAYS) {
    days.push(formatIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function dayColumn(iso: string): DayColumn {
  const date = parseDate(iso);
  if (!date) return { date: iso, weekday: "", day: "", month: "" };
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");
  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");
  return { date: iso, weekday, day: String(date.getUTCDate()), month };
}

export function formatDayLong(iso: string): string {
  const column = dayColumn(iso);
  if (!column.weekday) return iso;
  return `${column.weekday}, ${column.day} ${column.month}`;
}

export function buildTimes(startHour: number, endHour: number): string[] {
  const times: string[] = [];
  for (let hour = startHour; hour < endHour; hour += 1) {
    times.push(`${String(hour).padStart(2, "0")}:00`);
    times.push(`${String(hour).padStart(2, "0")}:30`);
  }
  return times;
}

export function slotKey(day: string, time: string): string {
  return `${day}T${time}`;
}

export function buildSlots(input: Pick<EventInput, "startDate" | "endDate" | "startHour" | "endHour">): string[] {
  const slots: string[] = [];
  for (const day of eachDate(input.startDate, input.endDate)) {
    for (const time of buildTimes(input.startHour, input.endHour)) {
      slots.push(slotKey(day, time));
    }
  }
  return slots;
}

export function addMinutes(time: string, minutes: number): string {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  const nextHour = Math.floor(total / 60);
  const nextMinute = total % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

export function describeWindow(input: Pick<EventInput, "startDate" | "endDate" | "startHour" | "endHour" | "timezone">): string {
  const dates =
    input.startDate === input.endDate
      ? formatDayLong(input.startDate)
      : `${formatDayLong(input.startDate)} – ${formatDayLong(input.endDate)}`;
  return `${dates} · ${hourLabel(input.startHour)}–${hourLabel(input.endHour)} · ${timezoneLabel(input.timezone)}`;
}

function readHour(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d{1,2}$/.test(value)) return Number(value);
  return null;
}

export function validateEventInput(input: unknown): { ok: true; value: EventInput } | { ok: false; errors: FieldErrors } {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const errors: FieldErrors = {};
  const title = typeof source.title === "string" ? source.title.trim().replace(/\s+/g, " ") : "";
  if (!title) errors.title = "Dá um nome para o encontro.";
  else if (title.length > 80) errors.title = "O título pode ter no máximo 80 caracteres.";

  const timezone = typeof source.timezone === "string" ? source.timezone : "";
  if (!TIMEZONE_IDS.has(timezone)) errors.timezone = "Escolhe um fuso da lista.";

  const startDate = typeof source.startDate === "string" ? source.startDate : "";
  const endDate = typeof source.endDate === "string" ? source.endDate : "";
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start) errors.startDate = "Data inicial inválida.";
  if (!end) errors.endDate = "Data final inválida.";
  if (start && end && start > end) errors.endDate = "A data final precisa ser igual ou depois da inicial.";
  if (start && end && start <= end) {
    const span = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    if (span > MAX_RANGE_DAYS) errors.endDate = `A grade cabe em até ${MAX_RANGE_DAYS} dias.`;
  }

  const startHour = readHour(source.startHour);
  const endHour = readHour(source.endHour);
  if (startHour === null || startHour < 0 || startHour > 23) errors.startHour = "Hora inicial inválida.";
  if (endHour === null || endHour < 1 || endHour > 24) errors.endHour = "Hora final inválida.";
  if (
    startHour !== null &&
    endHour !== null &&
    !errors.startHour &&
    !errors.endHour &&
    startHour >= endHour
  ) {
    errors.endHour = "O fim precisa ser depois do começo.";
  }

  if (Object.keys(errors).length > 0 || startHour === null || endHour === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: { title, timezone, startDate, endDate, startHour, endHour },
  };
}

export function filterSlots(input: EventInput, slots: unknown): string[] | null {
  if (!Array.isArray(slots)) return null;
  const allowed = new Set(buildSlots(input));
  const chosen = new Set<string>();
  for (const slot of slots) {
    if (typeof slot !== "string" || !SLOT_PATTERN.test(slot) || !allowed.has(slot)) return null;
    chosen.add(slot);
  }
  return [...chosen].sort();
}

export function bestRanges(counts: Record<string, number>, limit = 4): BestRange[] {
  const keys = Object.keys(counts)
    .filter((key) => (counts[key] ?? 0) > 0)
    .sort();
  const ranges: BestRange[] = [];
  for (const key of keys) {
    const count = counts[key] ?? 0;
    const [day, time] = key.split("T");
    if (!day || !time) continue;
    const last = ranges[ranges.length - 1];
    if (last && last.day === day && last.count === count && last.end === time) {
      last.end = addMinutes(time, 30);
      last.slots += 1;
      continue;
    }
    ranges.push({ day, start: time, end: addMinutes(time, 30), count, slots: 1 });
  }
  return ranges
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.slots - a.slots ||
        a.day.localeCompare(b.day) ||
        a.start.localeCompare(b.start),
    )
    .slice(0, limit);
}

export function heatColor(count: number, max: number): { background: string; color: string } {
  if (count <= 0 || max <= 0) return { background: "#fffaf4", color: "#2a2233" };
  const amount = Math.min(1, count / max);
  const from = [255, 250, 244];
  const to = [76, 52, 143];
  const mix = from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount));
  return {
    background: `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`,
    color: amount > 0.62 ? "#fffaf4" : "#2a2233",
  };
}

export function peopleLabel(count: number): string {
  return count === 1 ? "1 pessoa" : `${count} pessoas`;
}
