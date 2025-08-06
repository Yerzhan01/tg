import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TelegramAuthProps {
  onSuccess: () => void;
}

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnauth: (user: any) => void;
    };
  }
}

export default function TelegramAuth({ onSuccess }: TelegramAuthProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const authMutation = useMutation({
    mutationFn: async (telegramData: any) => {
      const response = await apiRequest("POST", "/api/auth/telegram", telegramData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Успешная авторизация",
        description: "Добро пожаловать в генератор счетов!",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Ошибка авторизации",
        description: "Не удалось войти через Telegram",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Telegram Login Widget callback
    window.TelegramLoginWidget = {
      dataOnauth: (user) => {
        authMutation.mutate(user);
      }
    };

    // Load Telegram Widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'your_bot_username');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    const container = document.getElementById('telegram-login-container');
    if (container) {
      container.appendChild(script);
    }

    return () => {
      if (container && script.parentNode) {
        container.removeChild(script);
      }
    };
  }, [authMutation]);

  return (
    <div className="text-center">
      <div id="telegram-login-container" className="flex justify-center mb-4"></div>
      {authMutation.isPending && (
        <p className="text-sm text-gray-500">Авторизация...</p>
      )}
    </div>
  );
}
