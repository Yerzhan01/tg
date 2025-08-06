import jsPDF from 'jspdf';

// Функция для попытки поддержки кириллицы с помощью unicode escape
function prepareText(text: string): string {
  // Попробуем использовать encodeURIComponent для кириллических символов
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    
    // Если это кириллический символ, попробуем различные способы кодирования
    if (code >= 0x0400 && code <= 0x04FF) {
      // Прямой возврат символа - пусть jsPDF попробует его обработать
      return char;
    }
    
    return char;
  }).join('');
}

export interface InvoicePDFData {
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

export class PDFGenerator {
  // Точные константы позиционирования на основе анализа PDF
  private static readonly LAYOUT = {
    // Основные параметры страницы
    pageWidth: 210,
    pageHeight: 297,
    leftMargin: 20,
    rightMargin: 20,
    topMargin: 15,
    
    // Позиции для предупреждающего текста
    warning: {
      startY: 12,
      lineHeight: 3.5,
      fontSize: 7
    },
    
    // Таблица платежного поручения
    paymentTable: {
      startY: 35,
      titleY: 30,
      height: 40,
      // Точные позиции колонок
      cols: {
        iikX: 140,
        kbeX: 175,
        bikX: 140,
        codeX: 175
      },
      // Высоты строк
      rows: {
        header1: 8,
        data1: 16,
        binRow: 24,
        header2: 32,
        data2: 40
      }
    },
    
    // Заголовок счета
    invoiceTitle: {
      y: 85,
      lineY: 87,
      fontSize: 11
    },
    
    // Информация о сторонах
    parties: {
      supplierY: 95,
      buyerY: 103,
      contractY: 111,
      fontSize: 9,
      maxWidth: 170
    },
    
    // Таблица услуг
    servicesTable: {
      startY: 120,
      rowHeight: 8,
      // Точные ширины колонок в мм
      cols: [
        { width: 10, align: 'center' },  // №
        { width: 20, align: 'center' },  // Код
        { width: 85, align: 'left' },    // Наименование
        { width: 15, align: 'center' },  // Кол-во
        { width: 15, align: 'center' },  // Ед.
        { width: 25, align: 'right' },   // Цена
        { width: 25, align: 'right' }    // Сумма
      ]
    },
    
    // Подпись и печать
    signature: {
      lineY: 180,
      textY: 190,
      signatureX: 110,
      signatureY: 185,
      signatureWidth: 35,
      signatureHeight: 12,
      stampX: 50,
      stampY: 188,
      stampSize: 28
    }
  };

