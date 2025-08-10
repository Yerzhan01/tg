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
  Plus, Trash2, Upload, X, Bot, ExternalLink, CheckCircle, Printer, Send, List, Download, Layers, Minus, ShoppingCart, Save
} from "lucide-react";
import { convertNumberToKazakhWords } from "@/lib/number-converter";
import { validateBinIin, validateIik, validateBik, validateRequiredField, validateAmount } from "@/lib/validation";
import { PDFGenerator, type InvoicePDFData } from "@/lib/pdf-generator";
import { ExcelGenerator, type ExcelInvoiceData } from "@/lib/excel-generator";
import { serviceTemplates, getTemplateById } from "@/lib/service-templates";

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
    price: number | string;
    total: number;
  }[];
}

export default function InvoiceGenerator() {
  const [currentMode, setCurrentMode] = useState<Mode>('edit');
  const [invoiceStatus, setInvoiceStatus] = useState<'draft' | 'sent' | 'paid'>('draft');
  
  // Данные пользователя
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me']
  });
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    contract: '',
    supplier: {
      name: '',
      bin: '',
      address: '',
      bank: '',
      bik: '',
      iik: '',
      kbe: '',
      paymentCode: ''
    },
    buyer: {
      name: '',
      bin: '',
      address: ''
    },
    services: []
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
  const [showTemplates, setShowTemplates] = useState(false);
  const queryClient = useQueryClient();

  // Загрузка сохраненных поставщиков
  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
    enabled: !!user
  });

  // Загрузка сохраненных покупателей
  const { data: buyers = [] } = useQuery<any[]>({
    queryKey: ['/api/buyers'], 
    enabled: !!user
  });

  // Сохранение поставщика
  const saveSupplierMutation = useMutation({
    mutationFn: (supplier: any) => apiRequest('/api/suppliers', 'POST', supplier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({ title: "Поставщик сохранен", description: "Данные поставщика сохранены в базу данных" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось сохранить поставщика", variant: "destructive" });
    }
  });

  // Сохранение покупателя
  const saveBuyerMutation = useMutation({
    mutationFn: (buyer: any) => apiRequest('/api/buyers', 'POST', buyer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buyers'] });
      toast({ title: "Покупатель сохранен", description: "Данные покупателя сохранены в базу данных" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось сохранить покупателя", variant: "destructive" });
    }
  });

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
      const price = typeof newServices[index].price === 'string' ? parseFloat(newServices[index].price) || 0 : newServices[index].price;
      newServices[index].total = newServices[index].quantity * price;
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
      quantity: 1,
      unit: 'Услуга',
      price: '',
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
    return invoiceData.services.reduce((sum, service) => {
      const price = typeof service.price === 'string' ? parseFloat(service.price) || 0 : service.price;
      const total = service.quantity * price;
      return sum + total;
    }, 0);
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
        totalAmountWords: convertNumberToKazakhWords(getTotalAmount()),
        status: invoiceStatus,
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
      const price = typeof service.price === 'string' ? parseFloat(service.price) || 0 : service.price;
      if (!validateAmount(price)) {
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
          price: typeof service.price === 'string' ? parseFloat(service.price) || 0 : service.price,
          total: service.quantity * (typeof service.price === 'string' ? parseFloat(service.price) || 0 : service.price)
        })),
        totalAmount: getTotalAmount(),
        totalAmountWords: convertNumberToKazakhWords(getTotalAmount())
      };

      // Generate PDF using the improved PDF generator
      const pdf = await PDFGenerator.generateInvoicePDF(pdfData, signature || undefined, stamp || undefined);
      
      // Скачиваем файл
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
          price: typeof service.price === 'string' ? parseFloat(service.price) || 0 : service.price,
          total: service.quantity * (typeof service.price === 'string' ? parseFloat(service.price) || 0 : service.price)
        })),
        totalAmount: getTotalAmount(),
        totalAmountWords: convertNumberToKazakhWords(getTotalAmount())
      };

      // Generate PDF using the improved PDF generator
      const pdf = await PDFGenerator.generateInvoicePDF(pdfData, signature || undefined, stamp || undefined);
      
      // Convert PDF to blob for sending to Telegram
      const pdfBlob = pdf.output('blob');
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
      reader.readAsDataURL(pdfBlob);
      
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
          price: typeof service.price === 'string' ? parseFloat(service.price) || 0 : service.price,
          total: service.quantity * (typeof service.price === 'string' ? parseFloat(service.price) || 0 : service.price)
        })),
        totalAmount: getTotalAmount(),
        totalAmountWords: convertNumberToKazakhWords(getTotalAmount())
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

  const applyTemplate = (templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) return;

    // Заменяем все услуги на услуги из шаблона
    const templateServices = template.services.map((service, index) => ({
      id: Date.now() + index,
      name: service.name,
      quantity: 1,
      unit: service.unit,
      price: service.price || 0,
      total: service.price || 0
    }));

    setInvoiceData(prev => ({
      ...prev,
      services: templateServices
    }));

    setShowTemplates(false);
    toast({
      title: "Шаблон применен",
      description: `Загружены услуги из категории "${template.name}"`,
    });
  };

  const renderTemplatesModal = () => (
    showTemplates && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Выберите шаблон услуг</h2>
            <Button 
              variant="ghost" 
              onClick={() => setShowTemplates(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serviceTemplates.map(template => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-gray-600">{template.category}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 mb-4">
                    {template.services.slice(0, 3).map((service, index) => (
                      <p key={index} className="text-sm text-gray-700">
                        • {service.name} ({service.unit})
                        {service.price && ` - ${service.price.toLocaleString()} ₸`}
                      </p>
                    ))}
                    {template.services.length > 3 && (
                      <p className="text-sm text-gray-500">
                        +{template.services.length - 3} еще...
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={() => applyTemplate(template.id)}
                    className="w-full"
                  >
                    Применить шаблон
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  );

  const renderModeButtons = () => (
    <nav className="mobile-form space-y-3">
      <Button
        variant={currentMode === 'edit' ? 'default' : 'ghost'}
        className={`w-full h-12 justify-start text-left font-medium ${currentMode === 'edit' ? 'btn-primary' : ''}`}
        onClick={() => setCurrentMode('edit')}
      >
        <Edit3 className="w-5 h-5 mr-3 flex-shrink-0" />
        <span>Редактирование</span>
      </Button>
      
      <Button
        variant={currentMode === 'supplier' ? 'default' : 'ghost'}
        className={`w-full h-12 justify-start text-left font-medium ${currentMode === 'supplier' ? 'btn-secondary' : ''}`}
        onClick={() => setCurrentMode('supplier')}
      >
        <Building className="w-5 h-5 mr-3 text-secondary flex-shrink-0" />
        <span>Мои данные</span>
      </Button>
      
      <Button
        variant={currentMode === 'signature' ? 'default' : 'ghost'}
        className={`w-full h-12 justify-start text-left font-medium ${currentMode === 'signature' ? 'btn-accent' : ''}`}
        onClick={() => setCurrentMode('signature')}
      >
        <PenTool className="w-5 h-5 mr-3 text-accent flex-shrink-0" />
        <span>Подпись и печать</span>
      </Button>
      
      <Button
        variant={currentMode === 'preview' ? 'default' : 'ghost'}
        className={`w-full h-12 justify-start text-left font-medium ${currentMode === 'preview' ? 'btn-success' : ''}`}
        onClick={() => setCurrentMode('preview')}
      >
        <Eye className="w-5 h-5 mr-3 text-success flex-shrink-0" />
        <span>Предварительный просмотр</span>
      </Button>
      
      <div className="border-t pt-4 mt-6">
        <Button
          variant="outline"
          className="w-full h-11 justify-start text-left text-red-600 border-red-200 hover:bg-red-50 font-medium"
          onClick={async () => {
            if (confirm('Вы уверены, что хотите удалить все свои данные? Это действие нельзя отменить.')) {
              try {
                const response = await fetch('/api/clear-my-data', { 
                  method: 'POST',
                  credentials: 'include'
                });
                if (response.ok) {
                  toast({ title: "Данные удалены", description: "Все ваши данные успешно удалены" });
                  window.location.reload();
                } else {
                  toast({ title: "Ошибка", description: "Не удалось удалить данные", variant: "destructive" });
                }
              } catch (error) {
                toast({ title: "Ошибка", description: "Произошла ошибка при удалении данных", variant: "destructive" });
              }
            }
          }}
        >
          <Trash2 className="w-4 h-4 mr-3 flex-shrink-0" />
          <span>Очистить все данные</span>
        </Button>
      </div>
    </nav>
  );

  const renderEditMode = () => (
    <Card className="mobile-card">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">Создание счета на оплату</CardTitle>
        <p className="text-sm text-gray-600">Заполните данные для генерации официального счета</p>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-8">
        {/* Invoice Header */}
        <div className="mobile-grid gap-4 sm:gap-6">
          <div>
            <Label htmlFor="invoiceNumber" className="text-sm font-medium">Номер счета *</Label>
            <Input
              id="invoiceNumber"
              value={invoiceData.invoiceNumber}
              onChange={(e) => updateField('invoiceNumber', '', e.target.value)}
              className="mobile-input"
            />
          </div>
          <div>
            <Label htmlFor="invoiceDate" className="text-sm font-medium">Дата счета *</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceData.invoiceDate}
              onChange={(e) => updateField('invoiceDate', '', e.target.value)}
              className="mobile-input"
            />
          </div>
          <div>
            <Label htmlFor="contract" className="text-sm font-medium">Договор</Label>
            <Input
              id="contract"
              value={invoiceData.contract}
              onChange={(e) => updateField('contract', '', e.target.value)}
              className="mobile-input"
            />
          </div>
        </div>

        {/* Buyer Information */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <h3 className="text-lg font-semibold text-blue-900 flex items-center">
              <Building className="w-5 h-5 mr-2 text-blue-600" />
              Данные покупателя
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              {buyers.length > 0 && (
                <Select
                  onValueChange={(buyerId) => {
                    const buyer = buyers.find((b: any) => b.id === buyerId);
                    if (buyer) {
                      setInvoiceData(prev => ({
                        ...prev,
                        buyer: {
                          name: buyer.name,
                          bin: buyer.bin,
                          address: buyer.address
                        }
                      }));
                      toast({ title: "Данные загружены", description: "Данные покупателя загружены" });
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Выбрать из сохраненных" />
                  </SelectTrigger>
                  <SelectContent>
                    {buyers.map((buyer: any) => (
                      <SelectItem key={buyer.id} value={buyer.id}>
                        {buyer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!invoiceData.buyer.name || !invoiceData.buyer.bin || !invoiceData.buyer.address) {
                    toast({ title: "Ошибка", description: "Заполните все обязательные поля покупателя", variant: "destructive" });
                    return;
                  }
                  saveBuyerMutation.mutate(invoiceData.buyer);
                }}
                disabled={saveBuyerMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-1" />
                {saveBuyerMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
          
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Товары и услуги
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button onClick={() => setShowTemplates(true)} variant="outline" className="mobile-button sm:w-auto text-xs sm:text-sm">
                <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Шаблоны
              </Button>
              <Button onClick={addService} className="mobile-button sm:w-auto btn-primary text-xs sm:text-sm">
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Добавить
              </Button>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Desktop header */}
            <div className="hidden lg:block bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700">
                <div className="col-span-1">№</div>
                <div className="col-span-3">Наименование</div>
                <div className="col-span-1">Кол-во</div>
                <div className="col-span-1">Ед.</div>
                <div className="col-span-3">Цена</div>
                <div className="col-span-2">Сумма</div>
                <div className="col-span-1"></div>
              </div>
            </div>
            
            {invoiceData.services.map((service, index) => (
              <div key={service.id} className="p-4 lg:px-6 lg:py-4 border-b border-gray-200 last:border-b-0">
                {/* Mobile layout */}
                <div className="block lg:hidden space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Услуга #{index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeService(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Название</Label>
                      <Input
                        value={service.name}
                        onChange={(e) => updateService(index, 'name', e.target.value)}
                        className="text-sm"
                        placeholder="Название услуги"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Количество</Label>
                        <Input
                          type="number"
                          value={service.quantity}
                          onChange={(e) => updateService(index, 'quantity', parseFloat(e.target.value) || 0)}
                          step="0.1"
                          className="text-sm"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Единица</Label>
                        <Select
                          value={service.unit}
                          onValueChange={(value) => updateService(index, 'unit', value)}
                        >
                          <SelectTrigger className="text-sm h-10">
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
                    
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Цена</Label>
                      <Input
                        type="number"
                        value={service.price}
                        onChange={(e) => updateService(index, 'price', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        step="0.01"
                        className="text-sm"
                        placeholder="Цена"
                      />
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Сумма:</span>
                        <span className="text-sm font-medium">{(service.quantity * (typeof service.price === 'string' ? parseFloat(service.price) || 0 : service.price)).toLocaleString('ru-RU')} ₸</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Desktop layout */}
                <div className="hidden lg:grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 text-sm text-gray-600">{index + 1}</div>
                  <div className="col-span-3">
                    <Input
                      value={service.name}
                      onChange={(e) => updateService(index, 'name', e.target.value)}
                      className="text-sm"
                      placeholder="Название услуги"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={service.quantity}
                      onChange={(e) => updateService(index, 'quantity', parseFloat(e.target.value) || 0)}
                      step="0.1"
                      className="text-sm"
                      placeholder="1"
                    />
                  </div>
                  <div className="col-span-1">
                    <Select
                      value={service.unit}
                      onValueChange={(value) => updateService(index, 'unit', value)}
                    >
                      <SelectTrigger className="text-sm h-9">
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
                  <div className="col-span-3">
                    <Input
                      type="number"
                      value={service.price}
                      onChange={(e) => updateService(index, 'price', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="text-sm"
                      placeholder="Цена"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm font-medium">{(service.quantity * (typeof service.price === 'string' ? parseFloat(service.price) || 0 : service.price)).toLocaleString('ru-RU')} ₸</span>
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
                  <div className="text-xs text-gray-500 mt-1">{convertNumberToKazakhWords(getTotalAmount())}</div>
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
        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center">
            <Building className="w-6 h-6 mr-2 text-green-600" />
            <span className="text-green-900">Данные поставщика</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {suppliers.length > 0 && (
              <Select
                onValueChange={(supplierId) => {
                  const supplier = suppliers.find((s: any) => s.id === supplierId);
                  if (supplier) {
                    setInvoiceData(prev => ({
                      ...prev,
                      supplier: {
                        name: supplier.name,
                        bin: supplier.bin,
                        address: supplier.address,
                        bank: supplier.bank,
                        bik: supplier.bik,
                        iik: supplier.iik,
                        kbe: supplier.kbe || '',
                        paymentCode: supplier.paymentCode || ''
                      }
                    }));
                    toast({ title: "Данные загружены", description: "Данные поставщика загружены" });
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Выбрать из сохраненных" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!invoiceData.supplier.name || !invoiceData.supplier.bin || !invoiceData.supplier.address) {
                  toast({ title: "Ошибка", description: "Заполните все обязательные поля поставщика", variant: "destructive" });
                  return;
                }
                saveSupplierMutation.mutate(invoiceData.supplier);
              }}
              disabled={saveSupplierMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white border-green-600 w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-1" />
              {saveSupplierMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
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
                placeholder="KZ + 16-20 символов"
              />
              {invoiceData.supplier.iik && !validateIik(invoiceData.supplier.iik) && (
                <p className="text-sm text-red-500 mt-1">ИИК должен начинаться с KZ и содержать от 18 до 22 символов</p>
              )}
            </div>
          </div>
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
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
            {/* Status Management */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="status" className="text-sm font-medium">Статус:</Label>
              <Select value={invoiceStatus} onValueChange={(value: 'draft' | 'sent' | 'paid') => setInvoiceStatus(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">🟡 Черновик</SelectItem>
                  <SelectItem value="sent">🔵 Отправлен</SelectItem>
                  <SelectItem value="paid">🟢 Оплачен</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button onClick={downloadPDF} variant="outline" size="sm" className="h-9">
                <FileText className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button onClick={downloadExcel} variant="outline" size="sm" className="h-9">
                <Download className="w-4 h-4 mr-1" />
                Excel
              </Button>
              <Button onClick={printInvoice} variant="outline" size="sm" className="h-9">
                <Printer className="w-4 h-4 mr-1" />
                Печать
              </Button>
              <Button onClick={sendToTelegram} size="sm" className="h-9 btn-primary">
                <Send className="w-4 h-4 mr-1" />
                Telegram
              </Button>
            </div>
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
              Всего к оплате: {convertNumberToKazakhWords(getTotalAmount())}
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
        <div className="mobile-container max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center py-3 sm:py-4 gap-3 sm:gap-4 h-auto sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Генератор счетов РК</h1>
                <p className="text-xs sm:text-sm text-gray-500">Telegram интеграция</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-center sm:justify-end">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/invoices'}
                className="mobile-button sm:w-auto text-xs sm:text-sm"
              >
                <List className="w-3 h-3 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Мои счета</span>
                <span className="sm:hidden">Счета</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="mobile-button sm:w-auto"
              >
                <LogOut className="w-3 h-3 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mobile-container max-w-7xl mx-auto py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8 mobile-responsive-layout">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 no-print">
            <Card className="mobile-card shadow-sm">
              <CardHeader className="pb-2 sm:pb-6 px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg">Управление</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="mobile-button-group p-4 sm:p-6">
                  {renderModeButtons()}
                </div>
                
                <div className="p-4 sm:p-4 border-t border-gray-200">
                  <div className="bg-blue-50 rounded-lg p-4 mobile-card">
                    <div className="flex items-center space-x-2 mb-3">
                      <Bot className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-primary">Telegram Bot</span>
                    </div>
                    <p className="text-sm text-blue-700 mb-4 leading-relaxed">
                      Генерируйте счета прямо из Telegram и получайте готовые файлы
                    </p>
                    <Button
                      onClick={() => setShowTelegramBotModal(true)}
                      className="w-full h-12 btn-primary text-sm font-medium"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print p-4">
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">Telegram Bot</h2>
              <p className="text-sm sm:text-base text-gray-600">Генерируйте счета прямо из Telegram</p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Возможности бота:</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                  <span>Создание счетов из Telegram</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                  <span>Получение готовых PDF и Excel файлов</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                  <span>Прямые ссылки на документы</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                  <span>Синхронизация с веб-платформой</span>
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/telegram/bot-info');
                    const data = await response.json();
                    window.open(`https://t.me/${data.botUsername}`, '_blank');
                  } catch (error) {
                    console.error('Error getting bot info:', error);
                    window.open('https://t.me/kzgenerate_bot', '_blank');
                  }
                }}
                className="mobile-button sm:flex-1 btn-primary text-sm"
              >
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
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
      {renderTemplatesModal()}
    </div>
  );
}
