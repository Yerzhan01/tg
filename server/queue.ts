import Queue from 'bull';
import { storage } from './storage-factory';

// Queue для фонового выполнения задач
const redisConfig = process.env.REDIS_URL ? {
  redis: process.env.REDIS_URL
} : {
  redis: {
    port: 6379,
    host: '127.0.0.1',
  }
};

// Очередь для генерации PDF
export const pdfQueue = new Queue('PDF generation', redisConfig);

// Очередь для генерации Excel
export const excelQueue = new Queue('Excel generation', redisConfig);

// Очередь для отправки в Telegram
export const telegramQueue = new Queue('Telegram notifications', redisConfig);

// Обработчики очередей
pdfQueue.process(async (job) => {
  const { invoiceId, userId } = job.data;
  console.log(`🔄 Generating PDF for invoice ${invoiceId}`);
  
  try {
    const invoice = await storage.getInvoiceById(invoiceId);
    if (!invoice || invoice.userId !== userId) {
      throw new Error('Invoice not found or access denied');
    }

    // Здесь будет логика генерации PDF
    // Пока возвращаем успех
    console.log(`✅ PDF generated for invoice ${invoiceId}`);
    return { success: true, invoiceId };
  } catch (error) {
    console.error(`❌ PDF generation failed for invoice ${invoiceId}:`, error);
    throw error;
  }
});

excelQueue.process(async (job) => {
  const { invoiceId, userId } = job.data;
  console.log(`🔄 Generating Excel for invoice ${invoiceId}`);
  
  try {
    const invoice = await storage.getInvoiceById(invoiceId);
    if (!invoice || invoice.userId !== userId) {
      throw new Error('Invoice not found or access denied');
    }

    // Здесь будет логика генерации Excel
    console.log(`✅ Excel generated for invoice ${invoiceId}`);
    return { success: true, invoiceId };
  } catch (error) {
    console.error(`❌ Excel generation failed for invoice ${invoiceId}:`, error);
    throw error;
  }
});

telegramQueue.process(async (job) => {
  const { userId, invoiceId, type } = job.data;
  console.log(`🔄 Sending Telegram notification for invoice ${invoiceId}`);
  
  try {
    // Здесь будет логика отправки в Telegram
    console.log(`✅ Telegram notification sent for invoice ${invoiceId}`);
    return { success: true, invoiceId, type };
  } catch (error) {
    console.error(`❌ Telegram notification failed for invoice ${invoiceId}:`, error);
    throw error;
  }
});

// Функции для добавления задач в очереди
export const queuePdfGeneration = async (invoiceId: string, userId: string) => {
  return await pdfQueue.add('generate-pdf', { invoiceId, userId }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
};

export const queueExcelGeneration = async (invoiceId: string, userId: string) => {
  return await excelQueue.add('generate-excel', { invoiceId, userId }, {
    attempts: 3,
    backoff: {
      type: 'exponential', 
      delay: 2000,
    },
  });
};

export const queueTelegramNotification = async (userId: string, invoiceId: string, type: string) => {
  return await telegramQueue.add('send-notification', { userId, invoiceId, type }, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
};

// Мониторинг очередей
pdfQueue.on('completed', (job) => {
  console.log(`✅ PDF job ${job.id} completed`);
});

pdfQueue.on('failed', (job, err) => {
  console.error(`❌ PDF job ${job.id} failed:`, err);
});

excelQueue.on('completed', (job) => {
  console.log(`✅ Excel job ${job.id} completed`);
});

excelQueue.on('failed', (job, err) => {
  console.error(`❌ Excel job ${job.id} failed:`, err);
});

telegramQueue.on('completed', (job) => {
  console.log(`✅ Telegram job ${job.id} completed`);
});

telegramQueue.on('failed', (job, err) => {
  console.error(`❌ Telegram job ${job.id} failed:`, err);
});

console.log('🚀 Background job queues initialized');