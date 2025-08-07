import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';
import { InvoiceWithDetails } from '@shared/schema';
import crypto from 'crypto';

class InvoiceTelegramBot {
  private bot: TelegramBot | null = null;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      this.bot = new TelegramBot(token, { polling: false });
      this.setupCommands();
      this.setupWebhook();
    }
  }

  private async setupWebhook() {
    if (!this.bot) return;
    
    try {
      // Динамически определяем домен
      const domain = process.env.REPLIT_DEV_DOMAIN || 
                    process.env.REPLIT_DOMAIN || 
                    `${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.replit.app`;
      
      const webhookUrl = `https://${domain}/api/telegram/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
      await this.bot.setWebHook(webhookUrl);
      console.log('Telegram webhook set to:', webhookUrl);
    } catch (error) {
      console.error('Failed to set Telegram webhook:', error);
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();

      if (!telegramId) return;

      const user = await storage.getUserByTelegramId(telegramId);
      
      if (user) {
        await this.bot?.sendMessage(chatId, 
          `Добро пожаловать в генератор счетов РК! 🧾\n\n` +
          `Ваш аккаунт уже связан с веб-платформой.\n\n` +
          `Доступные команды:\n` +
          `/invoices - Список ваших счетов\n` +
          `/create - Создать новый счет\n` +
          `/help - Помощь`
        );
      } else {
        await this.bot?.sendMessage(chatId,
          `Добро пожаловать! 👋\n\n` +
          `Для использования бота необходимо сначала авторизоваться на веб-платформе через Telegram.\n\n` +
          `Перейдите на сайт и нажмите "Войти через Telegram"`
        );
      }
    });

    this.bot.onText(/\/invoices/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();

      console.log('=== TELEGRAM /INVOICES COMMAND ===');
      console.log('Chat ID:', chatId);
      console.log('Telegram ID:', telegramId);

      if (!telegramId) {
        console.log('ERROR: No telegramId provided');
        return;
      }

      try {
        const user = await storage.getUserByTelegramId(telegramId);
        console.log('User lookup result:', user ? `Found user ${user.id}` : 'User not found');
        
        if (!user) {
          await this.bot?.sendMessage(chatId, "Пожалуйста, авторизуйтесь на веб-платформе");
          return;
        }

        // Временно используем getInvoicesByUserId и для каждого счета получаем полные данные
        const basicInvoices = await storage.getInvoicesByUserId(user.id);
        console.log('Found invoices:', basicInvoices.length);
        
        if (basicInvoices.length === 0) {
          console.log('No invoices found, sending empty message');
          await this.bot?.sendMessage(chatId, "У вас пока нет созданных счетов");
          return;
        }

        console.log('Processing invoices display...');

        if (basicInvoices.length <= 5) {
        // Show detailed list with buttons for few invoices
        for (const basicInvoice of basicInvoices) {
          // Получаем полные данные для каждого счета
          const invoice = await storage.getInvoiceById(basicInvoice.id);
          if (!invoice) continue;

          const message = `🧾 Счет №${invoice.invoiceNumber}\n` +
                         `📅 Дата: ${invoice.invoiceDate.toLocaleDateString('ru-RU')}\n` +
                         `💰 Сумма: ${Number(invoice.totalAmount).toLocaleString('ru-RU')} ₸\n` +
                         `🏢 Поставщик: ${invoice.supplier.name}\n` +
                         `🏪 Покупатель: ${invoice.buyer.name}\n` +
                         `📊 Статус: ${this.getStatusEmoji(invoice.status || 'draft')} ${this.getStatusText(invoice.status || 'draft')}`;

          await this.bot?.sendMessage(chatId, message, {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '📄 PDF', callback_data: `download_pdf_${invoice.id}` },
                  { text: '📊 Excel', callback_data: `download_excel_${invoice.id}` }
                ]
              ]
            }
          });
        }
      } else {
        // Show simple list for many invoices
        let message = "📋 Ваши счета:\n\n";
        for (const invoice of basicInvoices.slice(0, 10)) {
          message += `🧾 №${invoice.invoiceNumber} от ${invoice.invoiceDate.toLocaleDateString('ru-RU')}\n`;
          message += `💰 Сумма: ${Number(invoice.totalAmount).toLocaleString('ru-RU')} ₸\n`;
          message += `📊 Статус: ${this.getStatusEmoji(invoice.status || 'draft')} ${this.getStatusText(invoice.status || 'draft')}\n\n`;
        }

        if (basicInvoices.length > 10) {
          message += `\n... и еще ${basicInvoices.length - 10} счетов\n`;
          message += `Для скачивания файлов используйте веб-платформу`;
        }

        await this.bot?.sendMessage(chatId, message);
        }
        
      } catch (error) {
        console.error('Error in /invoices command:', error);
        await this.bot?.sendMessage(chatId, "Произошла ошибка при получении списка счетов. Попробуйте позже.");
      }
    });

    this.bot.onText(/\/create/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot?.sendMessage(chatId,
        `Для создания нового счета перейдите на веб-платформу.\n\n` +
        `После создания счета вы можете отправить его в этот чат для получения готовых файлов.`
      );
    });

    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot?.sendMessage(chatId,
        `🤖 Помощь по боту\n\n` +
        `Этот бот интегрирован с веб-платформой для генерации счетов РК.\n\n` +
        `Возможности:\n` +
        `• Просмотр списка ваших счетов\n` +
        `• Получение готовых PDF и Excel файлов\n` +
        `• Уведомления о новых счетах\n\n` +
        `Команды:\n` +
        `/start - Начать работу\n` +
        `/invoices - Список счетов\n` +
        `/create - Создать счет\n` +
        `/help - Эта справка`
      );
    });

    // Handle callback queries for file downloads
    this.bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message?.chat.id;
      const telegramId = callbackQuery.from.id.toString();
      const data = callbackQuery.data;

      if (!chatId || !data) return;

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        await this.bot?.answerCallbackQuery(callbackQuery.id, {
          text: "Пожалуйста, авторизуйтесь на веб-платформе"
        });
        return;
      }

      try {
        if (data.startsWith('download_pdf_')) {
          const invoiceId = data.replace('download_pdf_', '');
          await this.bot?.answerCallbackQuery(callbackQuery.id, {
            text: "Генерируем PDF файл..."
          });
          
          await this.sendPDFFile(chatId, invoiceId, user.id);

        } else if (data.startsWith('download_excel_')) {
          const invoiceId = data.replace('download_excel_', '');
          await this.bot?.answerCallbackQuery(callbackQuery.id, {
            text: "Генерируем Excel файл..."
          });
          
          await this.sendExcelFile(chatId, invoiceId, user.id);
        }

      } catch (error) {
        console.error('Error handling callback query:', error);
        await this.bot?.answerCallbackQuery(callbackQuery.id, {
          text: "Произошла ошибка, попробуйте позже"
        });
      }
    });
  }

  async sendInvoice(telegramId: string, invoice: InvoiceWithDetails) {
    if (!this.bot) return;

    try {
      const message = this.formatInvoiceMessage(invoice);
      
      await this.bot.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📄 Скачать PDF', callback_data: `download_pdf_${invoice.id}` },
              { text: '📊 Скачать Excel', callback_data: `download_excel_${invoice.id}` }
            ],
            [
              { text: '🔗 Открыть на сайте', url: `${process.env.FRONTEND_URL}/invoice/${invoice.id}` }
            ]
          ]
        }
      });
    } catch (error) {
      console.error('Error sending invoice to Telegram:', error);
    }
  }

  async sendInvoiceWithPDF(telegramId: string, invoice: any, pdfBuffer: Buffer) {
    if (!this.bot) return;

    try {
      const message = `📄 Счет на оплату №${invoice.invoiceNumber}\n\n` +
        `📅 Дата: ${new Date(invoice.invoiceDate).toLocaleDateString('ru-RU')}\n` +
        `💰 Сумма: ${invoice.totalAmount.toLocaleString('ru-RU')} ₸\n` +
        `🏢 Поставщик: ${invoice.supplierName}\n` +
        `🏪 Покупатель: ${invoice.buyerName}`;

      console.log('Sending PDF document to Telegram ID:', telegramId);
      console.log('PDF buffer size:', pdfBuffer.length);
      
      await this.bot.sendDocument(telegramId, pdfBuffer, {
        caption: message
      }, {
        filename: `Счет_${invoice.invoiceNumber}_${new Date().toISOString().slice(0,10)}.pdf`,
        contentType: 'application/pdf'
      });
      
      console.log('PDF document sent successfully');
    } catch (error) {
      console.error('Failed to send invoice with PDF:', error);
      throw error;
    }
  }

  async processUpdate(update: any) {
    if (!this.bot) return;
    
    this.bot.processUpdate(update);
  }

  private formatInvoiceMessage(invoice: InvoiceWithDetails): string {
    return `
🧾 <b>Счет на оплату №${invoice.invoiceNumber}</b>
📅 от ${invoice.invoiceDate.toLocaleDateString('ru-RU')}

<b>Поставщик:</b>
${invoice.supplier.name}
БИН/ИИН: ${invoice.supplier.bin}

<b>Покупатель:</b>
${invoice.buyer.name}
БИН/ИИН: ${invoice.buyer.bin}

<b>Услуги/товары:</b>
${invoice.items.map((item, index) => 
  `${index + 1}. ${item.name}\n   ${item.quantity} ${item.unit} × ${item.price} ₸ = ${item.total} ₸`
).join('\n')}

💰 <b>Итого: ${Number(invoice.totalAmount).toLocaleString('ru-RU')} ₸</b>
${invoice.totalAmountWords}

📋 Статус: ${this.getStatusEmoji(invoice.status || 'draft')} ${this.getStatusText(invoice.status || 'draft')}
    `.trim();
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'draft': return '📝';
      case 'sent': return '📤';
      case 'paid': return '✅';
      default: return '📄';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'sent': return 'Отправлен';
      case 'paid': return 'Оплачен';
      default: return 'Неизвестен';
    }
  }

  private async sendPDFFile(chatId: number, invoiceId: string, userId: string) {
    try {
      await this.bot?.sendMessage(chatId, "⏳ Генерация PDF файла...");
      
      // Get invoice data
      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        await this.bot?.sendMessage(chatId, "❌ Счет не найден или у вас нет доступа к нему");
        return;
      }

      // Generate PDF using internal API call (properly authenticated)
      const response = await fetch(`http://localhost:5000/api/invoices/${invoiceId}/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Request': 'true'
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const pdfBuffer = Buffer.from(await response.arrayBuffer());
      
      const filename = `Счет_${invoice.invoiceNumber}_${new Date().toISOString().slice(0,10)}.pdf`;
      
      await this.bot?.sendDocument(chatId, pdfBuffer, {
        caption: `📄 Счет №${invoice.invoiceNumber} от ${invoice.invoiceDate.toLocaleDateString('ru-RU')}`
      }, {
        filename,
        contentType: 'application/pdf'
      });

    } catch (error) {
      console.error('Error sending PDF:', error);
      await this.bot?.sendMessage(chatId, 
        "❌ Ошибка при генерации PDF файла.\n\n" +
        "Попробуйте использовать веб-платформу для скачивания файла."
      );
    }
  }

  private async sendExcelFile(chatId: number, invoiceId: string, userId: string) {
    try {
      await this.bot?.sendMessage(chatId, "⏳ Генерация Excel файла...");
      
      // Get invoice data
      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        await this.bot?.sendMessage(chatId, "❌ Счет не найден или у вас нет доступа к нему");
        return;
      }

      // Generate Excel using internal API call (properly authenticated)
      const response = await fetch(`http://localhost:5000/api/invoices/${invoiceId}/excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Request': 'true'
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate Excel');
      }

      const excelBuffer = Buffer.from(await response.arrayBuffer());
      
      const filename = `Счет_${invoice.invoiceNumber}_${new Date().toISOString().slice(0,10)}.xlsx`;
      
      await this.bot?.sendDocument(chatId, excelBuffer, {
        caption: `📊 Счет №${invoice.invoiceNumber} от ${invoice.invoiceDate.toLocaleDateString('ru-RU')}`
      }, {
        filename,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

    } catch (error) {
      console.error('Error sending Excel:', error);
      await this.bot?.sendMessage(chatId, 
        "❌ Ошибка при генерации Excel файла.\n\n" +
        "Попробуйте использовать веб-платформу для скачивания файла."
      );
    }
  }
}

export const telegramBot = new InvoiceTelegramBot();
