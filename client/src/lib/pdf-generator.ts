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
    
    // Create a bordered box for payment details
    pdf.rect(margin, 45, contentWidth, 35);
    
    // Beneficiary info - exact layout like in the sample
    pdf.text('Бенефициар:', margin + 5, 52);
    pdf.text('ИИК', margin + 120, 52);
    pdf.text('Кбе', margin + 160, 52);
    pdf.text(data.supplier.name, margin + 5, 57);
    pdf.text(data.supplier.iik, margin + 120, 57);
    pdf.text(data.supplier.kbe, margin + 160, 57);
    pdf.text(`БИН: ${data.supplier.bin}`, margin + 5, 62);
    
    pdf.text('Банк бенефициара:', margin + 5, 67);
    pdf.text('БИК', margin + 120, 67);
    pdf.text('Код назначения платежа', margin + 160, 67);
    pdf.text(data.supplier.bank, margin + 5, 72);
    pdf.text(data.supplier.bik, margin + 120, 72);
    pdf.text(data.supplier.paymentCode, margin + 160, 72);
    
    // Invoice title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Счет на оплату № ${data.invoiceNumber} от ${new Date(data.invoiceDate).toLocaleDateString('ru-RU')}`, pageWidth/2, 95, { align: 'center' });
    
    // Parties information
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text(`Поставщик: БИН / ИИН: ${data.supplier.bin}, ${data.supplier.name}, ${data.supplier.address}`, 20, 115, { maxWidth: 170 });
    pdf.text(`Покупатель: БИН / ИИН: ${data.buyer.bin}, ${data.buyer.name}, ${data.buyer.address}`, 20, 125, { maxWidth: 170 });
    pdf.text(`Договор: ${data.contract}`, 20, 135);
    
    // Services table
    const tableStartY = 145;
    const rowHeight = 8;
    
    // Table headers
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.rect(20, tableStartY, 170, rowHeight);
    
    pdf.text('№', 25, tableStartY + 5);
    pdf.text('Код', 35, tableStartY + 5);
    pdf.text('Наименование', 70, tableStartY + 5);
    pdf.text('Кол-во', 120, tableStartY + 5);
    pdf.text('Ед.', 135, tableStartY + 5);
    pdf.text('Цена', 150, tableStartY + 5);
    pdf.text('Сумма', 170, tableStartY + 5);
    
    // Table rows
    pdf.setFont('helvetica', 'normal');
    let currentY = tableStartY + rowHeight;
    
    data.services.forEach((service, index) => {
      pdf.rect(20, currentY, 170, rowHeight);
      
      pdf.text((index + 1).toString(), 25, currentY + 5);
      pdf.text('', 35, currentY + 5); // Code column
      pdf.text(service.name, 40, currentY + 5, { maxWidth: 75 });
      pdf.text(service.quantity.toString(), 125, currentY + 5, { align: 'center' });
      pdf.text(service.unit, 135, currentY + 5);
      pdf.text(service.price.toLocaleString('ru-RU'), 155, currentY + 5, { align: 'right' });
      pdf.text(service.total.toLocaleString('ru-RU'), 185, currentY + 5, { align: 'right' });
      
      currentY += rowHeight;
    });
    
    // Total row
    pdf.setFont('helvetica', 'bold');
    pdf.rect(20, currentY, 170, rowHeight);
    pdf.text('Итого:', 155, currentY + 5, { align: 'right' });
    pdf.text(data.totalAmount.toLocaleString('ru-RU'), 185, currentY + 5, { align: 'right' });
    
    currentY += rowHeight + 10;
    
    // Summary
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Всего наименований ${data.services.length} на сумму ${data.totalAmount.toLocaleString('ru-RU')} KZT`, 20, currentY);
    pdf.text(`Всего к оплате ${data.totalAmountWords}`, 20, currentY + 5);
    
    // Signature line
    currentY += 20;
    pdf.text('Исполнитель: _________________________________ /бухгалтер/', 20, currentY);
    
    // Add signature and stamp if provided
    if (signature) {
      try {
        pdf.addImage(signature, 'PNG', 120, currentY - 10, 30, 10);
      } catch (error) {
        console.warn('Could not add signature image to PDF:', error);
      }
    }
    
    if (stamp) {
      try {
        pdf.addImage(stamp, 'PNG', 160, currentY - 15, 15, 15);
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
