import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Send } from "lucide-react";

interface Invoice {
  id: string;
  number: string;
  date: string;
  supplierName: string;
  buyerName: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid';
}

export default function InvoicesPage() {
  // Пример данных - в реальном приложении будет загрузка с сервера
  const [invoices] = useState<Invoice[]>([
    {
      id: '1',
      number: 'TEMP-1754500728934',
      date: '2025-08-06',
      supplierName: 'Индивидуальный предприниматель Sonar Group',
      buyerName: 'ТОО "White Label"',
      totalAmount: 300000,
      status: 'sent'
    },
    {
      id: '2',
      number: 'TEMP-1754501152362',
      date: '2025-08-06',
      supplierName: 'Временный поставщик',
      buyerName: 'Временный покупатель',
      totalAmount: 0,
      status: 'draft'
    }
  ]);

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

        {/* Telegram Info Card */}
        <Card className="bg-blue-50 border-blue-200 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  📱 Telegram бот интеграция
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
          {invoices.length === 0 ? (
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
            invoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Счет № {invoice.number}
                    </CardTitle>
                    <Badge className={getStatusColor(invoice.status)}>
                      {getStatusText(invoice.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Дата</p>
                      <p className="font-medium">
                        {new Date(invoice.date).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Поставщик</p>
                      <p className="font-medium truncate" title={invoice.supplierName}>
                        {invoice.supplierName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Покупатель</p>
                      <p className="font-medium truncate" title={invoice.buyerName}>
                        {invoice.buyerName}
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
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm">
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