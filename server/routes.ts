import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertSupplierSchema, insertBuyerSchema, insertInvoiceSchema, insertSignatureSettingsSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { telegramBot } from "./telegram-bot";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPG files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Telegram Authentication
  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const telegramData = req.body;
      
      // Validate Telegram auth data (in production, verify hash)
      if (!telegramData.id || !telegramData.first_name) {
        return res.status(400).json({ message: "Invalid Telegram data" });
      }

      let user = await storage.getUserByTelegramId(telegramData.id.toString());
      
      if (!user) {
        user = await storage.createUser({
          telegramId: telegramData.id.toString(),
          username: telegramData.username,
          firstName: telegramData.first_name,
          lastName: telegramData.last_name,
          photoUrl: telegramData.photo_url
        });
      } else {
        // Update user data
        user = await storage.updateUser(user.id, {
          username: telegramData.username,
          firstName: telegramData.first_name,
          lastName: telegramData.last_name,
          photoUrl: telegramData.photo_url
        });
      }

      // Set session
      req.session.userId = user?.id;
      
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Find user by ID (simplified for memory storage)
      const users = await storage.getSuppliersByUserId(req.session.userId); // Using suppliers query as proxy
      res.json({ userId: req.session.userId });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Suppliers
  app.get("/api/suppliers", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const suppliers = await storage.getSuppliersByUserId(req.session.userId);
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get suppliers" });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const supplierData = insertSupplierSchema.parse({
        ...req.body,
        userId: req.session.userId
      });

      const supplier = await storage.createSupplier(supplierData);
      res.json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid supplier data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.put("/api/suppliers/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const supplier = await storage.updateSupplier(req.params.id, req.body);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  // Buyers
  app.get("/api/buyers", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const buyers = await storage.getBuyersByUserId(req.session.userId);
      res.json(buyers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get buyers" });
    }
  });

  app.post("/api/buyers", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const buyerData = insertBuyerSchema.parse({
        ...req.body,
        userId: req.session.userId
      });

      const buyer = await storage.createBuyer(buyerData);
      res.json(buyer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid buyer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create buyer" });
    }
  });

  // Invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const invoices = await storage.getInvoicesByUserId(req.session.userId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to get invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const invoice = await storage.getInvoiceById(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to get invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        userId: req.session.userId
      });

      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Invoice Items
  app.post("/api/invoices/:invoiceId/items", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const item = await storage.createInvoiceItem({
        ...req.body,
        invoiceId: req.params.invoiceId
      });

      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to create invoice item" });
    }
  });

  app.delete("/api/invoice-items/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const deleted = await storage.deleteInvoiceItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice item not found" });
      }

      res.json({ message: "Invoice item deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invoice item" });
    }
  });

  // Signature Settings
  app.get("/api/signature-settings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const settings = await storage.getSignatureSettingsByUserId(req.session.userId);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to get signature settings" });
    }
  });

  app.post("/api/signature-settings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const settingsData = insertSignatureSettingsSchema.parse({
        ...req.body,
        userId: req.session.userId
      });

      const settings = await storage.upsertSignatureSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save signature settings" });
    }
  });

  // File Upload
  app.post("/api/upload/:type", upload.single('file'), async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { type } = req.params; // 'signature' or 'stamp'
      if (!['signature', 'stamp'].includes(type)) {
        return res.status(400).json({ message: "Invalid file type" });
      }

      // In production, upload to cloud storage
      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({ url: fileUrl });
    } catch (error) {
      res.status(500).json({ message: "File upload failed" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'uploads', req.path.substring(1)));
  });

  // Telegram Bot Webhook
  app.post(`/api/telegram/webhook/${process.env.TELEGRAM_BOT_TOKEN || 'webhook'}`, async (req, res) => {
    try {
      if (telegramBot) {
        telegramBot.processUpdate(req.body);
      }
      res.sendStatus(200);
    } catch (error) {
      console.error('Telegram webhook error:', error);
      res.sendStatus(500);
    }
  });

  // Bot setup and info endpoint
  app.get('/api/telegram/bot-info', async (req, res) => {
    try {
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        return res.status(400).json({ message: 'Bot token not configured' });
      }
      
      res.json({
        botUsername: process.env.TELEGRAM_BOT_USERNAME,
        webhookUrl: `${process.env.REPLIT_DEV_DOMAIN || req.get('host')}/api/telegram/webhook/${process.env.TELEGRAM_BOT_TOKEN}`,
        configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME)
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get bot info' });
    }
  });

  // Send invoice via Telegram
  app.post('/api/telegram/send-invoice', async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { invoiceId, pdfData } = req.body;
      
      if (!invoiceId || !pdfData) {
        return res.status(400).json({ message: 'Invoice ID and PDF data required' });
      }

      // For now, we'll create a temporary user object since we have the session
      const user = { telegramId: req.session.telegramId }; // Use the telegramId from session
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice || invoice.userId !== req.session.userId) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      // Convert base64 PDF data to buffer
      const pdfBuffer = Buffer.from(pdfData.split(',')[1], 'base64');
      
      if (telegramBot && user.telegramId) {
        await telegramBot.sendInvoiceWithPDF(user.telegramId, invoice, pdfBuffer);
        res.json({ success: true, message: 'Invoice sent to Telegram' });
      } else {
        res.status(400).json({ message: 'Telegram bot not available or user not linked' });
      }
    } catch (error) {
      console.error('Failed to send invoice via Telegram:', error);
      res.status(500).json({ message: 'Failed to send invoice' });
    }
  });

  // Send invoice to Telegram
  app.post("/api/invoices/:id/send-to-telegram", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const invoice = await storage.getInvoiceById(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get user's Telegram ID
      const user = await storage.getUserByTelegramId(req.session.userId);
      if (!user?.telegramId) {
        return res.status(400).json({ message: "Telegram account not linked" });
      }

      // Send to Telegram bot
      if (telegramBot) {
        await telegramBot.sendInvoice(user.telegramId, invoice);
      }

      res.json({ message: "Invoice sent to Telegram" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send invoice to Telegram" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
