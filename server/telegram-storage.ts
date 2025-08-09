import { DatabaseStorage } from './db-storage';
import { prodDb } from './db-production';

// Создаем отдельный storage для Telegram бота, который всегда использует продакшн базу
console.log('🤖 Telegram bot using PRODUCTION database');
export const telegramStorage = new DatabaseStorage(prodDb);