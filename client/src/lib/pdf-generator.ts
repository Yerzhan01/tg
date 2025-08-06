import jsPDF from 'jspdf';

// Base64-encoded PT Sans font (сокращенная версия для демонстрации)
// В производственной версии используйте полный base64 шрифта
const PT_SANS_NORMAL = "AAEAAAAMAIAAAwBAT1MvMg7v..."; // Здесь должен быть полный base64

// Функция для транслитерации кириллицы в случае проблем со шрифтом
function transliterateText(text: string): string {
  const translitMap: { [key: string]: string } = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'YO',
    'Ж': 'ZH', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'KH', 'Ц': 'TS', 'Ч': 'CH', 'Ш': 'SH', 'Щ': 'SCH',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'YU', 'Я': 'YA',
    // Казахские буквы
    'ә': 'ae', 'ғ': 'gh', 'қ': 'q', 'ң': 'ng', 'ө': 'oe', 'ұ': 'u', 'ү': 'ue', 'һ': 'h', 'і': 'i',
    'Ә': 'AE', 'Ғ': 'GH', 'Қ': 'Q', 'Ң': 'NG', 'Ө': 'OE', 'Ұ': 'U', 'Ү': 'UE', 'Һ': 'H', 'І': 'I'
  };
  
  return text.split('').map(char => {
    // Если это мягкий или твердый знак, возвращаем пустую строку
    if (char === 'ь' || char === 'ъ' || char === 'Ь' || char === 'Ъ') {
      return '';
    }
    // Иначе используем карту транслитерации или оставляем символ как есть
    return translitMap[char] || char;
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
      height: 40,
      cols: {
        iikX: 140,
        kbeX: 175,
        bikX: 140,
        codeX: 175
      },
      rows: {
        header1: 8,
        data1: 16,
        binRow: 24,
        header2: 32,
        data2: 40
      }
    },
    
    invoiceTitle: {
      y: 85,
      lineY: 87,
      fontSize: 11
    },
    
    parties: {
      supplierY: 95,
      buyerY: 103,
      contractY: 111,
      fontSize: 9,
      maxWidth: 170
    },
    
    servicesTable: {
      startY: 120,
      rowHeight: 8,
      cols: [
        { width: 10 },
        { width: 20 },
        { width: 85 },
        { width: 15 },
        { width: 15 },
        { width: 25 },
        { width: 25 }
      ]
    },
    
    signature: {
      signatureX: 110,
      signatureWidth: 35,
      signatureHeight: 12,
      stampX: 50,
      stampSize: 28
    }
  };

  // Пытаемся загрузить кастомный шрифт
  private static loadCustomFont(pdf: jsPDF): boolean {
    if (this.fontsLoaded) return true;
    
    try {
      // Если у нас есть base64 шрифта, загружаем его
      if (PT_SANS_NORMAL && PT_SANS_NORMAL.length > 100) {
        pdf.addFileToVFS('PTSans-normal.ttf', PT_SANS_NORMAL);
        pdf.addFont('PTSans-normal.ttf', 'PTSans', 'normal');
        this.fontsLoaded = true;
        return true;
      }
    } catch (error) {
      console.warn('Could not load custom font:', error);
    }
    
    return false;
  }

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
    
    const L = this.LAYOUT;
    
    // Попытка загрузить кастомный шрифт
    const customFontLoaded = this.loadCustomFont(pdf);
    
    // Устанавливаем базовый шрифт
    if (customFontLoaded) {
      pdf.setFont('PTSans', 'normal');
    } else {
      pdf.setFont('helvetica', 'normal');
    }

    // Функция для подготовки текста (кириллица или транслитерация)
    const prepareText = (text: string): string => {
      if (customFontLoaded) {
        return text; // Оставляем кириллицу как есть
      } else {
        return transliterateText(text); // Транслитерируем
      }
    };

    // 1. ПРЕДУПРЕЖДАЮЩИЙ ТЕКСТ
    this.drawWarningText(pdf, data, prepareText);
    
    // 2. ТАБЛИЦА ПЛАТЕЖНОГО ПОРУЧЕНИЯ
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
    const warningLines = [
      prepareText('Внимание! Оплата данного счета означает согласие с условиями поставки товара. Уведомление об оплате обязательно, в'),
      prepareText('противном случае не гарантируется наличие товара на складе. Товар отпускается по факту прихода денег на р/с Поставщика,'),
      prepareText('самовывозом, при наличии доверенности и документов удостоверяющих личность.')
    ];
    
    warningLines.forEach((line, index) => {
      pdf.text(line, L.leftMargin, L.warning.startY + (index * L.warning.lineHeight));
    });
  }

  private static drawPaymentTable(pdf: jsPDF, data: InvoicePDFData, prepareText: (text: string) => string) {
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

  private static drawInvoiceTitle(pdf: jsPDF, data: InvoicePDFData, prepareText: (text: string) => string) {
    const L = this.LAYOUT;
    
    pdf.setFontSize(L.invoiceTitle.fontSize);
    pdf.setFont('helvetica', 'bold');
    
    // Правильное форматирование даты
    const date = new Date(data.invoiceDate);
    const day = date.getDate();
    const months = [
      'yanvarya', 'fevralya', 'marta', 'aprelya', 'maya', 'iyunya',
      'iyulya', 'avgusta', 'sentyabrya', 'oktyabrya', 'noyabrya', 'dekabrya'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const dateStr = `${day} ${month} ${year}`;
    
    const titleText = prepareText(`Schet na oplatu No ${data.invoiceNumber} ot ${dateStr}`);
    pdf.text(titleText, L.leftMargin, L.invoiceTitle.y);
    
    // Линия под заголовком
    const tableWidth = L.pageWidth - L.leftMargin - L.rightMargin;
    pdf.line(L.leftMargin, L.invoiceTitle.lineY, L.leftMargin + tableWidth, L.invoiceTitle.lineY);
  }

  private static drawPartiesInfo(pdf: jsPDF, data: InvoicePDFData, prepareText: (text: string) => string) {
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
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    
    const headers = ['No', 'Kod', 'Naimenovanie', 'Kol-vo', 'Ed.', 'Tsena', 'Summa'];
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
    pdf.text('Itogo:', totalX + 12.5, currentY + 5, { align: 'center' });
    pdf.text(this.formatMoney(data.totalAmount), 
             L.leftMargin + tableWidth - 2, currentY + 5, { align: 'right' });
    
    return currentY + ST.rowHeight;
  }

  private static drawTotalInfo(pdf: jsPDF, data: InvoicePDFData, startY: number, prepareText: (text: string) => string): number {
    const L = this.LAYOUT;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    const y1 = startY + 10;
    const y2 = y1 + 6;
    
    pdf.text(prepareText(`Vsego naimenovaniy ${data.services.length} na summu ${this.formatMoney(data.totalAmount)} KZT`), 
             L.leftMargin, y1);
    pdf.text(prepareText(`Vsego k oplate ${data.totalAmountWords}`), L.leftMargin, y2);
    
    return y2 + 15;
  }

  private static drawSignatureSection(pdf: jsPDF, signature: string | undefined, stamp: string | undefined, startY: number, prepareText: (text: string) => string) {
    const L = this.LAYOUT;
    const tableWidth = L.pageWidth - L.leftMargin - L.rightMargin;
    
    // Линия над подписью
    pdf.line(L.leftMargin, startY, L.leftMargin + tableWidth, startY);
    
    // Текст
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Ispolnitel:', L.leftMargin, startY + 12);
    pdf.text('/bukhgalter/', L.signature.signatureX + 30, startY + 12);
    
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}