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

  private getBaseUrl(): string {
    return `https://${process.env.REPLIT_DEV_DOMAIN || 
                      process.env.REPLIT_DOMAIN || 
                      `${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.replit.app`}`;
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
          `🤖 Добро пожаловать в генератор счетов РК! 📄\n\n` +
          `Ваш аккаунт уже связан с веб-платформой.\n\n` +
          `Доступные команды:\n` +
          `/invoices - Список ваших счетов\n` +
          `/create - Создать новый счет\n` +
          `/search <запрос> - Поиск счетов\n` +
          `/stats - Статистика\n` +
          `/help - Помощь`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '📋 Мои счета', callback_data: 'list_invoices' },
                  { text: '➕ Создать счет', callback_data: 'create_invoice' }
                ],
                [
                  { text: '🔍 Поиск', callback_data: 'search_invoices' },
                  { text: '📊 Статистика', callback_data: 'show_stats' }
                ],
                [
                  { text: '❓ Помощь', callback_data: 'show_help' }
                ]
              ]
            }
          }
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
                ],
                [
                  { text: '📋 Детали', callback_data: `details_${invoice.id}` },
                  { text: '📊 Статус', callback_data: `status_${invoice.id}` },
                  { text: '📝 Копировать', callback_data: `copy_${invoice.id}` }
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

    // Команда /search - поиск счетов
    this.bot.onText(/\/search (.+)/, async (msg, match) => {
      await this.handleSearchCommand(msg, match?.[1] || '');
    });

    // Команда /stats - статистика по счетам
    this.bot.onText(/\/stats/, async (msg) => {
      await this.handleStatsCommand(msg);
    });

    // Команда /settings - настройки уведомлений
    this.bot.onText(/\/settings/, async (msg) => {
      await this.handleSettingsCommand(msg);
    });

    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot?.sendMessage(chatId,
        `🤖 Помощь по боту\n\n` +
        `Этот бот интегрирован с веб-платформой для генерации счетов РК.\n\n` +
        `Возможности:\n` +
        `• Просмотр списка ваших счетов\n` +
        `• Получение готовых PDF и Excel файлов\n` +
        `• Поиск и статистика по счетам\n` +
        `• Управление статусами счетов\n` +
        `• Уведомления о новых счетах\n\n` +
        `Команды:\n` +
        `/start - Начать работу\n` +
        `/invoices - Список счетов\n` +
        `/search <запрос> - Поиск счетов\n` +
        `/stats - Статистика по счетам\n` +
        `/settings - Настройки уведомлений\n` +
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

        } else if (data.startsWith('details_')) {
          const invoiceId = data.replace('details_', '');
          await this.sendInvoiceDetails(chatId, invoiceId, user.id);
          await this.bot?.answerCallbackQuery(callbackQuery.id);

        } else if (data.startsWith('status_')) {
          const invoiceId = data.replace('status_', '');
          await this.sendStatusChangeOptions(chatId, invoiceId, user.id);
          await this.bot?.answerCallbackQuery(callbackQuery.id);

        } else if (data.startsWith('copy_')) {
          const invoiceId = data.replace('copy_', '');
          await this.copyInvoice(chatId, invoiceId, user.id);
          await this.bot?.answerCallbackQuery(callbackQuery.id, {
            text: "Счет скопирован!"
          });

        } else if (data.startsWith('set_status_')) {
          const [, status, invoiceId] = data.split('_');
          await this.changeInvoiceStatus(chatId, invoiceId, status, user.id);
          await this.bot?.answerCallbackQuery(callbackQuery.id, {
            text: "Статус изменен!"
          });

        } else if (data === 'list_invoices') {
          await this.showInvoicesList(chatId, user.id);
          await this.bot?.answerCallbackQuery(callbackQuery.id);

        } else if (data === 'create_invoice') {
          await this.bot?.sendMessage(chatId, 
            `➕ Для создания нового счета перейдите на веб-платформу:\n\n` +
            `https://${process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAIN || 'your-app.replit.app'}\n\n` +
            `После создания счет автоматически появится в боте.`
          );
          await this.bot?.answerCallbackQuery(callbackQuery.id);

        } else if (data === 'show_help') {
          await this.showHelp(chatId);
          await this.bot?.answerCallbackQuery(callbackQuery.id);

        } else if (data === 'show_stats') {
          await this.showStats(chatId, user.id);
          await this.bot?.answerCallbackQuery(callbackQuery.id);

        } else if (data === 'search_invoices') {
          await this.bot?.sendMessage(chatId, 
            `🔍 Для поиска счетов используйте команду:\n\n` +
            `/search <запрос>\n\n` +
            `Например:\n` +
            `/search 300000 - поиск по сумме\n` +
            `/search ТОО "Компания" - поиск по названию\n` +
            `/search услуга - поиск по описанию`
          );
          await this.bot?.answerCallbackQuery(callbackQuery.id);
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
              { text: '🔗 Открыть на сайте', url: `${this.getBaseUrl()}/invoice/${invoice.id}` }
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

  // Новые методы для расширенной функциональности

  private async handleSearchCommand(msg: any, query: string) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();

    if (!telegramId) return;

    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      await this.bot?.sendMessage(chatId, "🔑 Пожалуйста, авторизуйтесь на веб-платформе");
      return;
    }

    try {
      const allInvoices = await storage.getInvoicesByUserId(user.id);
      
      // Поиск по номеру счета, названию поставщика или покупателя
      const searchResults = [];
      for (const basicInvoice of allInvoices) {
        const invoice = await storage.getInvoiceById(basicInvoice.id);
        if (!invoice) continue;

        const searchText = query.toLowerCase();
        if (
          invoice.invoiceNumber.toLowerCase().includes(searchText) ||
          invoice.supplier.name.toLowerCase().includes(searchText) ||
          invoice.buyer.name.toLowerCase().includes(searchText) ||
          invoice.items.some(item => item.name.toLowerCase().includes(searchText))
        ) {
          searchResults.push(invoice);
        }
      }

      if (searchResults.length === 0) {
        await this.bot?.sendMessage(chatId, `🔍 По запросу "${query}" ничего не найдено`);
        return;
      }

      let message = `🔍 Результаты поиска по "${query}":\n\n`;
      for (const invoice of searchResults.slice(0, 5)) {
        message += `🧾 №${invoice.invoiceNumber}\n`;
        message += `📅 ${invoice.invoiceDate.toLocaleDateString('ru-RU')}\n`;
        message += `💰 ${Number(invoice.totalAmount).toLocaleString('ru-RU')} ₸\n`;
        message += `📊 ${this.getStatusEmoji(invoice.status || 'draft')} ${this.getStatusText(invoice.status || 'draft')}\n\n`;
      }

      if (searchResults.length > 5) {
        message += `\n... и еще ${searchResults.length - 5} результатов`;
      }

      await this.bot?.sendMessage(chatId, message);

    } catch (error) {
      console.error('Error in search command:', error);
      await this.bot?.sendMessage(chatId, "❌ Ошибка при поиске");
    }
  }

  private async handleStatsCommand(msg: any) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();

    if (!telegramId) return;

    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      await this.bot?.sendMessage(chatId, "🔑 Пожалуйста, авторизуйтесь на веб-платформе");
      return;
    }

    try {
      const allInvoices = await storage.getInvoicesByUserId(user.id);
      
      const stats = {
        total: allInvoices.length,
        draft: 0,
        sent: 0,
        paid: 0,
        totalAmount: 0,
        thisMonth: 0,
        thisMonthAmount: 0
      };

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      for (const invoice of allInvoices) {
        const status = invoice.status || 'draft';
        stats[status as keyof typeof stats]++;
        stats.totalAmount += Number(invoice.totalAmount);

        const invoiceDate = new Date(invoice.invoiceDate);
        if (invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear) {
          stats.thisMonth++;
          stats.thisMonthAmount += Number(invoice.totalAmount);
        }
      }

      const message = `📊 <b>Статистика по счетам</b>\n\n` +
        `📋 Всего счетов: ${stats.total}\n` +
        `📝 Черновиков: ${stats.draft}\n` +
        `📤 Отправлено: ${stats.sent}\n` +
        `✅ Оплачено: ${stats.paid}\n\n` +
        `💰 <b>Финансы:</b>\n` +
        `💵 Общая сумма: ${stats.totalAmount.toLocaleString('ru-RU')} ₸\n` +
        `📅 За этот месяц: ${stats.thisMonth} счетов на ${stats.thisMonthAmount.toLocaleString('ru-RU')} ₸`;

      await this.bot?.sendMessage(chatId, message, { parse_mode: 'HTML' });

    } catch (error) {
      console.error('Error in stats command:', error);
      await this.bot?.sendMessage(chatId, "❌ Ошибка при получении статистики");
    }
  }

  private async handleSettingsCommand(msg: any) {
    const chatId = msg.chat.id;
    await this.bot?.sendMessage(chatId, 
      `⚙️ <b>Настройки уведомлений</b>\n\n` +
      `В будущих обновлениях здесь будут доступны:\n` +
      `• Автоматические уведомления при создании счета\n` +
      `• Напоминания о неоплаченных счетах\n` +
      `• Настройки частоты уведомлений\n\n` +
      `Пока что все уведомления включены по умолчанию.`,
      { parse_mode: 'HTML' }
    );
  }

  private async sendInvoiceDetails(chatId: number, invoiceId: string, userId: string) {
    try {
      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        await this.bot?.sendMessage(chatId, "❌ Счет не найден");
        return;
      }

      const message = `📋 <b>Детали счета №${invoice.invoiceNumber}</b>\n\n` +
        `📅 Дата: ${invoice.invoiceDate.toLocaleDateString('ru-RU')}\n` +
        `📊 Статус: ${this.getStatusEmoji(invoice.status || 'draft')} ${this.getStatusText(invoice.status || 'draft')}\n` +
        `📄 Договор: ${invoice.contract || 'Без договора'}\n\n` +
        `<b>🏢 Поставщик:</b>\n` +
        `Название: ${invoice.supplier.name}\n` +
        `БИН/ИИН: ${invoice.supplier.bin}\n` +
        `ИИК: ${invoice.supplier.iik}\n` +
        `БИК: ${invoice.supplier.bik}\n` +
        `Банк: ${invoice.supplier.bank}\n\n` +
        `<b>🏪 Покупатель:</b>\n` +
        `Название: ${invoice.buyer.name}\n` +
        `БИН/ИИН: ${invoice.buyer.bin}\n` +
        `Адрес: ${invoice.buyer.address}\n\n` +
        `<b>📦 Товары/услуги:</b>\n` +
        invoice.items.map((item, index) => 
          `${index + 1}. ${item.name}\n   ${item.quantity} ${item.unit} × ${item.price} ₸ = ${item.total} ₸`
        ).join('\n') + 
        `\n\n💰 <b>Итого: ${Number(invoice.totalAmount).toLocaleString('ru-RU')} ₸</b>\n` +
        `${invoice.totalAmountWords}`;

      await this.bot?.sendMessage(chatId, message, { parse_mode: 'HTML' });

    } catch (error) {
      console.error('Error sending invoice details:', error);
      await this.bot?.sendMessage(chatId, "❌ Ошибка при получении деталей счета");
    }
  }

  private async sendStatusChangeOptions(chatId: number, invoiceId: string, userId: string) {
    try {
      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        await this.bot?.sendMessage(chatId, "❌ Счет не найден");
        return;
      }

      const currentStatus = invoice.status || 'draft';
      const message = `📊 Изменить статус счета №${invoice.invoiceNumber}\n\n` +
        `Текущий статус: ${this.getStatusEmoji(currentStatus)} ${this.getStatusText(currentStatus)}`;

      await this.bot?.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📝 Черновик', callback_data: `set_status_draft_${invoiceId}` },
              { text: '📤 Отправлен', callback_data: `set_status_sent_${invoiceId}` }
            ],
            [
              { text: '✅ Оплачен', callback_data: `set_status_paid_${invoiceId}` }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('Error sending status options:', error);
      await this.bot?.sendMessage(chatId, "❌ Ошибка при получении статуса счета");
    }
  }

  private async changeInvoiceStatus(chatId: number, invoiceId: string, newStatus: string, userId: string) {
    try {
      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        await this.bot?.sendMessage(chatId, "❌ Счет не найден");
        return;
      }

      // Обновляем статус счета
      await storage.updateInvoice(invoiceId, { status: newStatus });

      const message = `✅ Статус счета №${invoice.invoiceNumber} изменен на:\n` +
        `${this.getStatusEmoji(newStatus)} ${this.getStatusText(newStatus)}`;

      await this.bot?.sendMessage(chatId, message);

      // Отправляем уведомление о смене статуса
      if (newStatus === 'paid') {
        await this.bot?.sendMessage(chatId, 
          `🎉 Поздравляем! Счет №${invoice.invoiceNumber} помечен как оплаченный!`
        );
      }

    } catch (error) {
      console.error('Error changing invoice status:', error);
      await this.bot?.sendMessage(chatId, "❌ Ошибка при изменении статуса");
    }
  }

  private async copyInvoice(chatId: number, invoiceId: string, userId: string) {
    try {
      const response = await fetch(`http://localhost:5000/api/invoices/${invoiceId}/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Request': 'true'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to copy invoice');
      }

      const newInvoice = await response.json();

      await this.bot?.sendMessage(chatId, 
        `📋 Счет скопирован!\n\n` +
        `Новый номер: ${newInvoice.invoiceNumber}\n` +
        `Оригинальный счет остался без изменений.\n\n` +
        `Отредактируйте новый счет на веб-платформе при необходимости.`
      );

    } catch (error) {
      console.error('Error copying invoice:', error);
      await this.bot?.sendMessage(chatId, "❌ Ошибка при копировании счета");
    }
  }

  // Метод для автоматических уведомлений (вызывается при создании нового счета)
  async notifyInvoiceCreated(telegramId: string, invoice: any) {
    if (!this.bot) return;

    try {
      const message = `🆕 <b>Новый счет создан!</b>\n\n` +
        `📄 Номер: ${invoice.invoiceNumber}\n` +
        `📅 Дата: ${new Date(invoice.invoiceDate).toLocaleDateString('ru-RU')}\n` +
        `💰 Сумма: ${Number(invoice.totalAmount).toLocaleString('ru-RU')} ₸\n` +
        `🏢 Поставщик: ${invoice.supplier?.name || 'Не указан'}\n` +
        `🏪 Покупатель: ${invoice.buyer?.name || 'Не указан'}`;

      await this.bot.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📄 Скачать PDF', callback_data: `download_pdf_${invoice.id}` },
              { text: '📊 Скачать Excel', callback_data: `download_excel_${invoice.id}` }
            ],
            [
              { text: '🔗 Открыть на сайте', url: `${this.getBaseUrl()}/invoice/${invoice.id}` }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('Error sending invoice creation notification:', error);
    }
  }

  // Helper method to show invoices list (same as /invoices command)
  private async showInvoicesList(chatId: number, userId: string) {
    try {
      const basicInvoices = await storage.getInvoicesByUserId(userId);
      
      if (basicInvoices.length === 0) {
        await this.bot?.sendMessage(chatId, "У вас пока нет созданных счетов");
        return;
      }

      // Всегда показываем кнопки для удобства пользователя
      const invoicesToShow = basicInvoices.slice(0, 10); // Показываем максимум 10 счетов с кнопками
      
      for (const basicInvoice of invoicesToShow) {
        const invoice = await storage.getInvoiceById(basicInvoice.id);
        if (!invoice) continue;

        const message = `🧾 <b>Счет №${invoice.invoiceNumber}</b>\n` +
                       `📅 Дата: ${invoice.invoiceDate.toLocaleDateString('ru-RU')}\n` +
                       `💰 Сумма: ${Number(invoice.totalAmount).toLocaleString('ru-RU')} ₸\n` +
                       `🏢 Поставщик: ${invoice.supplier.name}\n` +
                       `🏪 Покупатель: ${invoice.buyer.name}\n` +
                       `📊 Статус: ${this.getStatusEmoji(invoice.status || 'draft')} ${this.getStatusText(invoice.status || 'draft')}`;

        await this.bot?.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📄 PDF', callback_data: `download_pdf_${invoice.id}` },
                { text: '📊 Excel', callback_data: `download_excel_${invoice.id}` }
              ],
              [
                { text: '📋 Детали', callback_data: `details_${invoice.id}` },
                { text: '📊 Статус', callback_data: `status_${invoice.id}` },
                { text: '📝 Копировать', callback_data: `copy_${invoice.id}` }
              ]
            ]
          }
        });
      }

      // Если счетов больше 10, сообщаем об этом
      if (basicInvoices.length > 10) {
        await this.bot?.sendMessage(chatId, 
          `📋 Показано ${invoicesToShow.length} из ${basicInvoices.length} счетов.\n\n` +
          `Для просмотра всех счетов используйте поиск:\n` +
          `/search <номер счета или название>`
        );
      }
    } catch (error) {
      console.error('Error showing invoices list:', error);
      await this.bot?.sendMessage(chatId, "Произошла ошибка при загрузке списка счетов");
    }
  }

  // Helper method to show help
  private async showHelp(chatId: number) {
    await this.bot?.sendMessage(chatId,
      `🤖 Помощь по боту\n\n` +
      `Этот бот интегрирован с веб-платформой для генерации счетов РК.\n\n` +
      `Возможности:\n` +
      `• Просмотр списка ваших счетов\n` +
      `• Получение готовых PDF и Excel файлов\n` +
      `• Поиск и статистика по счетам\n` +
      `• Управление статусами счетов\n` +
      `• Уведомления о новых счетах\n\n` +
      `Команды:\n` +
      `/start - Начать работу\n` +
      `/invoices - Список счетов\n` +
      `/search <запрос> - Поиск счетов\n` +
      `/stats - Статистика по счетам\n` +
      `/settings - Настройки уведомлений\n` +
      `/create - Создать счет\n` +
      `/help - Эта справка`
    );
  }

  // Helper method to show statistics
  private async showStats(chatId: number, userId: string) {
    try {
      const invoices = await storage.getInvoicesByUserId(userId);
      
      if (invoices.length === 0) {
        await this.bot?.sendMessage(chatId, "У вас пока нет созданных счетов для статистики");
        return;
      }

      const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
      const draftCount = invoices.filter(inv => (inv.status || 'draft') === 'draft').length;
      const sentCount = invoices.filter(inv => (inv.status || 'draft') === 'sent').length;
      const paidCount = invoices.filter(inv => (inv.status || 'draft') === 'paid').length;

      const message = `📊 Статистика счетов\n\n` +
                     `📋 Всего счетов: ${invoices.length}\n` +
                     `💰 Общая сумма: ${totalAmount.toLocaleString('ru-RU')} ₸\n` +
                     `💰 Средняя сумма: ${Math.round(totalAmount / invoices.length).toLocaleString('ru-RU')} ₸\n\n` +
                     `📊 По статусам:\n` +
                     `🟡 Черновиков: ${draftCount}\n` +
                     `🔵 Отправлено: ${sentCount}\n` +
                     `🟢 Оплачено: ${paidCount}\n\n` +
                     `📅 Последний счет: ${invoices[invoices.length - 1]?.invoiceDate.toLocaleDateString('ru-RU') || 'Нет данных'}`;

      await this.bot?.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error showing stats:', error);
      await this.bot?.sendMessage(chatId, "Произошла ошибка при загрузке статистики");
    }
  }
}

export const telegramBot = new InvoiceTelegramBot();
