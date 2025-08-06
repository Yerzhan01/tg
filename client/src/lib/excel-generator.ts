import * as XLSX from 'xlsx';

export interface InvoiceExcelData {
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
  services: {
    name: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }[];
  totalAmount: number;
  totalAmountWords: string;
}

export class ExcelGenerator {
  static generateInvoiceExcel(data: InvoiceExcelData): Blob {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Create invoice sheet
    const invoiceData = [
      [`Счет на оплату № ${data.invoiceNumber} от ${new Date(data.invoiceDate).toLocaleDateString('ru-RU')}`],
      [],
      ['Поставщик:', data.supplier.name],
      ['БИН/ИИН:', data.supplier.bin],
      ['Адрес:', data.supplier.address],
      ['Банк:', data.supplier.bank],
      ['БИК:', data.supplier.bik],
      ['ИИК:', data.supplier.iik],
      ['КБЕ:', data.supplier.kbe],
      ['Код назначения платежа:', data.supplier.paymentCode],
      [],
      ['Покупатель:', data.buyer.name],
      ['БИН/ИИН:', data.buyer.bin],
      ['Адрес:', data.buyer.address],
      [],
      ['Договор:', data.contract],
      [],
      ['№', 'Наименование', 'Количество', 'Единица', 'Цена', 'Сумма'],
    ];
    
    // Add services
    data.services.forEach((service, index) => {
      invoiceData.push([
        (index + 1).toString(),
        service.name,
        service.quantity.toString(),
        service.unit,
        service.price.toString(),
        service.total.toString()
      ]);
    });
    
    // Add total
    invoiceData.push(
      [],
      ['', '', '', '', 'Итого:', data.totalAmount.toString()],
      [],
      [`Всего наименований ${data.services.length} на сумму ${data.totalAmount.toLocaleString('ru-RU')} KZT`],
      [`Всего к оплате ${data.totalAmountWords}`]
    );
    
    const ws = XLSX.utils.aoa_to_sheet(invoiceData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // №
      { wch: 40 },  // Наименование
      { wch: 12 },  // Количество
      { wch: 10 },  // Единица
      { wch: 15 },  // Цена
      { wch: 15 }   // Сумма
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Счет');
    
    // Create services detail sheet
    const servicesData = [
      ['Детализация услуг/товаров'],
      [],
      ['№', 'Наименование', 'Количество', 'Единица измерения', 'Цена за единицу', 'Общая сумма'],
    ];
    
    data.services.forEach((service, index) => {
      servicesData.push([
        (index + 1).toString(),
        service.name,
        service.quantity.toString(),
        service.unit,
        service.price.toString(),
        service.total.toString()
      ]);
    });
    
    servicesData.push(
      [],
      ['', '', '', '', 'ИТОГО:', data.totalAmount.toString()]
    );
    
    const ws2 = XLSX.utils.aoa_to_sheet(servicesData);
    ws2['!cols'] = [
      { wch: 5 },
      { wch: 50 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws2, 'Детализация');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  
  static downloadExcel(blob: Blob, filename: string) {
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
