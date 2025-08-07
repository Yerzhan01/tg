import jsPDF from 'jspdf';
import { registerPTSansFont } from './fonts';

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
  private static fontsLoaded = false;

  private static readonly LAYOUT = {
    pageWidth: 210,
    pageHeight: 297,
    leftMargin: 20,
    rightMargin: 20,
    topMargin: 15,

    warning: {
      startY: 12,
      lineHeight: 3.5,
      fontSize: 7
    },

    paymentTable: {
      startY: 35,
      titleY: 30,
      height: 25,
      // Координаты по образцу с правильным расположением
      beneficiaryCell: { x: 10, y: 35, width: 130, height: 25 },
      iikCell: { x: 140, y: 35, width: 65, height: 15 },
      kbeCell: { x: 205, y: 35, width: 45, height: 15 },
      bankCell: { x: 140, y: 50, width: 65, height: 15 },
      codeCell: { x: 205, y: 50, width: 45, height: 15 },
    },

    invoiceTitle: {
      y: 60,
      lineY: 62,
      fontSize: 12
    },

    parties: {
      supplierY: 70,
      buyerY: 78,
      contractY: 86,
      fontSize: 9,
      maxWidth: 170
    },

    servicesTable: {
      startY: 95,
      rowHeight: 8,
      cols: [
        { width: 12 },   // №
        { width: 20 },   // Код
        { width: 80 },   // Наименование
        { width: 20 },   // Кол-во
        { width: 20 },   // Ед.
        { width: 30 },   // Цена
        { width: 30 }    // Сумма
      ]
    },

    signature: {
      signatureY: 180,
      signatureX: 110,
      signatureWidth: 35,
      signatureHeight: 12,
      stampX: 50,
      stampSize: 28
    }
  };

  static async generateInvoicePDF(
    data: InvoicePDFData, 
    signature?: string, 
    stamp?: string
  ): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Register PT Sans fonts for proper Cyrillic support
    const fontsRegistered = registerPTSansFont(pdf);

    const L = this.LAYOUT;

    // Set font for Cyrillic support
    if (fontsRegistered) {
      pdf.setFont('PTSans', 'normal');
      console.log('Using PT Sans font for Cyrillic support');
    } else {
      pdf.setFont('Arial', 'normal');
      console.log('Using Arial font as fallback for Cyrillic support');
    }

    // Function to prepare text (preserve Cyrillic with PT Sans or Arial)
    const prepareText = (text: string): string => {
      return text; // Keep original text including Cyrillic and Kazakh characters
    };

    // 1. ПРЕДУПРЕЖДАЮЩИЙ ТЕКСТ
    this.drawWarningText(pdf, data, prepareText);

    // 2. ТАБЛИЦА ПЛАТЕЖНОГО ПОРУЧЕНИЯ (исправленная)
    this.drawPaymentTable(pdf, data, prepareText);

    // 3. ЗАГОЛОВОК СЧЕТА
    this.drawInvoiceTitle(pdf, data, prepareText);

    // 4. ИНФОРМАЦИЯ О СТОРОНАХ
    this.drawPartiesInfo(pdf, data, prepareText);

    // 5. ТАБЛИЦА УСЛУГ
    const totalY = this.drawServicesTable(pdf, data, prepareText);

    // 6. ИТОГОВАЯ ИНФОРМАЦИЯ
    const signatureY = this.drawTotalInfo(pdf, data, totalY, prepareText);

    // 7. ПОДПИСЬ И ПЕЧАТЬ
    this.drawSignatureSection(pdf, signature, stamp, signatureY, prepareText);

    return pdf.output('blob');
  }

  private static drawWarningText(pdf: jsPDF, data: InvoicePDFData, prepareText: (text: string) => string) {
    const L = this.LAYOUT;

    pdf.setFontSize(L.warning.fontSize);
    try { pdf.setFont('PTSans', 'bold'); } catch { pdf.setFont('Arial', 'bold'); }

    // Весь текст предупреждения в одном блоке
    const warningText = 'Внимание! Оплата данного счета означает согласие с условиями поставки товара. Уведомление об оплате обязательно, в противном случае не гарантируется наличие товара на складе. Товар отпускается по факту прихода денег на р/с Поставщика, самовывозом, при наличии доверенности и документов удостоверяющих личность.';

    const lines = pdf.splitTextToSize(prepareText(warningText), 170);
    lines.forEach((line: string, index: number) => {
      pdf.text(line, L.leftMargin, L.warning.startY + (index * L.warning.lineHeight));
    });
  }

  private static drawPaymentTable(pdf: jsPDF, data: InvoicePDFData, prepareText: (text: string) => string) {
    const L = this.LAYOUT;
    const PT = L.paymentTable;
    
    try { pdf.setFont('PTSans', 'normal'); } catch { pdf.setFont('Arial', 'normal'); };
    pdf.setFontSize(8);
    
    // Заголовок "Образец платежного поручения"
    pdf.text(prepareText('Образец платежного поручения'), L.leftMargin, PT.titleY);
    
    // Рисуем таблицу точно по образцу
    const beneficiary = PT.beneficiaryCell;
    const iik = PT.iikCell;
    const kbe = PT.kbeCell;
    const bank = PT.bankCell;
    const code = PT.codeCell;
    
    // Рисуем все ячейки
    // Ячейка бенефициара (большая левая)
    pdf.rect(beneficiary.x, beneficiary.y, beneficiary.width, beneficiary.height);
    
    // Ячейка ИИК (правая верхняя)
    pdf.rect(iik.x, iik.y, iik.width, iik.height);
    
    // Ячейка КБе (правая верхняя малая)
    pdf.rect(kbe.x, kbe.y, kbe.width, kbe.height);
    
    // Ячейка БИК (правая нижняя левая)
    pdf.rect(bank.x, bank.y, bank.width, bank.height);
    
    // Ячейка кода назначения (правая нижняя правая)
    pdf.rect(code.x, code.y, code.width, code.height);
    
    // Заголовки
    try { pdf.setFont('PTSans', 'bold'); } catch { pdf.setFont('Arial', 'bold'); };
    pdf.setFontSize(8);
    
    // Заголовки в ячейках
    pdf.text(prepareText('Бенефициар:'), beneficiary.x + 2, beneficiary.y + 7);
    pdf.text(prepareText('ИИК'), iik.x + 15, iik.y + 7);
    pdf.text(prepareText('КБе'), kbe.x + 15, kbe.y + 7);
    pdf.text(prepareText('БИК'), bank.x + 18, bank.y + 7);
    
    // Код назначения платежа в две строки с достаточным интервалом
    pdf.setFontSize(6);
    pdf.text(prepareText('Код назначения'), code.x + 3, code.y + 5);
    pdf.text(prepareText('платежа'), code.x + 8, code.y + 9);
    
    // Данные
    try { pdf.setFont('PTSans', 'normal'); } catch { pdf.setFont('Arial', 'normal'); };
    pdf.setFontSize(8);
    
    // Название поставщика
    const supplierName = data.supplier.name.length > 30 ? 
      data.supplier.name.substring(0, 27) + '...' : data.supplier.name;
    pdf.text(prepareText(supplierName), beneficiary.x + 2, beneficiary.y + 15);
    
    // БИН поставщика
    pdf.text(prepareText(`БИН: ${data.supplier.bin}`), beneficiary.x + 2, beneficiary.y + 22);
    
    // Банк бенефициара
    pdf.setFontSize(7);
    pdf.text(prepareText('Банк бенефициара:'), beneficiary.x + 2, beneficiary.y + 28);
    const bankName = data.supplier.bank.length > 25 ?
      data.supplier.bank.substring(0, 22) + '...' : data.supplier.bank;
    pdf.text(prepareText(`АО "${bankName}"`), beneficiary.x + 2, beneficiary.y + 35);
    
    // ИИК
    pdf.setFontSize(7);
    const iikText = data.supplier.iik;
    pdf.text(iikText, iik.x + 2, iik.y + 10);
    
    // КБе
    pdf.setFontSize(10);
    pdf.text('19', kbe.x + 20, kbe.y + 10);
    
    // БИК
    pdf.setFontSize(8);
    pdf.text(data.supplier.bik, bank.x + 8, bank.y + 10);
    
    // Код назначения платежа (размещаем ниже заголовка)
    pdf.setFontSize(10);
    pdf.text('859', code.x + 18, code.y + 12);
  }

  private static drawInvoiceTitle(pdf: jsPDF, data: InvoicePDFData, prepareText: (text: string) => string) {
    const L = this.LAYOUT;

    pdf.setFontSize(L.invoiceTitle.fontSize);
    try { pdf.setFont('PTSans', 'bold'); } catch { pdf.setFont('Arial', 'bold'); }

    // Правильное форматирование даты
    const date = new Date(data.invoiceDate);
    const day = date.getDate();
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const dateStr = `${day} ${month} ${year}`;

    const titleText = prepareText(`Счет на оплату № ${data.invoiceNumber} от ${dateStr}`);
    pdf.text(titleText, L.leftMargin, L.invoiceTitle.y);

    // Линия под заголовком
    const tableWidth = L.pageWidth - L.leftMargin - L.rightMargin;
    pdf.line(L.leftMargin, L.invoiceTitle.lineY, L.leftMargin + tableWidth, L.invoiceTitle.lineY);
  }

  private static drawPartiesInfo(pdf: jsPDF, data: InvoicePDFData, prepareText: (text: string) => string) {
    const L = this.LAYOUT;

    pdf.setFontSize(L.parties.fontSize);
    try { pdf.setFont('PTSans', 'normal'); } catch { pdf.setFont('Arial', 'normal'); }

    // Поставщик
    const supplierText = prepareText(`БИН / ИИН: ${data.supplier.bin}, ${data.supplier.name}, ${data.supplier.address}`);
    pdf.text(prepareText('Поставщик:'), L.leftMargin, L.parties.supplierY);

    // Разбиваем длинный текст на строки
    const supplierLines = pdf.splitTextToSize(supplierText, L.parties.maxWidth);
    let currentY = L.parties.supplierY;
    supplierLines.forEach((line: string, index: number) => {
      pdf.text(line, L.leftMargin + (index === 0 ? 25 : 0), currentY);
      if (index > 0) currentY += 4;
    });

    // Покупатель
    const buyerText = prepareText(`БИН / ИИН: ${data.buyer.bin}, ${data.buyer.name}, ${data.buyer.address}`);
    pdf.text(prepareText('Покупатель:'), L.leftMargin, L.parties.buyerY);

    const buyerLines = pdf.splitTextToSize(buyerText, L.parties.maxWidth);
    currentY = L.parties.buyerY;
    buyerLines.forEach((line: string, index: number) => {
      pdf.text(line, L.leftMargin + (index === 0 ? 25 : 0), currentY);
      if (index > 0) currentY += 4;
    });

    // Договор
    pdf.text(prepareText('Договор:'), L.leftMargin, L.parties.contractY);
    pdf.text(prepareText(data.contract), L.leftMargin + 25, L.parties.contractY);
  }

  private static drawServicesTable(pdf: jsPDF, data: InvoicePDFData, prepareText: (text: string) => string): number {
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
    try { pdf.setFont('PTSans', 'bold'); } catch { pdf.setFont('Arial', 'bold'); }
    pdf.setFontSize(8);

    const headers = ['№', 'Код', 'Наименование', 'Кол-во', 'Ед.', 'Цена', 'Сумма'];
    currentX = L.leftMargin;
    headers.forEach((header, i) => {
      const col = ST.cols[i];
      const textX = currentX + (col.width / 2);
      pdf.text(prepareText(header), textX, ST.startY + 5, { align: 'center' });
      currentX += col.width;
    });

    // Данные таблицы
    try { pdf.setFont('PTSans', 'normal'); } catch { pdf.setFont('Arial', 'normal'); }
    let currentY = ST.startY + ST.rowHeight;

    data.services.forEach((service, index) => {
      currentX = L.leftMargin;

      // №
      pdf.text((index + 1).toString(), currentX + (ST.cols[0].width / 2), currentY + 5, { align: 'center' });
      currentX += ST.cols[0].width;

      // Код (пустой)
      currentX += ST.cols[1].width;

      // Наименование
      pdf.text(prepareText(service.name), currentX + 2, currentY + 5);
      currentX += ST.cols[2].width;

      // Количество
      pdf.text(service.quantity.toFixed(1), currentX + (ST.cols[3].width / 2), currentY + 5, { align: 'center' });
      currentX += ST.cols[3].width;

      // Единица
      pdf.text(prepareText(service.unit), currentX + 2, currentY + 5);
      currentX += ST.cols[4].width;

      // Цена
      pdf.text(this.formatMoney(service.price), currentX + ST.cols[5].width - 2, currentY + 5, { align: 'right' });
      currentX += ST.cols[5].width;

      // Сумма
      pdf.text(this.formatMoney(service.total), currentX + ST.cols[6].width - 2, currentY + 5, { align: 'right' });

      currentY += ST.rowHeight;
    });

    // Строка итого
    try { pdf.setFont('PTSans', 'bold'); } catch { pdf.setFont('Arial', 'bold'); }
    currentX = L.leftMargin + ST.cols.slice(0, 5).reduce((sum, col) => sum + col.width, 0);
    pdf.text(prepareText('Итого:'), currentX + (ST.cols[5].width / 2), currentY + 5, { align: 'center' });
    pdf.text(this.formatMoney(data.totalAmount), 
             L.leftMargin + tableWidth - 2, currentY + 5, { align: 'right' });

    return currentY + ST.rowHeight;
  }

  private static drawTotalInfo(pdf: jsPDF, data: InvoicePDFData, startY: number, prepareText: (text: string) => string): number {
    const L = this.LAYOUT;

    try { pdf.setFont('PTSans', 'normal'); } catch { pdf.setFont('Arial', 'normal'); }
    pdf.setFontSize(9);

    const y1 = startY + 10;
    const y2 = y1 + 6;

    pdf.text(prepareText(`Всего наименований ${data.services.length} на сумму ${this.formatMoney(data.totalAmount)} KZT`), 
             L.leftMargin, y1);
    pdf.text(prepareText(`Всего к оплате ${data.totalAmountWords}`), L.leftMargin, y2);

    return y2 + 15;
  }

  private static drawSignatureSection(pdf: jsPDF, signature: string | undefined, stamp: string | undefined, startY: number, prepareText: (text: string) => string) {
    const L = this.LAYOUT;
    const tableWidth = L.pageWidth - L.leftMargin - L.rightMargin;

    // Линия над подписью
    pdf.line(L.leftMargin, startY, L.leftMargin + tableWidth, startY);

    // Текст
    try { pdf.setFont('PTSans', 'normal'); } catch { pdf.setFont('Arial', 'normal'); }
    pdf.setFontSize(9);
    pdf.text(prepareText('Исполнитель:'), L.leftMargin, startY + 12);

    // Линия для подписи
    pdf.line(L.leftMargin + 30, startY + 10, L.leftMargin + 100, startY + 10);

    pdf.text(prepareText('/бухгалтер/'), L.leftMargin + 105, startY + 12);

    // Подпись
    if (signature) {
      try {
        pdf.addImage(signature, 'PNG', 
                    L.leftMargin + 40, 
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
                    L.leftMargin + 120, 
                    startY - 10,
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}