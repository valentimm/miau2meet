import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Columns we read from Better Auth's user table. Auth writes the rest
 * (emailVerified, image, timestamps) through its own D1 adapter.
 */
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
});

export const events = sqliteTable(
  "event",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    startHour: integer("start_hour").notNull(),
    endHour: integer("end_hour").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("event_owner_idx").on(table.ownerId)],
);

export const availabilities = sqliteTable(
  "availability",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slots: text("slots").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
    index("availability_user_idx").on(table.userId),
  ],
);

export const schema = { user, events, availabilities };
