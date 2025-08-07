import { db } from "./db";
import { users, suppliers, buyers, invoices, invoiceItems, signatureSettings } from "@shared/schema";
import type { IStorage, User, InsertUser, Supplier, InsertSupplier, Buyer, InsertBuyer, 
         Invoice, InsertInvoice, InvoiceItem, InsertInvoiceItem, SignatureSettings, 
         InsertSignatureSettings, InvoiceWithDetails } from "@shared/schema";
import { eq } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // Users
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, user: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return result[0];
  }

  // Suppliers
  async getSuppliersByUserId(userId: string): Promise<Supplier[]> {
    return db.select().from(suppliers).where(eq(suppliers.userId, userId));
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    return result[0];
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(suppliers).values(supplier).returning();
    return result[0];
  }

  async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier | undefined> {
    const result = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
    return result[0];
  }

  // Buyers
  async getBuyersByUserId(userId: string): Promise<Buyer[]> {
    return db.select().from(buyers).where(eq(buyers.userId, userId));
  }

  async getBuyerById(id: string): Promise<Buyer | undefined> {
    const result = await db.select().from(buyers).where(eq(buyers.id, id)).limit(1);
    return result[0];
  }

  async createBuyer(buyer: InsertBuyer): Promise<Buyer> {
    const result = await db.insert(buyers).values(buyer).returning();
    return result[0];
  }

  async updateBuyer(id: string, buyer: Partial<Buyer>): Promise<Buyer | undefined> {
    const result = await db.update(buyers).set(buyer).where(eq(buyers.id, id)).returning();
    return result[0];
  }

  // Invoices
  async getInvoicesByUserId(userId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.userId, userId));
  }

  async getInvoicesWithDetailsByUserId(userId: string): Promise<InvoiceWithDetails[]> {
    const userInvoices = await db.select().from(invoices).where(eq(invoices.userId, userId));
    const result: InvoiceWithDetails[] = [];

    for (const invoice of userInvoices) {
      const supplier = await this.getSupplierById(invoice.supplierId);
      const buyer = await this.getBuyerById(invoice.buyerId);
      const items = await this.getInvoiceItemsByInvoiceId(invoice.id);

      if (supplier && buyer) {
        result.push({
          ...invoice,
          supplier,
          buyer,
          items
        });
      }
    }

    return result;
  }

  async getInvoiceById(id: string): Promise<InvoiceWithDetails | undefined> {
    const invoice = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!invoice[0]) return undefined;

    const supplier = await this.getSupplierById(invoice[0].supplierId);
    const buyer = await this.getBuyerById(invoice[0].buyerId);
    const items = await this.getInvoiceItemsByInvoiceId(id);

    if (!supplier || !buyer) return undefined;

    return {
      ...invoice[0],
      supplier,
      buyer,
      items
    };
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices).values(invoice).returning();
    return result[0];
  }

  async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<Invoice | undefined> {
    const result = await db.update(invoices).set(invoice).where(eq(invoices.id, id)).returning();
    return result[0];
  }

  // Invoice Items
  async getInvoiceItemsByInvoiceId(invoiceId: string): Promise<InvoiceItem[]> {
    return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const result = await db.insert(invoiceItems).values(item).returning();
    return result[0];
  }

  async updateInvoiceItem(id: string, item: Partial<InvoiceItem>): Promise<InvoiceItem | undefined> {
    const result = await db.update(invoiceItems).set(item).where(eq(invoiceItems.id, id)).returning();
    return result[0];
  }

  async deleteInvoiceItem(id: string): Promise<boolean> {
    const result = await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
    return result.rowCount > 0;
  }

  // Signature Settings
  async getSignatureSettingsByUserId(userId: string): Promise<SignatureSettings | undefined> {
    const result = await db.select().from(signatureSettings).where(eq(signatureSettings.userId, userId)).limit(1);
    return result[0];
  }

  async upsertSignatureSettings(settings: InsertSignatureSettings): Promise<SignatureSettings> {
    const existing = await this.getSignatureSettingsByUserId(settings.userId);
    
    if (existing) {
      const result = await db.update(signatureSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(signatureSettings.userId, settings.userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(signatureSettings).values(settings).returning();
      return result[0];
    }
  }
}