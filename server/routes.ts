import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertSupplierSchema, insertBuyerSchema, insertInvoiceSchema, insertSignatureSettingsSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
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

// Telegram data validation function
function validateTelegramData(telegramData: any, botToken: string): boolean {
  if (!telegramData.hash) return false;
  
  const { hash, ...dataToCheck } = telegramData;
  
  // Create data string for verification
  const dataCheckString = Object.keys(dataToCheck)
    .sort()
    .map(key => `${key}=${dataToCheck[key]}`)
    .join('\n');
  
  // Generate secret key from bot token
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  
  // Generate hash
  const computedHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  return computedHash === hash;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Telegram Authentication
  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const telegramData = req.body;
      
      // Validate required fields
      if (!telegramData.id || !telegramData.first_name) {
        return res.status(400).json({ message: "Invalid Telegram data" });
      }

      // Validate Telegram auth hash for security
      if (!validateTelegramData(telegramData, process.env.TELEGRAM_BOT_TOKEN || '')) {
        return res.status(400).json({ message: "Invalid Telegram authentication" });
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
      req.session.telegramId = user?.telegramId; // Store telegramId for sending files
      
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

      const { supplier, buyer, items, ...invoiceFields } = req.body;
      
      // Create or find supplier
      let supplierRecord = await storage.createSupplier({
        ...supplier,
        userId: req.session.userId
      });

      // Create or find buyer
      let buyerRecord = await storage.createBuyer({
        ...buyer,
        userId: req.session.userId
      });

      // Create invoice with references
      const invoiceData = {
        ...invoiceFields,
        userId: req.session.userId,
        supplierId: supplierRecord.id,
        buyerId: buyerRecord.id,
        invoiceDate: new Date(invoiceFields.invoiceDate)
      };

      const invoice = await storage.createInvoice(invoiceData);
      
      // Create invoice items
      if (items && items.length > 0) {
        for (const [index, item] of items.entries()) {
          await storage.createInvoiceItem({
            ...item,
            invoiceId: invoice.id,
            sortOrder: index
          });
        }
      }

      // Return invoice with full details
      const fullInvoice = await storage.getInvoiceById(invoice.id);
      
      // Send Telegram notification for new invoice
      if (telegramBot) {
        try {
          const user = await storage.getUserById(req.session.userId);
          if (user?.telegramId) {
            await telegramBot.notifyInvoiceCreated(user.telegramId, fullInvoice);
          }
        } catch (telegramError) {
          console.error('Failed to send Telegram notification:', telegramError);
          // Don't fail the invoice creation if notification fails
        }
      }
      
      res.json(fullInvoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      console.error('Error creating invoice:', error);
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

  // File Upload with security checks
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

      // Проверка типа файла
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Only image files (JPEG, PNG, GIF) are allowed" });
      }

      // Проверка размера файла (максимум 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB в байтах
      if (req.file.size > maxSize) {
        return res.status(400).json({ message: "File size must be less than 5MB" });
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
      console.log('Send invoice request received');
      console.log('Session userId:', req.session.userId);
      console.log('Session telegramId:', req.session.telegramId);
      
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { invoiceId, pdfData } = req.body;
      
      console.log('Request body keys:', Object.keys(req.body));
      console.log('Invoice ID:', invoiceId);
      console.log('PDF data length:', pdfData ? pdfData.length : 'undefined');
      
      if (!invoiceId || !pdfData) {
        console.log('Missing data - invoiceId:', !!invoiceId, 'pdfData:', !!pdfData);
        return res.status(400).json({ message: 'Invoice ID and PDF data are required' });
      }

      // Get user's Telegram ID from session
      const telegramId = req.session.telegramId;
      if (!telegramId) {
        console.log('No Telegram ID found in session');
        return res.status(400).json({ message: 'Telegram ID not found in session. Please log out and log in again.' });
      }

      // Get real invoice data from database
      const invoiceRecord = await storage.getInvoiceById(invoiceId);
      if (!invoiceRecord) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      const invoice = {
        invoiceNumber: invoiceRecord.invoiceNumber,
        invoiceDate: invoiceRecord.invoiceDate.toISOString(),
        totalAmount: invoiceRecord.totalAmount,
        supplierName: invoiceRecord.supplier.name,
        buyerName: invoiceRecord.buyer.name
      };

      // Convert base64 PDF data to buffer
      const pdfBuffer = Buffer.from(pdfData.split(',')[1], 'base64');
      console.log('PDF buffer size:', pdfBuffer.length);
      
      if (telegramBot && telegramId) {
        console.log('Attempting to send PDF to Telegram ID:', telegramId);
        await telegramBot.sendInvoiceWithPDF(telegramId, invoice, pdfBuffer);
        console.log('PDF sent successfully');
        res.json({ success: true, message: 'Invoice sent to Telegram' });
      } else {
        console.log('Telegram bot not available:', !!telegramBot, 'or user not linked:', !!telegramId);
        res.status(400).json({ message: 'Telegram bot not available or user not linked' });
      }
    } catch (error) {
      console.error('Failed to send invoice via Telegram:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to send invoice: ' + errorMessage });
    }
  });

  // Copy invoice
  app.post("/api/invoices/:id/copy", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const originalInvoice = await storage.getInvoiceById(req.params.id);
      if (!originalInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Create new invoice based on original  
      const newInvoiceData = insertInvoiceSchema.parse({
        userId: req.session.userId,
        invoiceNumber: `${originalInvoice.invoiceNumber}-копия-${Date.now()}`,
        invoiceDate: originalInvoice.invoiceDate,
        contract: originalInvoice.contract,
        supplierId: originalInvoice.supplierId,
        buyerId: originalInvoice.buyerId,
        totalAmount: originalInvoice.totalAmount,
        totalAmountWords: originalInvoice.totalAmountWords,
        status: 'draft'
      });

      const newInvoice = await storage.createInvoice(newInvoiceData);
      
      // Copy items
      for (const item of originalInvoice.items) {
        await storage.createInvoiceItem({
          invoiceId: newInvoice.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          total: item.total
        });
      }

      res.json(newInvoice);
    } catch (error) {
      console.error('Failed to copy invoice:', error);
      res.status(500).json({ message: "Failed to copy invoice" });
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

  // Internal PDF generation endpoint for Telegram bot
  app.post("/api/invoices/:id/pdf", async (req, res) => {
    try {
      const { userId } = req.body;
      const isInternalRequest = req.headers['x-internal-request'] === 'true';
      
      if (!isInternalRequest && !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const requestUserId = isInternalRequest ? userId : req.session.userId;
      
      const invoice = await storage.getInvoiceById(req.params.id);
      if (!invoice || invoice.userId !== requestUserId) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Generate simple PDF using jsPDF
      const jsPDF = (await import('jspdf')).default;
      
      const pdf = new jsPDF();
      pdf.text(`Счет на оплату №${invoice.invoiceNumber}`, 20, 20);
      pdf.text(`Дата: ${invoice.invoiceDate.toLocaleDateString('ru-RU')}`, 20, 30);
      pdf.text(`Поставщик: ${invoice.supplier?.name || 'Неизвестно'}`, 20, 40);
      pdf.text(`Покупатель: ${invoice.buyer?.name || 'Неизвестно'}`, 20, 50);
      pdf.text(`Сумма: ${Number(invoice.totalAmount).toLocaleString('ru-RU')} ₸`, 20, 60);
      
      // Add services
      let yPos = 80;
      pdf.text('Услуги:', 20, yPos);
      yPos += 10;
      
      invoice.items?.forEach((item, index) => {
        pdf.text(`${index + 1}. ${item.name} - ${item.quantity} ${item.unit} × ${item.price} = ${item.total} ₸`, 20, yPos);
        yPos += 10;
      });
      
      const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Internal Excel generation endpoint for Telegram bot
  app.post("/api/invoices/:id/excel", async (req, res) => {
    try {
      const { userId } = req.body;
      const isInternalRequest = req.headers['x-internal-request'] === 'true';
      
      if (!isInternalRequest && !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const requestUserId = isInternalRequest ? userId : req.session.userId;
      
      const invoice = await storage.getInvoiceById(req.params.id);
      if (!invoice || invoice.userId !== requestUserId) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Generate simple Excel using XLSX
      const XLSX = await import('xlsx');
      
      const workbook = XLSX.utils.book_new();
      const worksheetData = [
        ['Номер счета', invoice.invoiceNumber],
        ['Дата', invoice.invoiceDate.toLocaleDateString('ru-RU')],
        ['Поставщик', invoice.supplier?.name || 'Неизвестно'],
        ['Покупатель', invoice.buyer?.name || 'Неизвестно'],
        [''],
        ['Услуги:'],
        ['№', 'Наименование', 'Количество', 'Единица', 'Цена', 'Сумма']
      ];
      
      invoice.items?.forEach((item, index) => {
        worksheetData.push([
          index + 1,
          item.name,
          item.quantity,
          item.unit,
          item.price,
          item.total
        ]);
      });
      
      worksheetData.push(['', '', '', '', 'Итого:', invoice.totalAmount]);
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Счет');
      
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', excelBuffer.length);
      res.send(excelBuffer);
      
    } catch (error) {
      console.error('Error generating Excel:', error);
      res.status(500).json({ message: "Failed to generate Excel" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
