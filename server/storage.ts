import { type User, type InsertUser, type Supplier, type InsertSupplier, type Buyer, type InsertBuyer, 
         type Invoice, type InsertInvoice, type InvoiceItem, type InsertInvoiceItem, 
         type SignatureSettings, type InsertSignatureSettings, type InvoiceWithDetails } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;

  // Suppliers
  getSuppliersByUserId(userId: string): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier | undefined>;

  // Buyers
  getBuyersByUserId(userId: string): Promise<Buyer[]>;
  getBuyerById(id: string): Promise<Buyer | undefined>;
  createBuyer(buyer: InsertBuyer): Promise<Buyer>;
  updateBuyer(id: string, buyer: Partial<Buyer>): Promise<Buyer | undefined>;

  // Invoices
  getInvoicesByUserId(userId: string): Promise<Invoice[]>;
  getInvoiceById(id: string): Promise<InvoiceWithDetails | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<Invoice>): Promise<Invoice | undefined>;

  // Invoice Items
  getInvoiceItemsByInvoiceId(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: string, item: Partial<InvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: string): Promise<boolean>;

  // Signature Settings
  getSignatureSettingsByUserId(userId: string): Promise<SignatureSettings | undefined>;
  upsertSignatureSettings(settings: InsertSignatureSettings): Promise<SignatureSettings>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private suppliers: Map<string, Supplier> = new Map();
  private buyers: Map<string, Buyer> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private invoiceItems: Map<string, InvoiceItem> = new Map();
  private signatureSettings: Map<string, SignatureSettings> = new Map();

  // Users
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.telegramId === telegramId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      username: insertUser.username || null,
      lastName: insertUser.lastName || null,
      photoUrl: insertUser.photoUrl || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Suppliers
  async getSuppliersByUserId(userId: string): Promise<Supplier[]> {
    return Array.from(this.suppliers.values()).filter(supplier => supplier.userId === userId);
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const id = randomUUID();
    const supplier: Supplier = { 
      ...insertSupplier, 
      id, 
      createdAt: new Date() 
    };
    this.suppliers.set(id, supplier);
    return supplier;
  }

  async updateSupplier(id: string, supplierData: Partial<Supplier>): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(id);
    if (!supplier) return undefined;
    
    const updatedSupplier = { ...supplier, ...supplierData };
    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  // Buyers
  async getBuyersByUserId(userId: string): Promise<Buyer[]> {
    return Array.from(this.buyers.values()).filter(buyer => buyer.userId === userId);
  }

  async getBuyerById(id: string): Promise<Buyer | undefined> {
    return this.buyers.get(id);
  }

  async createBuyer(insertBuyer: InsertBuyer): Promise<Buyer> {
    const id = randomUUID();
    const buyer: Buyer = { 
      ...insertBuyer, 
      id, 
      createdAt: new Date() 
    };
    this.buyers.set(id, buyer);
    return buyer;
  }

  async updateBuyer(id: string, buyerData: Partial<Buyer>): Promise<Buyer | undefined> {
    const buyer = this.buyers.get(id);
    if (!buyer) return undefined;
    
    const updatedBuyer = { ...buyer, ...buyerData };
    this.buyers.set(id, updatedBuyer);
    return updatedBuyer;
  }

  // Invoices
  async getInvoicesByUserId(userId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.userId === userId);
  }

  async getInvoiceById(id: string): Promise<InvoiceWithDetails | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;

    const supplier = await this.getSupplierById(invoice.supplierId);
    const buyer = await this.getBuyerById(invoice.buyerId);
    const items = await this.getInvoiceItemsByInvoiceId(id);
    const signatureSettings = await this.getSignatureSettingsByUserId(invoice.userId);

    if (!supplier || !buyer) return undefined;

    return {
      ...invoice,
      supplier,
      buyer,
      items,
      signatureSettings
    };
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const invoice: Invoice = { 
      ...insertInvoice, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: string, invoiceData: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updatedInvoice = { ...invoice, ...invoiceData, updatedAt: new Date() };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  // Invoice Items
  async getInvoiceItemsByInvoiceId(invoiceId: string): Promise<InvoiceItem[]> {
    return Array.from(this.invoiceItems.values())
      .filter(item => item.invoiceId === invoiceId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async createInvoiceItem(insertItem: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = randomUUID();
    const item: InvoiceItem = { ...insertItem, id };
    this.invoiceItems.set(id, item);
    return item;
  }

  async updateInvoiceItem(id: string, itemData: Partial<InvoiceItem>): Promise<InvoiceItem | undefined> {
    const item = this.invoiceItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...itemData };
    this.invoiceItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteInvoiceItem(id: string): Promise<boolean> {
    return this.invoiceItems.delete(id);
  }

  // Signature Settings
  async getSignatureSettingsByUserId(userId: string): Promise<SignatureSettings | undefined> {
    return Array.from(this.signatureSettings.values()).find(settings => settings.userId === userId);
  }

  async upsertSignatureSettings(insertSettings: InsertSignatureSettings): Promise<SignatureSettings> {
    const existing = await this.getSignatureSettingsByUserId(insertSettings.userId);
    
    if (existing) {
      const updated = { ...existing, ...insertSettings, updatedAt: new Date() };
      this.signatureSettings.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const settings: SignatureSettings = { 
        ...insertSettings, 
        id, 
        updatedAt: new Date() 
      };
      this.signatureSettings.set(id, settings);
      return settings;
    }
  }
}

export const storage = new MemStorage();
