export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export class TelegramIntegration {
  static async authenticateUser(telegramData: TelegramUser) {
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telegramData),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    return response.json();
  }

  static async sendInvoiceToTelegram(invoiceId: string) {
    const response = await fetch(`/api/invoices/${invoiceId}/send-to-telegram`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to send invoice to Telegram');
    }

    return response.json();
  }

  static getTelegramBotUrl(): string {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'your_invoice_bot';
    return `https://t.me/${botUsername}`;
  }

  static initTelegramLoginWidget(onAuth: (user: TelegramUser) => void) {
    // This function sets up the Telegram Login Widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'your_bot_username');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    // Set up global callback
    (window as any).onTelegramAuth = onAuth;

    return script;
  }
}
