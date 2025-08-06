import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import InvoiceGenerator from "@/components/invoice-generator";
import TelegramAuth from "@/components/telegram-auth";
import { FileText, MessageCircle } from "lucide-react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
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
            </div>
          </div>
        </header>

        {/* Authentication Section */}
        <div className="max-w-md mx-auto pt-16">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Авторизация</h2>
              <p className="text-gray-600">Войдите через Telegram для доступа к генератору счетов</p>
            </div>
            
            <TelegramAuth onSuccess={() => setIsAuthenticated(true)} />
          </div>
        </div>
      </div>
    );
  }

  return <InvoiceGenerator />;
}
