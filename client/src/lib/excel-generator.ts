import * as XLSX from 'xlsx';

export interface ExcelInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  contract: string;
  supplier: {
    name: string;
    bin: string;
    address: string;
    bank: string;
    bik: string;
    iik: string;
    kbe: string;
    paymentCode: string;
  };
  buyer: {
    name: string;
    bin: string;
    address: string;
  };
  services: Array<{
    name: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }>;
  totalAmount: number;
  totalAmountWords: string;
}

export class ExcelGenerator {
  static generateInvoiceExcel(data: ExcelInvoiceData): ArrayBuffer {
    // Создаем новую книгу
    const wb = XLSX.utils.book_new();
    
    // Подготавливаем данные для листа
    const worksheetData = [
      // Заголовок
      [`СЧЕТ НА ОПЛАТУ № ${data.invoiceNumber} от ${data.invoiceDate}`],
      [data.contract ? `По договору: ${data.contract}` : ''],
      [''],
      
      // Поставщик
      ['ПОСТАВЩИК:'],
      [`Наименование: ${data.supplier.name}`],
      [`БИН: ${data.supplier.bin}`],
      [`Адрес: ${data.supplier.address}`],
      [`Банк: ${data.supplier.bank}`],
      [`БИК: ${data.supplier.bik}`],
      [`ИИК: ${data.supplier.iik}`],
      [`КБЕ: ${data.supplier.kbe}`],
      [`Код назначения платежа: ${data.supplier.paymentCode}`],
      [''],
      
      // Покупатель
      ['ПОКУПАТЕЛЬ:'],
      [`Наименование: ${data.buyer.name}`],
      [`БИН: ${data.buyer.bin}`],
      [`Адрес: ${data.buyer.address}`],
      [''],
      
      // Заголовки таблицы услуг
      ['№', 'Наименование', 'Количество', 'Ед. изм.', 'Цена (₸)', 'Сумма (₸)'],
    ];
    
    // Добавляем услуги
    data.services.forEach((service, index) => {
      worksheetData.push([
        index + 1,
        service.name,
        service.quantity,
        service.unit,
        service.price,
        service.total
      ]);
    });
    
    // Добавляем итоги
    worksheetData.push(
      [''],
      ['', '', '', '', 'ИТОГО:', data.totalAmount],
      [''],
      [`Сумма прописью: ${data.totalAmountWords}`]
    );
    
    // Создаем лист
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Настраиваем ширину колонок
    const colWidths = [
      { wch: 5 },   // №
      { wch: 30 },  // Наименование
      { wch: 12 },  // Количество
      { wch: 10 },  // Ед. изм.
      { wch: 15 },  // Цена
      { wch: 15 },  // Сумма
    ];
    ws['!cols'] = colWidths;
    
    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(wb, ws, 'Счет');
    
    // Генерируем файл
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  }
  
  static downloadExcel(buffer: ArrayBuffer, filename: string): void {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}