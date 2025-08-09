import { DatabaseStorage } from './db-storage';
import { db } from './db';
import { prodDb, useProductionDb } from './db-production';

// Фабрика для создания правильного storage в зависимости от окружения
export function createStorage() {
  if (useProductionDb()) {
    console.log('🗄️ Using PRODUCTION database for storage');
    return new DatabaseStorage(prodDb);
  } else {
    console.log('🔧 Using DEVELOPMENT database for storage');
    return new DatabaseStorage(db);
  }
}

export const storage = createStorage();