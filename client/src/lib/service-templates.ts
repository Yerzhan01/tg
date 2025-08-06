// Предустановленные шаблоны услуг для различных типов бизнеса

export interface ServiceTemplate {
  id: string;
  name: string;
  category: string;
  services: Array<{
    name: string;
    unit: string;
    price?: number;
  }>;
}

export const serviceTemplates: ServiceTemplate[] = [
  {
    id: 'it-services',
    name: 'IT услуги',
    category: 'Информационные технологии',
    services: [
      { name: 'Разработка веб-сайта', unit: 'шт', price: 500000 },
      { name: 'Настройка сервера', unit: 'час', price: 15000 },
      { name: 'Техническая поддержка', unit: 'час', price: 8000 },
      { name: 'Консультация по IT', unit: 'час', price: 12000 },
      { name: 'Разработка мобильного приложения', unit: 'шт', price: 800000 },
    ]
  },
  {
    id: 'design-services',
    name: 'Дизайн услуги',
    category: 'Креативные услуги',
    services: [
      { name: 'Разработка логотипа', unit: 'шт', price: 80000 },
      { name: 'Дизайн визитки', unit: 'шт', price: 15000 },
      { name: 'Дизайн баннера', unit: 'шт', price: 25000 },
      { name: 'Фирменный стиль', unit: 'комплект', price: 200000 },
      { name: 'Дизайн упаковки', unit: 'шт', price: 120000 },
    ]
  },
  {
    id: 'marketing-services',
    name: 'Маркетинг услуги',
    category: 'Маркетинг и реклама',
    services: [
      { name: 'SMM продвижение', unit: 'месяц', price: 100000 },
      { name: 'Контекстная реклама', unit: 'месяц', price: 150000 },
      { name: 'SEO оптимизация', unit: 'месяц', price: 120000 },
      { name: 'Создание контента', unit: 'пост', price: 8000 },
      { name: 'Маркетинговая стратегия', unit: 'шт', price: 300000 },
    ]
  },
  {
    id: 'consulting-services',
    name: 'Консалтинг услуги',
    category: 'Консультации',
    services: [
      { name: 'Бизнес консультация', unit: 'час', price: 20000 },
      { name: 'Юридическая консультация', unit: 'час', price: 18000 },
      { name: 'Финансовая консультация', unit: 'час', price: 25000 },
      { name: 'Налоговая консультация', unit: 'час', price: 15000 },
      { name: 'HR консультация', unit: 'час', price: 12000 },
    ]
  },
  {
    id: 'education-services',
    name: 'Образовательные услуги',
    category: 'Образование',
    services: [
      { name: 'Индивидуальный урок', unit: 'час', price: 8000 },
      { name: 'Групповой урок', unit: 'час', price: 5000 },
      { name: 'Онлайн курс', unit: 'шт', price: 50000 },
      { name: 'Тренинг', unit: 'день', price: 30000 },
      { name: 'Мастер-класс', unit: 'шт', price: 15000 },
    ]
  },
  {
    id: 'translation-services',
    name: 'Переводческие услуги',
    category: 'Переводы',
    services: [
      { name: 'Письменный перевод', unit: 'страница', price: 3000 },
      { name: 'Устный перевод', unit: 'час', price: 12000 },
      { name: 'Нотариальный перевод', unit: 'страница', price: 5000 },
      { name: 'Технический перевод', unit: 'страница', price: 4000 },
      { name: 'Медицинский перевод', unit: 'страница', price: 4500 },
    ]
  },
  {
    id: 'repair-services',
    name: 'Ремонтные услуги',
    category: 'Ремонт и обслуживание',
    services: [
      { name: 'Ремонт компьютера', unit: 'шт', price: 15000 },
      { name: 'Ремонт телефона', unit: 'шт', price: 20000 },
      { name: 'Установка программного обеспечения', unit: 'шт', price: 5000 },
      { name: 'Настройка оборудования', unit: 'час', price: 8000 },
      { name: 'Диагностика неисправностей', unit: 'шт', price: 3000 },
    ]
  },
  {
    id: 'delivery-services',
    name: 'Курьерские услуги',
    category: 'Доставка',
    services: [
      { name: 'Курьерская доставка по городу', unit: 'шт', price: 2000 },
      { name: 'Экспресс доставка', unit: 'шт', price: 3500 },
      { name: 'Межгородняя доставка', unit: 'шт', price: 8000 },
      { name: 'Доставка документов', unit: 'шт', price: 1500 },
      { name: 'Крупногабаритная доставка', unit: 'шт', price: 5000 },
    ]
  }
];

export function getTemplatesByCategory(): Record<string, ServiceTemplate[]> {
  return serviceTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, ServiceTemplate[]>);
}

export function getTemplateById(id: string): ServiceTemplate | undefined {
  return serviceTemplates.find(template => template.id === id);
}