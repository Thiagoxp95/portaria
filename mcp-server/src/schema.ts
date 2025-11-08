// Database schema - copied from main app
import { sql } from "drizzle-orm";
import { index, sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// Residents table
export const residents = sqliteTable(
  "resident",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    apartmentNumber: text("apartment_number", { length: 100 })
      .notNull()
      .unique(),
    phoneNumber: text("phone_number", { length: 50 }).notNull(),
    residentName: text("resident_name", { length: 255 }),
    notes: text("notes", { length: 500 }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdateFn(
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
    conversationSid: text("conversation_sid", { length: 255 })
      .notNull()
      .primaryKey(),
    toNumber: text("to_number", { length: 50 }).notNull(),
    apt: text("apt", { length: 100 }).notNull(),
    visitor: text("visitor", { length: 255 }).notNull(),
    company: text("company", { length: 255 }).notNull(),
    status: text("status", { length: 20 })
      .notNull()
      .default("pending")
      .$type<"pending" | "approved" | "denied" | "no_answer" | "failed">(),
    lastMsgSid: text("last_msg_sid", { length: 255 }),
    decidedAt: integer("decided_at", { mode: "timestamp" }),
    transcript: text("transcript"),
    ttlSeconds: integer("ttl_seconds").notNull().default(300),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdateFn(
      () => new Date(),
    ),
  },
  (t) => [
    index("whatsapp_consent_status_idx").on(t.status),
    index("whatsapp_consent_to_number_idx").on(t.toNumber),
  ],
);
