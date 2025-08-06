import jsPDF from 'jspdf';

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
  static async generateInvoicePDF(data: InvoicePDFData, signature?: string, stamp?: string): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Set margins for proper A4 printing (like shown in the screenshot)
    const margin = 10;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - (margin * 2);
    
    // Set font
    pdf.setFont('helvetica', 'normal');
    
    // Warning text - smaller font, better spacing
    pdf.setFontSize(7);
    pdf.text('Внимание! Оплата данного счета означает согласие с условиями поставки товара.', margin, 15);
    pdf.text('Уведомление об оплате обязательно, в противном случае не гарантируется наличие товара на складе.', margin, 19);
    pdf.text('Товар отпускается по факту прихода денег на р/с Поставщика, самовывозом,', margin, 23);
    pdf.text('при наличии доверенности и документов удостоверяющих личность.', margin, 27);
    
    // Payment details header
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Образец платежного поручения', pageWidth/2, 40, { align: 'center' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    // Payment details table exactly like in sample
    const tableY = 45;
    const tableHeight = 40;
    const tableWidth = contentWidth;
    
    // Main table border
    pdf.rect(margin, tableY, tableWidth, tableHeight);
    
    // Vertical lines for columns
    pdf.line(margin + 120, tableY, margin + 120, tableY + 25); // ИИК column separator
    pdf.line(margin + 165, tableY, margin + 165, tableY + 25); // КБе column separator
    pdf.line(margin + 120, tableY + 25, margin + 120, tableY + tableHeight); // БИК column separator
    pdf.line(margin + 165, tableY + 25, margin + 165, tableY + tableHeight); // Code column separator
    
    // Horizontal lines
    pdf.line(margin, tableY + 8, margin + tableWidth, tableY + 8); // After headers
    pdf.line(margin, tableY + 18, margin + tableWidth, tableY + 18); // After supplier name
    pdf.line(margin, tableY + 25, margin + tableWidth, tableY + 25); // Before bank info
    pdf.line(margin, tableY + 33, margin + tableWidth, tableY + 33); // After bank headers
    
    // Headers row
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('Бенефициар:', margin + 1, tableY + 6);
    pdf.text('ИИК', margin + 140, tableY + 6, { align: 'center' });
    pdf.text('КБе', margin + 180, tableY + 6, { align: 'center' });
    
    // Supplier name and data
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.supplier.name, margin + 1, tableY + 14);
    pdf.text(data.supplier.iik, margin + 122, tableY + 14);
    pdf.text(data.supplier.kbe, margin + 167, tableY + 14);
    pdf.text(`БИН: ${data.supplier.bin}`, margin + 1, tableY + 22);
    
    // Bank info headers
    pdf.setFont('helvetica', 'bold');
    pdf.text('Банк бенефициара:', margin + 1, tableY + 29);
    pdf.text('БИК', margin + 140, tableY + 29, { align: 'center' });
    pdf.text('Код назначения платежа', margin + 167, tableY + 29);
    
    // Bank info data
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.supplier.bank, margin + 1, tableY + 37);
    pdf.text(data.supplier.bik, margin + 122, tableY + 37);
    pdf.text(data.supplier.paymentCode, margin + 167, tableY + 37);
    
    // Invoice title with line separator like in sample
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const titleY = 95;
    pdf.text(`Счет на оплату № ${data.invoiceNumber} от ${new Date(data.invoiceDate).toLocaleDateString('ru-RU')}`, margin, titleY);
    
    // Line under title
    pdf.line(margin, titleY + 5, margin + contentWidth, titleY + 5);
    
    // Parties information
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text(`Поставщик:    БИН / ИИН: ${data.supplier.bin}, ${data.supplier.name}, ${data.supplier.address}`, margin, 115, { maxWidth: 170 });
    pdf.text(`Покупатель: БИН / ИИН: ${data.buyer.bin}, ${data.buyer.name}, ${data.buyer.address}`, margin, 125, { maxWidth: 170 });
    pdf.text(`Договор:      ${data.contract}`, margin, 135);
    
    // Services table with proper borders like in sample
    const tableStartY = 145;
    const rowHeight = 10;
    const tableWidth = 170;
    const colWidths = [15, 25, 65, 20, 20, 25, 25]; // Column widths
    let colX = margin;
    
    // Draw outer table border
    pdf.rect(margin, tableStartY, tableWidth, rowHeight * (data.services.length + 2)); // +2 for header and total
    
    // Draw vertical lines for columns
    for (let i = 0; i < colWidths.length; i++) {
      pdf.line(colX, tableStartY, colX, tableStartY + rowHeight * (data.services.length + 2));
      colX += colWidths[i];
    }
    pdf.line(colX, tableStartY, colX, tableStartY + rowHeight * (data.services.length + 2)); // Last vertical line
    
    // Draw horizontal lines
    for (let i = 0; i <= data.services.length + 1; i++) {
      pdf.line(margin, tableStartY + rowHeight * i, margin + tableWidth, tableStartY + rowHeight * i);
    }
    
    // Table headers - bold and centered
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    
    pdf.text('№', margin + 7, tableStartY + 6, { align: 'center' });
    pdf.text('Код', margin + 27, tableStartY + 6, { align: 'center' });
    pdf.text('Наименование', margin + 77, tableStartY + 6, { align: 'center' });
    pdf.text('Кол-во', margin + 105, tableStartY + 6, { align: 'center' });
    pdf.text('Ед.', margin + 125, tableStartY + 6, { align: 'center' });
    pdf.text('Цена', margin + 147, tableStartY + 6, { align: 'center' });
    pdf.text('Сумма', margin + 172, tableStartY + 6, { align: 'center' });
    
    // Table rows
    pdf.setFont('helvetica', 'normal');
    let currentY = tableStartY + rowHeight;
    
    data.services.forEach((service, index) => {
      pdf.text((index + 1).toString(), margin + 7, currentY + 6, { align: 'center' });
      pdf.text('', margin + 27, currentY + 6); // Empty code column
      pdf.text(service.name, margin + 42, currentY + 6, { maxWidth: 60 });
      pdf.text(service.quantity.toString(), margin + 105, currentY + 6, { align: 'center' });
      pdf.text(service.unit, margin + 115, currentY + 6);
      pdf.text(service.price.toLocaleString('ru-RU') + ',00', margin + 165, currentY + 6, { align: 'right' });
      pdf.text(service.total.toLocaleString('ru-RU') + ',00', margin + 190, currentY + 6, { align: 'right' });
      
      currentY += rowHeight;
    });
    
    // Total row - bold
    pdf.setFont('helvetica', 'bold');
    pdf.text('Итого:', margin + 147, currentY + 6, { align: 'center' });
    pdf.text(data.totalAmount.toLocaleString('ru-RU') + ',00', margin + 190, currentY + 6, { align: 'right' });
    
    currentY += rowHeight + 10;
    
    // Summary with proper formatting
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Всего наименований ${data.services.length} на сумму ${data.totalAmount.toLocaleString('ru-RU')},00 KZT`, margin, currentY);
    pdf.text(`Всего к оплате ${data.totalAmountWords}`, margin, currentY + 8);
    
    // Add line separator above signature
    currentY += 25;
    pdf.line(margin, currentY, margin + contentWidth, currentY);
    
    // Signature section - exactly like in sample
    currentY += 15;
    pdf.text('Исполнитель:', margin, currentY + 10);
    pdf.text('/бухгалтер/', margin + 140, currentY + 10);
    
    // Add signature and stamp exactly like in sample
    if (signature) {
      try {
        pdf.addImage(signature, 'PNG', margin + 90, currentY - 5, 40, 15);
      } catch (error) {
        console.warn('Could not add signature image to PDF:', error);
      }
    }
    
    if (stamp) {
      try {
        pdf.addImage(stamp, 'PNG', margin + 40, currentY + 5, 30, 30);
      } catch (error) {
        console.warn('Could not add stamp image to PDF:', error);
      }
    }
    
    return pdf.output('blob');
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
