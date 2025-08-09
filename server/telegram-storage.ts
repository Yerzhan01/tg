import { DatabaseStorage } from './db-storage';
import { prodDb } from './db-production';
import { storage } from './storage-factory';

// В продакшене используем единую базу, в разработке - отдельную продакшн базу для бота
export const telegramStorage = process.env.NODE_ENV === 'production' 
  ? storage  // В продакшене используем ту же базу что и веб-приложение
  : new DatabaseStorage(prodDb);  // В разработке используем отдельную продакшн базу

console.log(process.env.NODE_ENV === 'production' 
  ? '🤖 Telegram bot using same database as web app (PRODUCTION)' 
  : '🤖 Telegram bot using separate PRODUCTION database');