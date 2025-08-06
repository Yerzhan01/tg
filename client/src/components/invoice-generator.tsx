import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { 
  FileText, MessageCircle, LogOut, Edit3, Building, PenTool, Eye, 
  Plus, Trash2, Upload, X, Bot, ExternalLink, CheckCircle, Printer, Send, List, Download
} from "lucide-react";
import { numberToWords } from "@/lib/number-to-words";
import { validateBinIin, validateIik, validateBik, validateRequiredField, validateAmount } from "@/lib/validation";
import { PDFGenerator, type InvoicePDFData } from "@/lib/pdf-generator";
import { ExcelGenerator, type ExcelInvoiceData } from "@/lib/excel-generator";

type Mode = 'edit' | 'supplier' | 'signature' | 'preview';

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

export default function InvoiceGenerator() {
  const [currentMode, setCurrentMode] = useState<Mode>('edit');
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: '2',
    invoiceDate: new Date().toISOString().split('T')[0],
    contract: 'Без договора',
    supplier: {
      name: 'Индивидуальный предприниматель Sonar Group',
      bin: '960517300238',
      address: 'г. Шымкент, ул. Микрорайон 8 д. 10 кв. (офис)',
      bank: 'АО "Народный Банк Казахстана"',
      bik: 'HSBKKZKX',
      iik: 'KZ53601A291000781231',
      kbe: '19',
      paymentCode: '859'
    },
    buyer: {
      name: 'ТОО "White Label"',
      bin: '211240012284',
      address: 'Казахстан, Алматы. Хаджимукана 22/6'
    },
    services: [
      {
        id: 1,
        name: 'Интеграция чат ботов',
        quantity: 1.0,
        unit: 'Услуга',
        price: 300000,
        total: 300000
      }
    ]
  });

  const [signature, setSignature] = useState<string | null>(null);
  const [stamp, setStamp] = useState<string | null>(null);
  const [signatureSettings, setSignatureSettings] = useState({
    width: 200,
    height: 70,
    position: 'right'
  });
  const [stampSettings, setStampSettings] = useState({
    size: 100,
    position: 'left'
  });
  const [showTelegramBotModal, setShowTelegramBotModal] = useState(false);

  const signatureInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      window.location.reload();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/upload/${type}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (variables.type === 'signature') {
        setSignature(data.url);
      } else {
        setStamp(data.url);
      }
      toast({
        title: "Файл загружен",
        description: "Изображение успешно загружено",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить файл",
        variant: "destructive",
      });
    },
  });

  const updateField = (section: keyof InvoiceData, field: string, value: any) => {
    setInvoiceData(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' ? {
        ...prev[section],
        [field]: value
      } : value
    }));
  };

  const updateService = (index: number, field: string, value: any) => {
    const newServices = [...invoiceData.services];
    newServices[index] = {
      ...newServices[index],
      [field]: value
    };
    
    if (field === 'quantity' || field === 'price') {
      newServices[index].total = newServices[index].quantity * newServices[index].price;
    }
    
    setInvoiceData(prev => ({
      ...prev,
      services: newServices
    }));
  };

  const addService = () => {
    const newService = {
      id: invoiceData.services.length + 1,
      name: '',
      quantity: 1.0,
      unit: 'Услуга',
      price: 0,
      total: 0
    };
    
    setInvoiceData(prev => ({
      ...prev,
      services: [...prev.services, newService]
    }));
  };

  const removeService = (index: number) => {
    setInvoiceData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const getTotalAmount = () => {
    return invoiceData.services.reduce((sum, service) => sum + service.total, 0);
  };

  const handleImageUpload = (file: File | null, type: 'signature' | 'stamp') => {
    if (file && file.type.startsWith('image/')) {
      uploadMutation.mutate({ file, type });
    }
  };

  const removeImage = (type: 'signature' | 'stamp') => {
    if (type === 'signature') {
      setSignature(null);
    } else {
      setStamp(null);
    }
  };

  const saveInvoiceToDatabase = async () => {
    try {
      // Prepare invoice data for saving
      const invoiceToSave = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        contract: invoiceData.contract,
        totalAmount: getTotalAmount(),
        totalAmountWords: numberToWords(getTotalAmount()),
        status: 'draft' as const,
        supplier: {
          name: invoiceData.supplier.name,
          bin: invoiceData.supplier.bin,
          address: invoiceData.supplier.address,
          bank: invoiceData.supplier.bank,
          bik: invoiceData.supplier.bik,
          iik: invoiceData.supplier.iik,
          paymentCode: invoiceData.supplier.paymentCode
        },
        buyer: {
          name: invoiceData.buyer.name,
          bin: invoiceData.buyer.bin,
          address: invoiceData.buyer.address
        },
        items: invoiceData.services.map(service => ({
          name: service.name,
          quantity: service.quantity,
          unit: service.unit,
          price: service.price,
          total: service.total
        }))
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceToSave)
      });

      if (!response.ok) {
        throw new Error('Failed to save invoice');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving invoice:', error);
      return null;
    }
  };

  const printInvoice = () => {
    window.print();
  };

  const validateInvoiceData = (): string[] => {
    const errors: string[] = [];
    
    // Проверка обязательных полей
    if (!validateRequiredField(invoiceData.invoiceNumber)) {
      errors.push('Номер счета обязателен');
    }
    if (!validateRequiredField(invoiceData.invoiceDate)) {
      errors.push('Дата счета обязательна');
    }
    if (!validateRequiredField(invoiceData.buyer.name)) {
      errors.push('Наименование покупателя обязательно');
    }
    if (!validateRequiredField(invoiceData.buyer.bin)) {
      errors.push('БИН/ИИН покупателя обязателен');
    }
    if (!validateRequiredField(invoiceData.buyer.address)) {
      errors.push('Адрес покупателя обязателен');
    }
    
    // Проверка формата данных
    if (invoiceData.buyer.bin && !validateBinIin(invoiceData.buyer.bin)) {
      errors.push('БИН/ИИН покупателя должен содержать 12 цифр');
    }
    if (invoiceData.supplier.bin && !validateBinIin(invoiceData.supplier.bin)) {
      errors.push('БИН/ИИН поставщика должен содержать 12 цифр');
    }
    if (invoiceData.supplier.iik && !validateIik(invoiceData.supplier.iik)) {
      errors.push('ИИК должен начинаться с KZ и содержать 20 символов');
    }
    if (invoiceData.supplier.bik && !validateBik(invoiceData.supplier.bik)) {
      errors.push('БИК должен содержать 8 символов');
    }
    
    // Проверка услуг
    if (invoiceData.services.length === 0) {
      errors.push('Добавьте хотя бы одну услугу');
    }
    
    invoiceData.services.forEach((service, index) => {
      if (!validateRequiredField(service.name)) {
        errors.push(`Наименование услуги ${index + 1} обязательно`);
      }
      if (!validateAmount(service.quantity)) {
        errors.push(`Количество услуги ${index + 1} должно быть больше 0`);
      }
      if (!validateAmount(service.price)) {
        errors.push(`Цена услуги ${index + 1} должна быть больше 0`);
      }
    });
    
    return errors;
  };

  const downloadPDF = async () => {
    try {
      // Валидация данных перед генерацией PDF
      const validationErrors = validateInvoiceData();
      if (validationErrors.length > 0) {
        toast({
          title: "Ошибки валидации",
          description: validationErrors.join(', '),
          variant: "destructive"
        });
        return;
      }
      
      // Prepare PDF data using the improved PDF generator
      const pdfData: InvoicePDFData = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        contract: invoiceData.contract,
        supplier: invoiceData.supplier,
        buyer: invoiceData.buyer,
        services: invoiceData.services.map(service => ({
          name: service.name,
          quantity: service.quantity,
          unit: service.unit,
          price: service.price,
          total: service.total
        })),
        totalAmount: getTotalAmount(),
        totalAmountWords: numberToWords(getTotalAmount())
      };

      // Generate PDF using the improved PDF generator
      const pdf = await PDFGenerator.generateInvoicePDF(pdfData, signature || undefined, stamp || undefined);
      
      // Download the PDF
      const filename = `Счет_${invoiceData.invoiceNumber}_${invoiceData.invoiceDate}.pdf`;
      PDFGenerator.downloadPDF(pdf, filename);
      
      toast({
        title: "PDF скачан",
        description: "Файл сохранен на ваше устройство",
      });
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast({
        title: "Ошибка скачивания",
        description: "Не удалось создать PDF файл",
        variant: "destructive"
      });
    }
  };

  const sendToTelegram = async () => {
    try {
      // Валидация данных перед отправкой
      const validationErrors = validateInvoiceData();
      if (validationErrors.length > 0) {
        toast({
          title: "Ошибки валидации",
          description: validationErrors.join(', '),
          variant: "destructive"
        });
        return;
      }
      
      // First save the invoice to the database
      const savedInvoice = await saveInvoiceToDatabase();
      console.log('Saved invoice:', savedInvoice);
      
      if (!savedInvoice) {
        toast({
          title: "Ошибка",
          description: "Не удалось сохранить счет",
          variant: "destructive"
        });
        return;
      }

      // Prepare PDF data using the improved PDF generator
      const pdfData: InvoicePDFData = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        contract: invoiceData.contract,
        supplier: invoiceData.supplier,
        buyer: invoiceData.buyer,
        services: invoiceData.services.map(service => ({
          name: service.name,
          quantity: service.quantity,
          unit: service.unit,
          price: service.price,
          total: service.total
        })),
        totalAmount: getTotalAmount(),
        totalAmountWords: numberToWords(getTotalAmount())
      };

      // Generate PDF using the improved PDF generator
      const pdf = await PDFGenerator.generateInvoicePDF(pdfData, signature || undefined, stamp || undefined);
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        try {
          console.log('Sending to Telegram:', {
            invoiceId: savedInvoice.id,
            pdfDataLength: base64data.length
          });
          
          const response = await fetch('/api/telegram/send-invoice', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              invoiceId: savedInvoice.id,
              pdfData: base64data
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send invoice');
          }
          
          const responseData = await response.json();
          console.log('Telegram send response:', responseData);
          
          toast({
            title: "Успешно отправлено!",
            description: "PDF файл отправлен в ваш Telegram",
            variant: "default"
          });
        } catch (error: any) {
          console.error('Failed to send to Telegram:', error);
          toast({
            title: "Ошибка отправки",
            description: error.message || 'Неизвестная ошибка',
            variant: "destructive"
          });
        }
      };
      reader.readAsDataURL(pdf as Blob);
      
    } catch (error) {
      console.error('Failed to generate PDF for Telegram:', error);
      toast({
        title: "Ошибка генерации",
        description: "Не удалось создать PDF файл",
        variant: "destructive"
      });
    }
  };

  const downloadExcel = async () => {
    try {
      // Валидация данных перед генерацией Excel
      const validationErrors = validateInvoiceData();
      if (validationErrors.length > 0) {
        toast({
          title: "Ошибки валидации",
          description: validationErrors.join(', '),
          variant: "destructive"
        });
        return;
      }
      
      // Подготавливаем данные для Excel
      const excelData: ExcelInvoiceData = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        contract: invoiceData.contract,
        supplier: invoiceData.supplier,
        buyer: invoiceData.buyer,
        services: invoiceData.services.map(service => ({
          name: service.name,
          quantity: service.quantity,
          unit: service.unit,
          price: service.price,
          total: service.total
        })),
        totalAmount: getTotalAmount(),
        totalAmountWords: numberToWords(getTotalAmount())
      };

      // Генерируем Excel файл
      const excelBuffer = ExcelGenerator.generateInvoiceExcel(excelData);
      
      // Скачиваем файл
      const filename = `Счет_${invoiceData.invoiceNumber}_${invoiceData.invoiceDate}.xlsx`;
      ExcelGenerator.downloadExcel(excelBuffer, filename);
      
      toast({
        title: "Excel скачан",
        description: "Файл сохранен на ваше устройство",
      });
    } catch (error) {
      console.error('Failed to download Excel:', error);
      toast({
        title: "Ошибка скачивания",
        description: "Не удалось создать Excel файл",
        variant: "destructive"
      });
    }
  };

  const renderModeButtons = () => (
    <nav className="p-4 space-y-2">
      <Button
        variant={currentMode === 'edit' ? 'default' : 'ghost'}
        className={`w-full justify-start ${currentMode === 'edit' ? 'btn-primary' : ''}`}
        onClick={() => setCurrentMode('edit')}
      >
        <Edit3 className="w-5 h-5 mr-3" />
        Редактирование
      </Button>
      
      <Button
        variant={currentMode === 'supplier' ? 'default' : 'ghost'}
        className={`w-full justify-start ${currentMode === 'supplier' ? 'btn-secondary' : ''}`}
        onClick={() => setCurrentMode('supplier')}
      >
        <Building className="w-5 h-5 mr-3 text-secondary" />
        Мои данные
      </Button>
      
      <Button
        variant={currentMode === 'signature' ? 'default' : 'ghost'}
        className={`w-full justify-start ${currentMode === 'signature' ? 'btn-accent' : ''}`}
        onClick={() => setCurrentMode('signature')}
      >
        <PenTool className="w-5 h-5 mr-3 text-accent" />
        Подпись и печать
      </Button>
      
      <Button
        variant={currentMode === 'preview' ? 'default' : 'ghost'}
        className={`w-full justify-start ${currentMode === 'preview' ? 'btn-success' : ''}`}
        onClick={() => setCurrentMode('preview')}
      >
        <Eye className="w-5 h-5 mr-3 text-success" />
        Предварительный просмотр
      </Button>
    </nav>
  );

  const renderEditMode = () => (
    <Card>
      <CardHeader>
        <CardTitle>Создание счета на оплату</CardTitle>
        <p className="text-gray-600">Заполните данные для генерации официального счета</p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Invoice Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="invoiceNumber">Номер счета *</Label>
            <Input
              id="invoiceNumber"
              value={invoiceData.invoiceNumber}
              onChange={(e) => updateField('invoiceNumber', '', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="invoiceDate">Дата счета *</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceData.invoiceDate}
              onChange={(e) => updateField('invoiceDate', '', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="contract">Договор</Label>
            <Input
              id="contract"
              value={invoiceData.contract}
              onChange={(e) => updateField('contract', '', e.target.value)}
            />
          </div>
        </div>

        {/* Buyer Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Данные покупателя
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="buyerName">Наименование организации *</Label>
              <Input
                id="buyerName"
                value={invoiceData.buyer.name}
                onChange={(e) => updateField('buyer', 'name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="buyerBin">БИН/ИИН *</Label>
              <Input
                id="buyerBin"
                value={invoiceData.buyer.bin}
                onChange={(e) => updateField('buyer', 'bin', e.target.value)}
                placeholder="12 цифр"
              />
              {invoiceData.buyer.bin && !validateBinIin(invoiceData.buyer.bin) && (
                <p className="text-sm text-red-500 mt-1">БИН/ИИН должен содержать 12 цифр</p>
              )}

            </div>
            <div className="md:col-span-2">
              <Label htmlFor="buyerAddress">Адрес *</Label>
              <Textarea
                id="buyerAddress"
                value={invoiceData.buyer.address}
                onChange={(e) => updateField('buyer', 'address', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Services/Products */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Товары и услуги
            </h3>
            <Button onClick={addService} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </div>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                <div className="col-span-1">№</div>
                <div className="col-span-4">Наименование</div>
                <div className="col-span-2">Количество</div>
                <div className="col-span-2">Цена</div>
                <div className="col-span-2">Сумма</div>
                <div className="col-span-1"></div>
              </div>
            </div>
            
            {invoiceData.services.map((service, index) => (
              <div key={service.id} className="px-6 py-4 border-b border-gray-200 last:border-b-0">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1 text-sm text-gray-600">{index + 1}</div>
                  <div className="col-span-4">
                    <Input
                      value={service.name}
                      onChange={(e) => updateService(index, 'name', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        value={service.quantity}
                        onChange={(e) => updateService(index, 'quantity', parseFloat(e.target.value) || 0)}
                        step="0.1"
                        className="w-20 text-sm"
                      />
                      <Select
                        value={service.unit}
                        onValueChange={(value) => updateService(index, 'unit', value)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Услуга">Услуга</SelectItem>
                          <SelectItem value="шт">шт</SelectItem>
                          <SelectItem value="кг">кг</SelectItem>
                          <SelectItem value="м">м</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={service.price}
                      onChange={(e) => updateService(index, 'price', parseFloat(e.target.value) || 0)}
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm font-medium">{service.total.toLocaleString('ru-RU')} ₸</span>
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeService(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-gray-50 px-6 py-4">
              <div className="flex justify-end">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Итого:</div>
                  <div className="text-lg font-bold text-gray-900">{getTotalAmount().toLocaleString('ru-RU')} ₸</div>
                  <div className="text-xs text-gray-500 mt-1">{numberToWords(getTotalAmount())}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSupplierMode = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-secondary">
          <Building className="w-6 h-6 mr-2" />
          Данные поставщика
        </CardTitle>
        <p className="text-gray-600">Укажите информацию о вашей организации</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="supplierName">Наименование организации *</Label>
            <Input
              id="supplierName"
              value={invoiceData.supplier.name}
              onChange={(e) => updateField('supplier', 'name', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="supplierBin">БИН/ИИН *</Label>
            <Input
              id="supplierBin"
              value={invoiceData.supplier.bin}
              onChange={(e) => updateField('supplier', 'bin', e.target.value)}
              placeholder="12 цифр"
            />
            {invoiceData.supplier.bin && !validateBinIin(invoiceData.supplier.bin) && (
              <p className="text-sm text-red-500 mt-1">БИН/ИИН должен содержать 12 цифр</p>
            )}

          </div>
          <div>
            <Label htmlFor="supplierKbe">КБЕ</Label>
            <Input
              id="supplierKbe"
              value={invoiceData.supplier.kbe}
              onChange={(e) => updateField('supplier', 'kbe', e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="supplierAddress">Адрес *</Label>
            <Textarea
              id="supplierAddress"
              value={invoiceData.supplier.address}
              onChange={(e) => updateField('supplier', 'address', e.target.value)}
              rows={2}
            />
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-secondary" />
            Банковские реквизиты
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="supplierBank">Наименование банка *</Label>
              <Input
                id="supplierBank"
                value={invoiceData.supplier.bank}
                onChange={(e) => updateField('supplier', 'bank', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="supplierBik">БИК *</Label>
              <Input
                id="supplierBik"
                value={invoiceData.supplier.bik}
                onChange={(e) => updateField('supplier', 'bik', e.target.value)}
                placeholder="8 символов"
              />
              {invoiceData.supplier.bik && !validateBik(invoiceData.supplier.bik) && (
                <p className="text-sm text-red-500 mt-1">БИК должен содержать 8 символов</p>
              )}
            </div>
            <div>
              <Label htmlFor="supplierPaymentCode">Код назначения платежа</Label>
              <Input
                id="supplierPaymentCode"
                value={invoiceData.supplier.paymentCode}
                onChange={(e) => updateField('supplier', 'paymentCode', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="supplierIik">ИИК *</Label>
              <Input
                id="supplierIik"
                value={invoiceData.supplier.iik}
                onChange={(e) => updateField('supplier', 'iik', e.target.value)}
                placeholder="KZ + 18 цифр"
              />
              {invoiceData.supplier.iik && !validateIik(invoiceData.supplier.iik) && (
                <p className="text-sm text-red-500 mt-1">ИИК должен начинаться с KZ и содержать 20 символов</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button className="btn-secondary">
            Сохранить данные
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSignatureMode = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-accent">
          <PenTool className="w-6 h-6 mr-2" />
          Подпись и печать
        </CardTitle>
        <p className="text-gray-600">Загрузите изображения подписи и печати для счетов</p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Signature Upload */}
        <div className="bg-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Edit3 className="w-5 h-5 mr-2 text-accent" />
            Подпись
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                <input
                  type="file"
                  ref={signatureInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0] || null, 'signature')}
                />
                {signature ? (
                  <div>
                    <img src={signature} alt="Signature" className="max-w-full h-auto mx-auto max-h-32" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage('signature')}
                      className="mt-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Удалить
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Загрузите изображение подписи</p>
                    <p className="text-sm text-gray-500 mb-4">PNG, JPG до 5MB</p>
                    <Button
                      onClick={() => signatureInputRef.current?.click()}
                      className="btn-accent"
                    >
                      Выбрать файл
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Настройки подписи</h4>
              
              <div className="space-y-4">
                <div>
                  <Label>Ширина (px): {signatureSettings.width}</Label>
                  <Slider
                    value={[signatureSettings.width]}
                    onValueChange={(value) => setSignatureSettings(prev => ({ ...prev, width: value[0] }))}
                    min={100}
                    max={300}
                    step={10}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Высота (px): {signatureSettings.height}</Label>
                  <Slider
                    value={[signatureSettings.height]}
                    onValueChange={(value) => setSignatureSettings(prev => ({ ...prev, height: value[0] }))}
                    min={30}
                    max={120}
                    step={5}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Расположение</Label>
                  <Select
                    value={signatureSettings.position}
                    onValueChange={(value) => setSignatureSettings(prev => ({ ...prev, position: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Слева</SelectItem>
                      <SelectItem value="center">По центру</SelectItem>
                      <SelectItem value="right">Справа</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stamp Upload */}
        <div className="bg-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-accent" />
            Печать
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                <input
                  type="file"
                  ref={stampInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0] || null, 'stamp')}
                />
                {stamp ? (
                  <div>
                    <img src={stamp} alt="Stamp" className="max-w-full h-auto mx-auto max-h-32" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage('stamp')}
                      className="mt-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Удалить
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Загрузите изображение печати</p>
                    <p className="text-sm text-gray-500 mb-4">PNG, JPG до 5MB</p>
                    <Button
                      onClick={() => stampInputRef.current?.click()}
                      className="btn-accent"
                    >
                      Выбрать файл
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Настройки печати</h4>
              
              <div className="space-y-4">
                <div>
                  <Label>Размер (px): {stampSettings.size}</Label>
                  <Slider
                    value={[stampSettings.size]}
                    onValueChange={(value) => setStampSettings(prev => ({ ...prev, size: value[0] }))}
                    min={60}
                    max={150}
                    step={10}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Расположение</Label>
                  <Select
                    value={stampSettings.position}
                    onValueChange={(value) => setStampSettings(prev => ({ ...prev, position: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Слева</SelectItem>
                      <SelectItem value="center">По центру</SelectItem>
                      <SelectItem value="right">Справа</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPreviewMode = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center text-success">
              <Eye className="w-6 h-6 mr-2" />
              Предварительный просмотр
            </CardTitle>
            <p className="text-gray-600 mt-1">Готовый счет на оплату для печати и экспорта</p>
          </div>
          
          <div className="flex items-center space-x-3 no-print">
            <Button onClick={downloadPDF} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Скачать PDF
            </Button>
            <Button onClick={downloadExcel} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Скачать Excel
            </Button>
            <Button onClick={printInvoice} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Печать
            </Button>
            <Button onClick={sendToTelegram} className="btn-primary">
              <Send className="w-4 h-4 mr-2" />
              Отправить в Telegram
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div id="invoiceDocument" className="bg-white p-8 print:p-0 print:shadow-none shadow-lg rounded-lg">
          {/* Invoice Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">СЧЕТ НА ОПЛАТУ</h1>
            <p className="text-lg">№ {invoiceData.invoiceNumber} от {invoiceData.invoiceDate}</p>
            {invoiceData.contract && <p className="text-sm text-gray-600">По договору: {invoiceData.contract}</p>}
          </div>

          {/* Supplier Information */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Поставщик:</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-medium">{invoiceData.supplier.name}</p>
              <p>БИН: {invoiceData.supplier.bin}</p>
              <p>Адрес: {invoiceData.supplier.address}</p>
              <div className="mt-2">
                <p>Банк: {invoiceData.supplier.bank}</p>
                <p>БИК: {invoiceData.supplier.bik}</p>
                <p>ИИК: {invoiceData.supplier.iik}</p>
                <p>КБЕ: {invoiceData.supplier.kbe}</p>
                <p>Код назначения платежа: {invoiceData.supplier.paymentCode}</p>
              </div>
            </div>
          </div>

          {/* Buyer Information */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Покупатель:</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-medium">{invoiceData.buyer.name}</p>
              <p>БИН: {invoiceData.buyer.bin}</p>
              <p>Адрес: {invoiceData.buyer.address}</p>
            </div>
          </div>

          {/* Services Table */}
          <div className="mb-8">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">№</th>
                  <th className="border border-gray-300 p-2 text-left">Наименование</th>
                  <th className="border border-gray-300 p-2 text-center">Кол-во</th>
                  <th className="border border-gray-300 p-2 text-center">Ед. изм.</th>
                  <th className="border border-gray-300 p-2 text-right">Цена</th>
                  <th className="border border-gray-300 p-2 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.services.map((service, index) => (
                  <tr key={service.id}>
                    <td className="border border-gray-300 p-2">{index + 1}</td>
                    <td className="border border-gray-300 p-2">{service.name}</td>
                    <td className="border border-gray-300 p-2 text-center">{service.quantity}</td>
                    <td className="border border-gray-300 p-2 text-center">{service.unit}</td>
                    <td className="border border-gray-300 p-2 text-right">{service.price.toLocaleString('ru-RU')} ₸</td>
                    <td className="border border-gray-300 p-2 text-right">{service.total.toLocaleString('ru-RU')} ₸</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={5} className="border border-gray-300 p-2 text-right">Итого:</td>
                  <td className="border border-gray-300 p-2 text-right">{getTotalAmount().toLocaleString('ru-RU')} ₸</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="mb-8">
            <p className="font-semibold">
              Всего к оплате: {numberToWords(getTotalAmount())}
            </p>
          </div>

          {/* Signatures */}
          <div className="mt-12 flex justify-between items-end">
            <div className="text-left">
              <p className="mb-8">Руководитель: ________________</p>
              <p className="text-sm text-gray-600">подпись</p>
            </div>
            
            <div className="text-right">
              <p className="mb-8">Главный бухгалтер: ________________</p>
              <p className="text-sm text-gray-600">подпись</p>
            </div>
          </div>

          {/* Signature and Stamp Images */}
          {(signature || stamp) && (
            <div className="mt-8 flex justify-between">
              {signature && (
                <div 
                  className="signature-container"
                  style={{
                    position: 'absolute',
                    left: '50px',
                    top: '50px',
                    transform: 'scale(0.8)',
                    zIndex: 10
                  }}
                >
                  <img 
                    src={signature} 
                    alt="Подпись" 
                    className="max-w-none"
                    style={{ width: '150px', height: 'auto' }}
                  />
                </div>
              )}
              
              {stamp && (
                <div 
                  className="stamp-container"
                  style={{
                    position: 'absolute',
                    right: '50px',
                    top: '50px',
                    transform: 'scale(0.8)',
                    zIndex: 10
                  }}
                >
                  <img 
                    src={stamp} 
                    alt="Печать" 
                    className="max-w-none"
                    style={{ width: '120px', height: 'auto' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Генератор счетов РК</h1>
                <p className="text-sm text-gray-500">Telegram интеграция</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/invoices'}
              >
                <List className="w-5 h-5 mr-2" />
                Мои счета
              </Button>
              <Button
                variant="ghost"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 no-print">
            <Card>
              <CardHeader>
                <CardTitle>Управление</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderModeButtons()}
                
                <div className="p-4 border-t border-gray-200">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Bot className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-primary">Telegram Bot</span>
                    </div>
                    <p className="text-xs text-blue-700 mb-3">
                      Генерируйте счета прямо из Telegram и получайте готовые файлы
                    </p>
                    <Button
                      onClick={() => setShowTelegramBotModal(true)}
                      className="w-full btn-primary text-sm py-2"
                    >
                      Открыть бот
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            {currentMode === 'edit' && renderEditMode()}
            {currentMode === 'supplier' && renderSupplierMode()}
            {currentMode === 'signature' && renderSignatureMode()}
            {currentMode === 'preview' && renderPreviewMode()}
          </div>
        </div>
      </div>

      {/* Telegram Bot Modal */}
      {showTelegramBotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Telegram Bot</h2>
              <p className="text-gray-600">Генерируйте счета прямо из Telegram</p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Возможности бота:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>Создание счетов из Telegram</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>Получение готовых PDF и Excel файлов</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>Прямые ссылки на документы</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>Синхронизация с веб-платформой</span>
                </li>
              </ul>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => window.open(`https://t.me/${process.env.VITE_TELEGRAM_BOT_USERNAME || 'your_invoice_bot'}`, '_blank')}
                className="flex-1 btn-primary"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Открыть бот
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTelegramBotModal(false)}
              >
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