  static async generateInvoicePDF(data: InvoicePDFData, signature?: string, stamp?: string): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      putOnlyUsedFonts: true
    });
    
    const L = this.LAYOUT;
    
    // Устанавливаем базовый шрифт
    pdf.setFont('helvetica', 'normal');
    
    // Пробуем установить расширенный набор символов для jsPDF
    try {
      // @ts-ignore - внутренний API jsPDF для unicode
      if (pdf.internal && pdf.internal.scaleFactor) {
        pdf.internal.encoding = 'unicode';
      }
    } catch (error) {
      console.warn('Could not set unicode encoding:', error);
    }
    
    // 1. ПРЕДУПРЕЖДАЮЩИЙ ТЕКСТ
    this.drawWarningText(pdf, data);
    
    // 2. ТАБЛИЦА ПЛАТЕЖНОГО ПОРУЧЕНИЯ
    this.drawPaymentTable(pdf, data);
    
    // 3. ЗАГОЛОВОК СЧЕТА
    this.drawInvoiceTitle(pdf, data);
    
    // 4. ИНФОРМАЦИЯ О СТОРОНАХ
    this.drawPartiesInfo(pdf, data);
    
    // 5. ТАБЛИЦА УСЛУГ
    const totalY = this.drawServicesTable(pdf, data);
    
    // 6. ИТОГОВАЯ ИНФОРМАЦИЯ
    const signatureY = this.drawTotalInfo(pdf, data, totalY);
    
    // 7. ПОДПИСЬ И ПЕЧАТЬ
    this.drawSignatureSection(pdf, signature, stamp, signatureY);
    
    return pdf.output('blob');
  }
  
  private static drawWarningText(pdf: jsPDF, data: InvoicePDFData) {
    const L = this.LAYOUT;
    
    pdf.setFontSize(L.warning.fontSize);
    const warningLines = [
      prepareText('Внимание! Оплата данного счета означает согласие с условиями поставки товара. Уведомление об оплате обязательно, в'),
      prepareText('противном случае не гарантируется наличие товара на складе. Товар отпускается по факту прихода денег на р/с Поставщика,'),
      prepareText('самовывозом, при наличии доверенности и документов удостоверяющих личность.')
    ];
    
    warningLines.forEach((line, index) => {
      pdf.text(line, L.leftMargin, L.warning.startY + (index * L.warning.lineHeight));
    });
  }
  
  private static drawPaymentTable(pdf: jsPDF, data: InvoicePDFData) {
    const L = this.LAYOUT;
    const PT = L.paymentTable;
    const tableWidth = L.pageWidth - L.leftMargin - L.rightMargin;
    
    // Заголовок таблицы
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(prepareText('Образец платежного поручения'), L.pageWidth / 2, PT.titleY, { align: 'center' });
    
    // Основная рамка таблицы
    pdf.rect(L.leftMargin, PT.startY, tableWidth, PT.height);
    
    // Вертикальные линии
    pdf.line(PT.cols.iikX, PT.startY, PT.cols.iikX, PT.startY + PT.rows.binRow);
    pdf.line(PT.cols.kbeX, PT.startY, PT.cols.kbeX, PT.startY + PT.rows.binRow);
    pdf.line(PT.cols.bikX, PT.startY + PT.rows.binRow, PT.cols.bikX, PT.startY + PT.height);
    pdf.line(PT.cols.codeX, PT.startY + PT.rows.binRow, PT.cols.codeX, PT.startY + PT.height);
    
    // Горизонтальные линии
    pdf.line(L.leftMargin, PT.startY + PT.rows.header1, L.leftMargin + tableWidth, PT.startY + PT.rows.header1);
    pdf.line(L.leftMargin, PT.startY + PT.rows.data1, L.leftMargin + tableWidth, PT.startY + PT.rows.data1);
    pdf.line(L.leftMargin, PT.startY + PT.rows.binRow, L.leftMargin + tableWidth, PT.startY + PT.rows.binRow);
    pdf.line(L.leftMargin, PT.startY + PT.rows.header2, L.leftMargin + tableWidth, PT.startY + PT.rows.header2);
    
    // Заполнение таблицы
    pdf.setFontSize(9);
    
    // Первая строка - заголовки
    pdf.setFont('helvetica', 'bold');
    pdf.text(prepareText('Бенефициар:'), L.leftMargin + 2, PT.startY + 5);
    pdf.text(prepareText('ИИК'), (PT.cols.iikX + PT.cols.kbeX) / 2, PT.startY + 5, { align: 'center' });
    pdf.text(prepareText('Кбе'), (PT.cols.kbeX + L.leftMargin + tableWidth) / 2, PT.startY + 5, { align: 'center' });
    
    // Вторая строка - данные
    pdf.setFont('helvetica', 'normal');
    pdf.text(prepareText(data.supplier.name), L.leftMargin + 2, PT.startY + 13);
    pdf.text(data.supplier.iik, PT.cols.iikX + 2, PT.startY + 13);
    pdf.text(data.supplier.kbe || '19', PT.cols.kbeX + 2, PT.startY + 13);
    
    // Третья строка - БИН
    pdf.text(prepareText(`БИН: ${data.supplier.bin}`), L.leftMargin + 2, PT.startY + 21);
    
    // Четвертая строка - заголовки банка
    pdf.setFont('helvetica', 'bold');
    pdf.text(prepareText('Банк бенефициара:'), L.leftMargin + 2, PT.startY + 29);
    pdf.text(prepareText('БИК'), (PT.cols.bikX + PT.cols.codeX) / 2, PT.startY + 29, { align: 'center' });
    pdf.text(prepareText('Код назначения платежа'), PT.cols.codeX + 2, PT.startY + 29);
    
    // Пятая строка - данные банка
    pdf.setFont('helvetica', 'normal');
    pdf.text(prepareText(data.supplier.bank), L.leftMargin + 2, PT.startY + 37);
    pdf.text(data.supplier.bik, PT.cols.bikX + 2, PT.startY + 37);
    pdf.text(data.supplier.paymentCode || '859', PT.cols.codeX + 2, PT.startY + 37);
  }
  
  private static drawInvoiceTitle(pdf: jsPDF, data: InvoicePDFData) {
    const L = this.LAYOUT;
    
    pdf.setFontSize(L.invoiceTitle.fontSize);
    pdf.setFont('helvetica', 'bold');
    
    const dateStr = new Date(data.invoiceDate).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).replace('г.', '');
    
    pdf.text(prepareText(`Счет на оплату № ${data.invoiceNumber} от ${dateStr}`), L.leftMargin, L.invoiceTitle.y);
    
    // Линия под заголовком
    const tableWidth = L.pageWidth - L.leftMargin - L.rightMargin;
    pdf.line(L.leftMargin, L.invoiceTitle.lineY, L.leftMargin + tableWidth, L.invoiceTitle.lineY);
  }
  
  private static drawPartiesInfo(pdf: jsPDF, data: InvoicePDFData) {
    const L = this.LAYOUT;
    
    pdf.setFontSize(L.parties.fontSize);
    pdf.setFont('helvetica', 'normal');
    
    // Поставщик
    const supplierText = prepareText(`БИН / ИИН: ${data.supplier.bin}, ${data.supplier.name}, ${data.supplier.address}`);
    pdf.text(prepareText('Поставщик:'), L.leftMargin, L.parties.supplierY);
    pdf.text(supplierText, L.leftMargin + 25, L.parties.supplierY, { maxWidth: L.parties.maxWidth });
    
    // Покупатель
    const buyerText = prepareText(`БИН / ИИН: ${data.buyer.bin}, ${data.buyer.name}, ${data.buyer.address}`);
    pdf.text(prepareText('Покупатель:'), L.leftMargin, L.parties.buyerY);
    pdf.text(buyerText, L.leftMargin + 25, L.parties.buyerY, { maxWidth: L.parties.maxWidth });
    
    // Договор
    pdf.text(prepareText('Договор:'), L.leftMargin, L.parties.contractY);
    pdf.text(prepareText(data.contract), L.leftMargin + 25, L.parties.contractY);
  }
  
  private static drawServicesTable(pdf: jsPDF, data: InvoicePDFData): number {
    const L = this.LAYOUT;
    const ST = L.servicesTable;
    const tableWidth = ST.cols.reduce((sum, col) => sum + col.width, 0);
    const rowCount = data.services.length + 2; // +1 header +1 total
    const tableHeight = ST.rowHeight * rowCount;
    
    // Рисуем внешнюю рамку
    pdf.rect(L.leftMargin, ST.startY, tableWidth, tableHeight);
    
    // Рисуем вертикальные линии
    let currentX = L.leftMargin;
    ST.cols.forEach(col => {
      currentX += col.width;
      pdf.line(currentX, ST.startY, currentX, ST.startY + tableHeight);
    });
    
    // Рисуем горизонтальные линии
    for (let i = 1; i < rowCount; i++) {
      pdf.line(L.leftMargin, ST.startY + (ST.rowHeight * i), 
               L.leftMargin + tableWidth, ST.startY + (ST.rowHeight * i));
    }
    
    // Заголовки таблицы
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    
    const headers = ['№', prepareText('Код'), prepareText('Наименование'), prepareText('Кол-во'), prepareText('Ед.'), prepareText('Цена'), prepareText('Сумма')];
    currentX = L.leftMargin;
    headers.forEach((header, i) => {
      const col = ST.cols[i];
      const textX = currentX + (col.width / 2);
      pdf.text(header, textX, ST.startY + 5, { align: 'center' });
      currentX += col.width;
    });
    
    // Данные таблицы
    pdf.setFont('helvetica', 'normal');
    let currentY = ST.startY + ST.rowHeight;
    
    data.services.forEach((service, index) => {
      currentX = L.leftMargin;
      
      // №
      pdf.text((index + 1).toString(), currentX + 5, currentY + 5, { align: 'center' });
      currentX += ST.cols[0].width;
      
      // Код (пустой)
      currentX += ST.cols[1].width;
      
      // Наименование
      pdf.text(prepareText(service.name), currentX + 2, currentY + 5);
      currentX += ST.cols[2].width;
      
      // Количество
      pdf.text(service.quantity.toFixed(1), currentX + 7.5, currentY + 5, { align: 'center' });
      currentX += ST.cols[3].width;
      
      // Единица
      pdf.text(prepareText(service.unit), currentX + 2, currentY + 5);
      currentX += ST.cols[4].width;
      
      // Цена
      pdf.text(this.formatMoney(service.price), currentX + 23, currentY + 5, { align: 'right' });
      currentX += ST.cols[5].width;
      
      // Сумма
      pdf.text(this.formatMoney(service.total), currentX + 23, currentY + 5, { align: 'right' });
      
      currentY += ST.rowHeight;
    });
    
    // Строка итого
    pdf.setFont('helvetica', 'bold');
    const totalX = L.leftMargin + ST.cols.slice(0, 5).reduce((sum, col) => sum + col.width, 0);
    pdf.text(prepareText('Итого:'), totalX + 12.5, currentY + 5, { align: 'center' });
    pdf.text(this.formatMoney(data.totalAmount), 
             L.leftMargin + tableWidth - 2, currentY + 5, { align: 'right' });
    
    return currentY + ST.rowHeight;
  }
  
  private static drawTotalInfo(pdf: jsPDF, data: InvoicePDFData, startY: number): number {
    const L = this.LAYOUT;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    const y1 = startY + 10;
    const y2 = y1 + 6;
    
    pdf.text(prepareText(`Всего наименований ${data.services.length} на сумму ${this.formatMoney(data.totalAmount)} KZT`), 
             L.leftMargin, y1);
    pdf.text(prepareText(`Всего к оплате ${data.totalAmountWords}`), L.leftMargin, y2);
    
    return y2 + 15;
  }
  
  private static drawSignatureSection(pdf: jsPDF, signature: string | undefined, stamp: string | undefined, startY: number) {
    const L = this.LAYOUT;
    const tableWidth = L.pageWidth - L.leftMargin - L.rightMargin;
    
    // Линия над подписью
    pdf.line(L.leftMargin, startY, L.leftMargin + tableWidth, startY);
    
    // Текст
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(prepareText('Исполнитель:'), L.leftMargin, startY + 12);
    pdf.text(prepareText('/бухгалтер/'), L.signature.signatureX + 30, startY + 12);
    
    // Подпись
    if (signature) {
      try {
        pdf.addImage(signature, 'PNG', 
                    L.signature.signatureX, 
                    startY + 2,
                    L.signature.signatureWidth, 
                    L.signature.signatureHeight);
      } catch (error) {
        console.warn('Could not add signature:', error);
      }
    }
    
    // Печать
    if (stamp) {
      try {
        pdf.addImage(stamp, 'PNG', 
                    L.signature.stampX, 
                    startY + 8,
                    L.signature.stampSize, 
                    L.signature.stampSize);
      } catch (error) {
        console.warn('Could not add stamp:', error);
      }
    }
  }
  
  private static formatMoney(amount: number): string {
    return amount.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).replace(',', '.');
  }
  
  static downloadPDF(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    try {
      document.body.appendChild(link);
      link.click();
    } finally {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}

// Совместимая функция для обратной совместимости
export const generateInvoicePDF = async (data: InvoicePDFData): Promise<Blob> => {
  return await PDFGenerator.generateInvoicePDF(data);
};