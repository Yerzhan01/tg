import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';
import { InvoiceWithDetails } from '@shared/schema';

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
      const webhookUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://bc700157-2325-4ed8-89d2-b630caa0879c-00-358a4svxmccgk.picard.replit.dev'}/api/telegram/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
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

      if (!telegramId) return;

      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        await this.bot?.sendMessage(chatId, "Пожалуйста, авторизуйтесь на веб-платформе");
        return;
      }

      const invoices = await storage.getInvoicesByUserId(user.id);
      
      if (invoices.length === 0) {
        await this.bot?.sendMessage(chatId, "У вас пока нет созданных счетов");
        return;
      }

      if (invoices.length <= 5) {
        // Show detailed list with buttons for few invoices
        for (const invoice of invoices) {
          const message = `🧾 Счет №${invoice.invoiceNumber}\n` +
                         `📅 Дата: ${invoice.invoiceDate.toLocaleDateString('ru-RU')}\n` +
                         `💰 Сумма: ${invoice.totalAmount?.toLocaleString('ru-RU')} ₸\n` +
                         `🏢 Поставщик: ${invoice.supplierName}\n` +
                         `🏪 Покупатель: ${invoice.buyerName}`;

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
        for (const invoice of invoices.slice(0, 10)) {
          message += `🧾 №${invoice.invoiceNumber} от ${invoice.invoiceDate.toLocaleDateString('ru-RU')}\n`;
          message += `💰 Сумма: ${invoice.totalAmount?.toLocaleString('ru-RU')} ₸\n`;
          message += `📊 Статус: ${this.getStatusEmoji(invoice.status || 'draft')} ${this.getStatusText(invoice.status || 'draft')}\n\n`;
        }

        if (invoices.length > 10) {
          message += `\n... и еще ${invoices.length - 10} счетов\n`;
          message += `Для скачивания файлов используйте веб-платформу`;
        }

        await this.bot?.sendMessage(chatId, message);
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
          
          await this.bot?.sendMessage(chatId, "⏳ Генерация PDF файла, пожалуйста подождите...");
          
          // For now, send a message that PDF generation will be implemented
          await this.bot?.sendMessage(chatId, 
            "📄 PDF файл будет отправлен через веб-платформу.\n\n" +
            "Используйте кнопку 'Отправить в Telegram' на веб-сайте для получения готового PDF файла."
          );

        } else if (data.startsWith('download_excel_')) {
          const invoiceId = data.replace('download_excel_', '');
          await this.bot?.answerCallbackQuery(callbackQuery.id, {
            text: "Генерируем Excel файл..."
          });
          
          await this.bot?.sendMessage(chatId, "⏳ Генерация Excel файла, пожалуйста подождите...");
          
          // For now, send a message that Excel generation will be implemented
          await this.bot?.sendMessage(chatId, 
            "📊 Excel файл будет отправлен через веб-платформу.\n\n" +
            "Используйте функцию экспорта на веб-сайте для получения готового Excel файла."
          );
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

💰 <b>Итого: ${invoice.totalAmount} ₸</b>
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
}

export const telegramBot = new InvoiceTelegramBot();
