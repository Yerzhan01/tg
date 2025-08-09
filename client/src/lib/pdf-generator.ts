import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { registerPTSansFont } from './fonts';
import { convertNumberToKazakhWords } from './number-converter';

// Расширение типов для jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: { finalY: number };
  }
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
  // КОНСТАНТЫ ЛЕЙАУТА (немного переорганизованы для ясности)
  private static readonly L = {
    MARGIN: 20,
    PAGE_WIDTH: 210,
    get CONTENT_WIDTH() {
      return this.PAGE_WIDTH - this.MARGIN * 2;
    },
    FONT_SIZE: {
      S: 8,
      M: 9,
      L: 12,
    },
    LINE_HEIGHT_FACTOR: 1.5,
  };

  /**
   * Главный метод для генерации PDF
   */
  static async generateInvoicePDF(
    data: InvoicePDFData,
    signature?: string,
    stamp?: string
  ): Promise<jsPDF> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Регистрация шрифтов для кириллицы и казахского языка
    registerPTSansFont(pdf);
    pdf.setFont('PTSans', 'normal');

    let currentY = 15; // Начинаем с верхнего отступа

    this.drawWarningText(pdf, currentY);
    currentY += 15;

    this.drawPaymentTable(pdf, data, this.L.MARGIN, currentY);
    currentY += 25;

    this.drawInvoiceTitle(pdf, data, currentY);
    currentY += 12;

    currentY = this.drawPartiesInfo(pdf, data, currentY);
    currentY += 5;

    currentY = this.drawServicesTable(pdf, data, currentY);
    currentY += 10;

    currentY = this.drawTotalInfo(pdf, data, currentY);
    currentY += 15;

    this.drawSignatureSection(pdf, data, signature, stamp, currentY);

    return pdf;
  }

  // =================================================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ОТРИСОВКИ (ПЕРЕРАБОТАНЫ)
  // =================================================================

  private static drawWarningText(pdf: jsPDF, y: number) {
    pdf.setFontSize(this.L.FONT_SIZE.S);
    pdf.setFont('PTSans', 'normal');
    const text =
      'Внимание! Оплата данного счета означает согласие с условиями поставки товара. Уведомление об оплате обязательно, в противном случае не гарантируется наличие товара на складе. Товар отпускается по факту прихода денег на р/с Поставщика, самовывозом, при наличии документа, удостоверяющего личность получателя.';
    const lines = pdf.splitTextToSize(text, this.L.CONTENT_WIDTH);
    pdf.text(lines, this.L.MARGIN, y);
  }

  private static drawPaymentTable(pdf: jsPDF, data: InvoicePDFData, x: number, y: number) {
    pdf.setFontSize(this.L.FONT_SIZE.M);
    pdf.setFont('PTSans', 'bold');
    pdf.text('Образец платежного поручения', x, y - 5);
    pdf.setFont('PTSans', 'normal');

    const col1Width = 85;
    const col2Width = 50;
    const col3Width = 35;
    const rowHeight = 10;

    // Отрисовка ячеек вручную для точного контроля
    pdf.setLineWidth(0.2);
    // Внешняя рамка
    pdf.rect(x, y, this.L.CONTENT_WIDTH, rowHeight * 2);
    // Горизонтальная линия
    pdf.line(x, y + rowHeight, x + this.L.CONTENT_WIDTH, y + rowHeight);
    // Вертикальные линии
    pdf.line(x + col1Width, y, x + col1Width, y + rowHeight * 2);
    pdf.line(x + col1Width + col2Width, y, x + col1Width + col2Width, y + rowHeight * 2);

    // Заполнение текстом с переносами
    this.drawWrappedTextInCell(pdf, 'Бенефициар:', x, y, col1Width, rowHeight, { halign: 'left', fontStyle: 'bold' });
    this.drawWrappedTextInCell(pdf, `${data.supplier.name}\nБИН: ${data.supplier.bin}`, x, y, col1Width, rowHeight, { halign: 'left', isMultiline: true });

    this.drawWrappedTextInCell(pdf, 'ИИК', x + col1Width, y, col2Width, rowHeight / 2, { halign: 'center', fontStyle: 'bold' });
    this.drawWrappedTextInCell(pdf, data.supplier.iik, x + col1Width, y + rowHeight / 2, col2Width, rowHeight / 2, { halign: 'center' });

    this.drawWrappedTextInCell(pdf, 'КБе', x + col1Width + col2Width, y, col3Width, rowHeight / 2, { halign: 'center', fontStyle: 'bold' });
    this.drawWrappedTextInCell(pdf, data.supplier.kbe, x + col1Width + col2Width, y + rowHeight / 2, col3Width, rowHeight / 2, { halign: 'center' });

    this.drawWrappedTextInCell(pdf, 'Банк бенефициара:', x, y + rowHeight, col1Width, rowHeight, { halign: 'left', fontStyle: 'bold' });
    this.drawWrappedTextInCell(pdf, data.supplier.bank, x, y + rowHeight, col1Width, rowHeight, { halign: 'left', isMultiline: true, yOffset: 4 });

    this.drawWrappedTextInCell(pdf, 'БИК', x + col1Width, y + rowHeight, col2Width, rowHeight / 2, { halign: 'center', fontStyle: 'bold' });
    this.drawWrappedTextInCell(pdf, data.supplier.bik, x + col1Width, y + rowHeight + rowHeight / 2, col2Width, rowHeight / 2, { halign: 'center' });

    this.drawWrappedTextInCell(pdf, 'Код назначения платежа', x + col1Width + col2Width, y + rowHeight, col3Width, rowHeight / 2, { halign: 'center', fontStyle: 'bold', fontSize: 7 });
    this.drawWrappedTextInCell(pdf, data.supplier.paymentCode, x + col1Width + col2Width, y + rowHeight + rowHeight / 2, col3Width, rowHeight / 2, { halign: 'center' });
  }

  private static drawInvoiceTitle(pdf: jsPDF, data: InvoicePDFData, y: number) {
    pdf.setFontSize(this.L.FONT_SIZE.L);
    pdf.setFont('PTSans', 'bold');
    
    const date = new Date(data.invoiceDate);
    const dateStr = `${date.getDate()} ${['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'][date.getMonth()]} ${date.getFullYear()}`;
    
    const title = `Счет на оплату № ${data.invoiceNumber} от ${dateStr} г.`;
    pdf.text(title, this.L.MARGIN, y);
    pdf.setLineWidth(0.5);
    pdf.line(this.L.MARGIN, y + 2, this.L.PAGE_WIDTH - this.L.MARGIN, y + 2);
  }

  private static drawPartiesInfo(pdf: jsPDF, data: InvoicePDFData, y: number): number {
    let currentY = y;
    pdf.setFontSize(this.L.FONT_SIZE.M);
    pdf.setFont('PTSans', 'normal');
    const labelWidth = 30;

    // Поставщик
    pdf.setFont('PTSans', 'bold');
    pdf.text('Поставщик:', this.L.MARGIN, currentY);
    pdf.setFont('PTSans', 'normal');
    const supplierText = `БИН/ИИН ${data.supplier.bin}, ${data.supplier.name}, ${data.supplier.address}`;
    const supplierLines = pdf.splitTextToSize(supplierText, this.L.CONTENT_WIDTH - labelWidth);
    pdf.text(supplierLines, this.L.MARGIN + labelWidth, currentY);
    currentY += supplierLines.length * this.L.FONT_SIZE.M * 0.5 + 4; // Динамический отступ

    // Покупатель
    pdf.setFont('PTSans', 'bold');
    pdf.text('Покупатель:', this.L.MARGIN, currentY);
    pdf.setFont('PTSans', 'normal');
    const buyerText = `БИН/ИИН ${data.buyer.bin}, ${data.buyer.name}, ${data.buyer.address}`;
    const buyerLines = pdf.splitTextToSize(buyerText, this.L.CONTENT_WIDTH - labelWidth);
    pdf.text(buyerLines, this.L.MARGIN + labelWidth, currentY);
    currentY += buyerLines.length * this.L.FONT_SIZE.M * 0.5 + 4;

    // Договор
    pdf.setFont('PTSans', 'bold');
    pdf.text('Договор:', this.L.MARGIN, currentY);
    pdf.setFont('PTSans', 'normal');
    pdf.text(data.contract, this.L.MARGIN + labelWidth, currentY);
    currentY += this.L.FONT_SIZE.M * 0.5 + 4;

    return currentY;
  }
  
  private static drawServicesTable(pdf: jsPDF, data: InvoicePDFData, y: number): number {
    // Используем jsPDF-AutoTable для надежной отрисовки таблицы
    const startY = y;
    
    const head = [['№', 'Код', 'Наименование', 'Кол-во', 'Ед.', 'Цена', 'Сумма']];
    const body = data.services.map((s, i) => [
      (i + 1).toString(),
      '', // Код пустой
      s.name,
      s.quantity.toFixed(2),
      s.unit,
      this.formatMoney(s.price),
      this.formatMoney(s.total)
    ]);
    
    pdf.autoTable({
        head: head,
        body: body,
        startY: startY,
        theme: 'grid',
        styles: {
            font: 'PTSans',
            fontSize: this.L.FONT_SIZE.S,
            lineWidth: 0.2,
            lineColor: [0, 0, 0],
        },
        headStyles: {
            fillColor: [230, 230, 230],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 }, // № - 12mm
            1: { halign: 'center', cellWidth: 15 }, // Код - 15mm
            2: { halign: 'left', cellWidth: 82 },   // Наименование - 82mm
            3: { halign: 'right', cellWidth: 15 },  // Кол-во - 15mm
            4: { halign: 'center', cellWidth: 20 }, // Ед. - 20mm
            5: { halign: 'right', cellWidth: 32 },  // Цена - 32mm (с отступом 3mm справа)
            6: { halign: 'right', cellWidth: 34 },  // Сумма - 34mm (с отступом 3mm справа)
        },
        foot: [
            [
              { content: 'Итого:', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
              { content: this.formatMoney(data.totalAmount), styles: { halign: 'right', fontStyle: 'bold' } }
            ]
        ],
        footStyles: {
            fillColor: [255, 255, 255],
            fontStyle: 'bold',
        }
    });

    return pdf.lastAutoTable.finalY;
  }

  private static drawTotalInfo(pdf: jsPDF, data: InvoicePDFData, y: number): number {
      pdf.setFontSize(this.L.FONT_SIZE.M);
      pdf.setFont('PTSans', 'normal');
      const text1 = `Всего наименований ${data.services.length}, на сумму ${this.formatMoney(data.totalAmount)} KZT`;
      pdf.text(text1, this.L.MARGIN, y);
      
      pdf.setFont('PTSans', 'bold');
      const text2 = `Всего к оплате: ${data.totalAmountWords}`;
      pdf.text(text2, this.L.MARGIN, y + 5);
      
      return y + 5;
  }
  
  private static drawSignatureSection(pdf: jsPDF, data: InvoicePDFData, signature: string | undefined, stamp: string | undefined, y: number) {
      pdf.setFont('PTSans', 'normal');
      pdf.setFontSize(this.L.FONT_SIZE.M);

      const signatureLineY = y + 15;
      pdf.text('Исполнитель:', this.L.MARGIN, signatureLineY);
      pdf.line(this.L.MARGIN + 30, signatureLineY, this.L.MARGIN + 90, signatureLineY);
      pdf.text(`/ (${data.supplier.name})`, this.L.MARGIN + 95, signatureLineY);
      
      if (stamp) {
          pdf.addImage(stamp, 'PNG', this.L.MARGIN + 40, signatureLineY - 20, 30, 30);
      }
      if (signature) {
          pdf.addImage(signature, 'PNG', this.L.MARGIN + 45, signatureLineY - 10, 40, 15);
      }
  }

  // =================================================================
  // УТИЛИТЫ
  // =================================================================

  /**
   * УНИВЕРСАЛЬНАЯ ФУНКЦИЯ для отрисовки текста в ячейке с переносами и выравниванием
   */
  private static drawWrappedTextInCell(
    pdf: jsPDF,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      halign?: 'left' | 'center' | 'right';
      valign?: 'top' | 'middle' | 'bottom';
      fontStyle?: 'normal' | 'bold';
      fontSize?: number;
      isMultiline?: boolean;
      yOffset?: number; // Дополнительный сдвиг по Y для многострочного текста
    } = {}
  ) {
    const { halign = 'left', valign = 'middle', fontStyle = 'normal', fontSize = this.L.FONT_SIZE.S, isMultiline = false, yOffset = 0 } = options;
    
    pdf.setFont('PTSans', fontStyle);
    pdf.setFontSize(fontSize);
    
    const lines = pdf.splitTextToSize(text, width - 4); // -4px для отступов
    const textHeight = lines.length * fontSize * 0.35; // Приблизительная высота текста
    
    let textY: number;
    switch (valign) {
        case 'top':
            textY = y + 3;
            break;
        case 'bottom':
            textY = y + height - textHeight - 3;
            break;
        case 'middle':
        default:
            textY = y + height / 2 - textHeight / 2;
            break;
    }
    
    let textX: number;
    switch (halign) {
        case 'center':
            textX = x + width / 2;
            break;
        case 'right':
            textX = x + width - 2;
            break;
        case 'left':
        default:
            textX = x + 2;
            break;
    }
    
    if (isMultiline) {
        const titleLine = text.split('\n')[0];
        const valueLine = text.split('\n')[1];
        pdf.setFont('PTSans', 'bold');
        pdf.text(titleLine, textX, y + 4, { align: halign });
        pdf.setFont('PTSans', 'normal');
        pdf.text(valueLine || '', textX, y + 8, { align: halign });
    } else {
        // Исправляем вызов pdf.text для совместимости с jsPDF
        if (Array.isArray(lines)) {
          lines.forEach((line, index) => {
            pdf.text(line, textX, textY + yOffset + (index * fontSize * 0.35), { align: halign });
          });
        } else {
          pdf.text(lines, textX, textY + yOffset, { align: halign });
        }
    }
  }

  private static formatMoney(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  static downloadPDF(pdf: jsPDF, filename: string) {
    pdf.save(filename);
  }

  // Функция для создания PDF с данными из формы (возвращает blob для обратной совместимости)
  static async createInvoicePDF(invoiceData: any, signatureFile?: File, stampFile?: File): Promise<Blob> {
    // Конвертируем данные в формат PDFData
    const pdfData: InvoicePDFData = {
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate,
      contract: invoiceData.contract || 'Без договора',
      supplier: {
        name: invoiceData.supplier.name,
        bin: invoiceData.supplier.bin,
        address: invoiceData.supplier.address,
        bank: invoiceData.supplier.bank,
        bik: invoiceData.supplier.bik,
        iik: invoiceData.supplier.iik,
        kbe: invoiceData.supplier.kbe || '',
        paymentCode: invoiceData.supplier.paymentCode || ''
      },
      buyer: {
        name: invoiceData.buyer.name,
        bin: invoiceData.buyer.bin,
        address: invoiceData.buyer.address
      },
      services: invoiceData.items?.map((item: any) => ({
        name: item.name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        price: parseFloat(item.price),
        total: parseFloat(item.total)
      })) || [],
      totalAmount: parseFloat(invoiceData.totalAmount || '0'),
      totalAmountWords: convertNumberToKazakhWords(parseFloat(invoiceData.totalAmount || '0'))
    };

    // Конвертируем файлы в base64 если есть
    let signatureBase64: string | undefined;
    let stampBase64: string | undefined;

    if (signatureFile) {
      signatureBase64 = await this.fileToBase64(signatureFile);
    }

    if (stampFile) {
      stampBase64 = await this.fileToBase64(stampFile);
    }

    const pdf = await this.generateInvoicePDF(pdfData, signatureBase64, stampBase64);
    return pdf.output('blob');
  }

  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Убираем data:image/...;base64,
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}