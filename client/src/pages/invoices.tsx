import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Send, Loader2, Search, Edit, Copy, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid';
  supplier?: {
    name: string;
    bin: string;
  };
  buyer?: {
    name: string;
    bin: string;
  };
}

export default function InvoicesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'number' | 'amount'>('date');
  
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: async () => {
      const response = await fetch('/api/invoices');
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      return response.json();
    }
  });

  // Фильтрация и сортировка счетов
  const filteredInvoices = invoices
    .filter((invoice: Invoice) => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.buyer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a: Invoice, b: Invoice) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
        case 'number':
          return a.invoiceNumber.localeCompare(b.invoiceNumber);
        case 'amount':
          return b.totalAmount - a.totalAmount;
        default:
          return 0;
      }
    });

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`);
      if (!response.ok) throw new Error('Failed to download PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Счет_${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скачать PDF",
        variant: "destructive",
      });
    }
  };

  const handleSendToTelegram = async (invoice: Invoice) => {
    try {
      const response = await fetch('/api/telegram/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id })
      });
      
      if (!response.ok) throw new Error('Failed to send to Telegram');
      
      toast({
        title: "Успешно",
        description: "Счет отправлен в Telegram",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить в Telegram",
        variant: "destructive",
      });
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    // Переход к редактированию счета
    window.location.href = `/invoices/edit/${invoice.id}`;
  };

  const handleCopyInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to copy invoice');
      
      const newInvoice = await response.json();
      
      toast({
        title: "Счет скопирован",
        description: `Создан новый счет № ${newInvoice.invoiceNumber}`,
      });
      
      // Обновляем список
      window.location.reload();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать счет",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'sent': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'sent': return 'Отправлен';
      case 'paid': return 'Оплачен';
      default: return 'Неизвестно';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Мои счета</h1>
              <p className="text-gray-600 mt-2">Управление созданными счетами на оплату</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
              >
                <FileText className="h-4 w-4 mr-2" />
                Создать счет
              </Button>
            </div>
          </div>
        </div>

        {/* Поиск и фильтры */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Поиск и фильтры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по номеру, покупателю..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="draft">Черновик</SelectItem>
                  <SelectItem value="sent">Отправлен</SelectItem>
                  <SelectItem value="paid">Оплачен</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Сортировка" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">По дате</SelectItem>
                  <SelectItem value="number">По номеру</SelectItem>
                  <SelectItem value="amount">По сумме</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="text-sm text-gray-500 flex items-center">
                Найдено: {filteredInvoices.length} из {invoices.length}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Telegram Info Card */}
        <Card className="bg-blue-50 border-blue-200 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Telegram бот интеграция
                </h3>
                <p className="text-blue-700 text-sm mb-3">
                  Теперь вы можете просматривать все свои счета прямо в Telegram! 
                  Откройте бота и используйте команду <code>/invoices</code> для просмотра списка счетов.
                </p>
                <div className="flex gap-2 text-xs text-blue-600">
                  <span>• <strong>/start</strong> - Начать работу</span>
                  <span>• <strong>/invoices</strong> - Список счетов</span>
                  <span>• <strong>/help</strong> - Помощь</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="mx-auto h-8 w-8 text-gray-400 animate-spin mb-4" />
                <p className="text-gray-500">Загрузка счетов...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-red-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ошибка загрузки
                </h3>
                <p className="text-gray-500 mb-4">
                  Не удалось загрузить список счетов
                </p>
                <Button onClick={() => window.location.reload()}>
                  Обновить страницу
                </Button>
              </CardContent>
            </Card>
          ) : invoices.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Счета не найдены
                </h3>
                <p className="text-gray-500 mb-4">
                  Вы еще не создали ни одного счета
                </p>
                <Button onClick={() => window.location.href = '/'}>
                  Создать первый счет
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Счет № {invoice.invoiceNumber}
                    </CardTitle>
                    <Badge className={getStatusColor(invoice.status || 'draft')}>
                      {getStatusText(invoice.status || 'draft')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Дата</p>
                      <p className="font-medium">
                        {new Date(invoice.invoiceDate).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Поставщик</p>
                      <p className="font-medium truncate" title={invoice.supplier?.name}>
                        {invoice.supplier?.name || 'Не указан'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Покупатель</p>
                      <p className="font-medium truncate" title={invoice.buyer?.name}>
                        {invoice.buyer?.name || 'Не указан'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Сумма</p>
                      <p className="text-xl font-bold text-green-600">
                        {invoice.totalAmount.toLocaleString('ru-RU')} ₸
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditInvoice(invoice)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Редактировать
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyInvoice(invoice)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Копировать
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadPDF(invoice)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSendToTelegram(invoice)}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        В Telegram
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}