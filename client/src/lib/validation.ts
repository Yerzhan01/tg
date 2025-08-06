export function validateBinIin(value: string): boolean {
  // БИН/ИИН должен содержать ровно 12 цифр
  const cleanValue = value.replace(/\D/g, '');
  return cleanValue.length === 12;
}

export function validateIik(value: string): boolean {
  // ИИК должен начинаться с KZ и содержать 20 символов
  return /^KZ\d{18}$/.test(value);
}

export function validateBik(value: string): boolean {
  // БИК должен содержать 8 символов
  return value.length === 8;
}

export function validateAmount(value: number): boolean {
  // Сумма должна быть положительной
  return value > 0;
}

export function validateRequiredField(value: string): boolean {
  // Поле не должно быть пустым
  return value.trim().length > 0;
}

export function validateInvoiceNumber(value: string): boolean {
  // Номер счета не должен быть пустым
  return value.trim().length > 0;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
}
