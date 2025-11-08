// Database schema - copied from main app
import { sql } from "drizzle-orm";
import { index, sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// Residents table
export const residents = sqliteTable(
  "resident",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    apartmentNumber: text("apartmentNumber", { length: 100 })
      .notNull()
      .unique(),
    phoneNumber: text("phoneNumber", { length: 50 }).notNull(),
    residentName: text("residentName", { length: 255 }),
    notes: text("notes", { length: 500 }),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).$onUpdateFn(
      () => new Date(),
    ),
  },
  (t) => [
    index("resident_apartment_idx").on(t.apartmentNumber),
    index("resident_phone_idx").on(t.phoneNumber),
  ],
);

// WhatsApp consent requests table
export const whatsappConsents = sqliteTable(
  "whatsapp_consent",
  {
    conversationSid: text("conversationSid", { length: 255 })
      .notNull()
      .primaryKey(),
    toNumber: text("toNumber", { length: 50 }).notNull(),
    apt: text("apt", { length: 100 }).notNull(),
    visitor: text("visitor", { length: 255 }).notNull(),
    company: text("company", { length: 255 }).notNull(),
    status: text("status", { length: 20 })
      .notNull()
      .default("pending")
      .$type<"pending" | "approved" | "denied" | "no_answer" | "failed">(),
    lastMsgSid: text("lastMsgSid", { length: 255 }),
    decidedAt: integer("decidedAt", { mode: "timestamp" }),
    transcript: text("transcript"),
    ttlSeconds: integer("ttlSeconds").notNull().default(300),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).$onUpdateFn(
      () => new Date(),
    ),
  },
  (t) => [
    index("whatsapp_consent_status_idx").on(t.status),
    index("whatsapp_consent_to_number_idx").on(t.toNumber),
  ],
);
