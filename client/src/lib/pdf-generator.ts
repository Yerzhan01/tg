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
    
    // Create a bordered table for payment details like in the sample
    const tableWidth = contentWidth;
    const tableHeight = 35;
    pdf.rect(margin, 45, tableWidth, tableHeight);
    
    // Draw internal lines
    pdf.line(margin + 130, 45, margin + 130, 45 + tableHeight); // ИИК column
    pdf.line(margin + 170, 45, margin + 170, 45 + tableHeight); // КБЕ column
    pdf.line(margin, 58, margin + tableWidth, 58); // Horizontal line after headers
    pdf.line(margin, 68, margin + tableWidth, 68); // Horizontal line after second row
    pdf.line(margin + 130, 68, margin + 130, 80); // БИК column divider
    pdf.line(margin + 170, 68, margin + 170, 80); // Payment code column divider
    
    // Headers - bold
    pdf.setFont('helvetica', 'bold');
    pdf.text('Бенефициар:', margin + 2, 52);
    pdf.text('ИИК', margin + 132, 52);
    pdf.text('КБе', margin + 172, 52);
    
    // Data rows - normal font
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.supplier.name, margin + 2, 57);
    pdf.text(data.supplier.iik, margin + 132, 57);
    pdf.text(data.supplier.kbe, margin + 172, 57);
    pdf.text(`БИН: ${data.supplier.bin}`, margin + 2, 62);
    
    // Third row
    pdf.setFont('helvetica', 'bold');
    pdf.text('Банк бенефициара:', margin + 2, 73);
    pdf.text('БИК', margin + 132, 73);
    pdf.text('Код назначения платежа', margin + 172, 73);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.supplier.bank, margin + 2, 78);
    pdf.text(data.supplier.bik, margin + 132, 78);
    pdf.text(data.supplier.paymentCode, margin + 172, 78);
    
    // Invoice title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Счет на оплату № ${data.invoiceNumber} от ${new Date(data.invoiceDate).toLocaleDateString('ru-RU')}`, pageWidth/2, 95, { align: 'center' });
    
    // Add line separator
    pdf.line(margin, 105, margin + contentWidth, 105);
    
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
