import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import InvoiceGenerator from '@/components/invoice-generator';

interface InvoiceData {
  id: string;
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
  services: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }>;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid';
}

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['/api/invoices', id],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }
      return response.json();
    },
    enabled: !!id
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });
      if (!response.ok) {
        throw new Error('Failed to update invoice');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Счет обновлен",
        description: "Изменения успешно сохранены",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setLocation('/invoices');
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить счет",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка счета...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Счет не найден</h2>
          <p className="text-gray-600 mb-6">Возможно, счет был удален или у вас нет доступа к нему</p>
          <button
            onClick={() => setLocation('/invoices')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Вернуться к списку счетов
          </button>
        </div>
      </div>
    );
  }

  // Transform invoice data to match InvoiceGenerator format
  const initialData = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate.split('T')[0], // Convert to YYYY-MM-DD format
    contract: invoice.contract || '',
    supplier: {
      name: invoice.supplier?.name || '',
      bin: invoice.supplier?.bin || '',
      address: invoice.supplier?.address || '',
      bank: invoice.supplier?.bank || '',
      bik: invoice.supplier?.bik || '',
      iik: invoice.supplier?.iik || '',
      kbe: invoice.supplier?.kbe || '',
      paymentCode: invoice.supplier?.paymentCode || ''
    },
    buyer: {
      name: invoice.buyer?.name || '',
      bin: invoice.buyer?.bin || '',
      address: invoice.buyer?.address || ''
    },
    services: invoice.items?.map((item: any, index: number) => ({
      id: item.id || `service-${index}`,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
      total: typeof item.total === 'string' ? parseFloat(item.total) : item.total
    })) || []
  };

  const handleSave = (invoiceData: any) => {
    const transformedData = {
      ...invoiceData,
      supplier: invoiceData.supplier,
      buyer: invoiceData.buyer,
      items: invoiceData.services.map((service: any) => ({
        name: service.name,
        quantity: service.quantity,
        unit: service.unit,
        price: service.price,
        total: service.total
      })),
      totalAmount: invoiceData.services.reduce((sum: number, service: any) => sum + service.total, 0)
    };

    updateInvoiceMutation.mutate(transformedData);
  };

  return (
    <InvoiceGenerator 
      initialData={initialData}
      onSave={handleSave}
      isEditing={true}
      isLoading={updateInvoiceMutation.isPending}
    />
  );
}