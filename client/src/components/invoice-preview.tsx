import { numberToWords } from "@/lib/number-to-words";

interface InvoiceData {
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
    id: number;
    name: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }[];
}

interface InvoicePreviewProps {
  invoiceData: InvoiceData;
  signature?: string | null;
  stamp?: string | null;
  signatureSettings: {
    width: number;
    height: number;
    position: string;
  };
  stampSettings: {
    size: number;
    position: string;
  };
}

export default function InvoicePreview({
  invoiceData,
  signature,
  stamp,
  signatureSettings,
  stampSettings
}: InvoicePreviewProps) {
  const getTotalAmount = () => {
    return invoiceData.services.reduce((sum, service) => sum + service.total, 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPositionClass = (position: string) => {
    switch (position) {
      case 'left': return 'justify-start';
      case 'center': return 'justify-center';
      case 'right': return 'justify-end';
      default: return 'justify-end';
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white border border-gray-300 shadow-lg" id="invoiceDocument">
      {/* Warning Text */}
      <div className="p-4 text-xs text-gray-700 border-b border-gray-200">
        <p className="text-center font-medium">
          Внимание! Оплата данного счета означает согласие с условиями поставки товара. 
          Уведомление об оплате обязательно, в противном случае не гарантируется наличие товара на складе. 
          Товар отпускается по факту прихода денег на р/с Поставщика, самовывозом, при наличии 
          доверенности и документов удостоверяющих личность.
        </p>
      </div>
      
      {/* Payment Details */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 mb-3 text-center">Образец платежного поручения</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-medium">Бенефициар:</span>
              <span className="font-medium">ИИК:</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>{invoiceData.supplier.name}</span>
              <span>{invoiceData.supplier.iik}</span>
            </div>
            <div className="mb-1">
              <span className="font-medium">БИН: </span>
              <span>{invoiceData.supplier.bin}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-medium">Кбе:</span>
              <span>{invoiceData.supplier.kbe}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="font-medium">БИК:</span>
              <span className="font-medium">Код назначения платежа:</span>
            </div>
            <div className="flex justify-between">
              <span>{invoiceData.supplier.bik}</span>
              <span>{invoiceData.supplier.paymentCode}</span>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <span className="font-medium">Банк бенефициара: </span>
          <span>{invoiceData.supplier.bank}</span>
        </div>
      </div>
      
      {/* Invoice Header */}
      <div className="p-6">
        <h1 className="text-xl font-bold text-center mb-6">
          Счет на оплату № {invoiceData.invoiceNumber} от {formatDate(invoiceData.invoiceDate)}
        </h1>
        
        {/* Parties Information */}
        <div className="mb-6 space-y-2 text-sm">
          <div>
            <span className="font-medium">Поставщик:</span>
            {" "}БИН / ИИН: {invoiceData.supplier.bin}, {invoiceData.supplier.name}, {invoiceData.supplier.address}
          </div>
          <div>
            <span className="font-medium">Покупатель:</span>
            {" "}БИН / ИИН: {invoiceData.buyer.bin}, {invoiceData.buyer.name}, {invoiceData.buyer.address}
          </div>
          <div>
            <span className="font-medium">Договор:</span>
            {" "}{invoiceData.contract}
          </div>
        </div>
        
        {/* Services Table */}
        <table className="w-full border border-gray-400 text-sm mb-6">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-400 px-2 py-2 text-center">№</th>
              <th className="border border-gray-400 px-2 py-2 text-center">Код</th>
              <th className="border border-gray-400 px-2 py-2 text-center">Наименование</th>
              <th className="border border-gray-400 px-2 py-2 text-center">Кол-во</th>
              <th className="border border-gray-400 px-2 py-2 text-center">Ед.</th>
              <th className="border border-gray-400 px-2 py-2 text-center">Цена</th>
              <th className="border border-gray-400 px-2 py-2 text-center">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.services.map((service, index) => (
              <tr key={service.id}>
                <td className="border border-gray-400 px-2 py-2 text-center">{index + 1}</td>
                <td className="border border-gray-400 px-2 py-2 text-center"></td>
                <td className="border border-gray-400 px-2 py-2">{service.name}</td>
                <td className="border border-gray-400 px-2 py-2 text-center">{service.quantity}</td>
                <td className="border border-gray-400 px-2 py-2 text-center">{service.unit}</td>
                <td className="border border-gray-400 px-2 py-2 text-right">{service.price.toLocaleString('ru-RU')}</td>
                <td className="border border-gray-400 px-2 py-2 text-right">{service.total.toLocaleString('ru-RU')}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={6} className="border border-gray-400 px-2 py-2 text-right font-medium">Итого:</td>
              <td className="border border-gray-400 px-2 py-2 text-right font-bold">{getTotalAmount().toLocaleString('ru-RU')}</td>
            </tr>
          </tbody>
        </table>
        
        {/* Summary */}
        <div className="mb-6 text-sm">
          <p>Всего наименований {invoiceData.services.length} на сумму {getTotalAmount().toLocaleString('ru-RU')} KZT</p>
          <p>Всего к оплате {numberToWords(getTotalAmount())}</p>
        </div>
        
        {/* Signature Area */}
        <div className="flex justify-between items-end mt-12">
          <div className="text-sm">
            Исполнитель: _________________________________ /бухгалтер/
          </div>
          
          {/* Signature and Stamp */}
          <div className="flex items-end space-x-4">
            {signature && (
              <div className={`flex ${getPositionClass(signatureSettings.position)}`}>
                <img 
                  src={signature} 
                  alt="Signature" 
                  style={{
                    width: `${signatureSettings.width}px`,
                    height: `${signatureSettings.height}px`,
                    objectFit: 'contain'
                  }}
                />
              </div>
            )}
            {stamp && (
              <div className={`flex ${getPositionClass(stampSettings.position)}`}>
                <img 
                  src={stamp} 
                  alt="Stamp" 
                  style={{
                    width: `${stampSettings.size}px`,
                    height: `${stampSettings.size}px`,
                    objectFit: 'contain'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}