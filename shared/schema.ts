import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username").default(null),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").default(null),
  photoUrl: text("photo_url").default(null),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  bin: text("bin").notNull(), // БИН/ИИН
  address: text("address").notNull(),
  bank: text("bank").notNull(),
  bik: text("bik").notNull(),
  iik: text("iik").notNull(),
  kbe: text("kbe").default(null),
  paymentCode: text("payment_code").default(null),
  createdAt: timestamp("created_at").defaultNow(),
});

export const buyers = pgTable("buyers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  bin: text("bin").notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  supplierId: varchar("supplier_id").references(() => suppliers.id).notNull(),
  buyerId: varchar("buyer_id").references(() => buyers.id).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  contract: text("contract").default("Без договора"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  totalAmountWords: text("total_amount_words").notNull(),
  status: text("status").default("draft"), // draft, sent, paid
  pdfUrl: text("pdf_url").default(null),
  excelUrl: text("excel_url").default(null),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  name: text("name").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const signatureSettings = pgTable("signature_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  signatureUrl: text("signature_url").default(null),
  signatureWidth: integer("signature_width").default(200),
  signatureHeight: integer("signature_height").default(70),
  signaturePosition: text("signature_position").default("right"), // left, center, right
  stampUrl: text("stamp_url").default(null),
  stampSize: integer("stamp_size").default(100),
  stampPosition: text("stamp_position").default("left"), // left, center, right
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

export const insertBuyerSchema = createInsertSchema(buyers).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
});

export const insertSignatureSettingsSchema = createInsertSchema(signatureSettings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Buyer = typeof buyers.$inferSelect;
export type InsertBuyer = z.infer<typeof insertBuyerSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type SignatureSettings = typeof signatureSettings.$inferSelect;
export type InsertSignatureSettings = z.infer<typeof insertSignatureSettingsSchema>;

// Complete invoice with relations
export type InvoiceWithDetails = Invoice & {
  supplier: Supplier;
  buyer: Buyer;
  items: InvoiceItem[];
  signatureSettings?: SignatureSettings;
};
