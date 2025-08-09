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

    // Load Telegram Widget script with correct domain
    const loadTelegramWidget = async () => {
      try {
        const response = await fetch('/api/telegram/bot-info');
        const data = await response.json();
        const botUsername = data.botUsername || 'invoicekzbot';
        
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', botUsername);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-auth-url', window.location.origin + '/api/auth/telegram');
        script.async = true;

        const container = document.getElementById('telegram-login-container');
        if (container) {
          container.appendChild(script);
        }
      } catch (error) {
        console.error('Failed to load bot info, using fallback:', error);
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', 'invoicekzbot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
        script.setAttribute('data-request-access', 'write');
        script.async = true;

        const container = document.getElementById('telegram-login-container');
        if (container) {
          container.appendChild(script);
        }
      }
    };

    loadTelegramWidget();

    return () => {
      const container = document.getElementById('telegram-login-container');
      if (container) {
        // Remove all script children
        const scripts = container.querySelectorAll('script');
        scripts.forEach(script => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        });
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
