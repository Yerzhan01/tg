/**
 * Конвертация чисел в текстовый формат на казахском/русском языке
 * для указания суммы прописью в счетах-фактурах
 */

const ones = [
  '', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'
];

const teens = [
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 
  'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'
];

const tens = [
  '', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 
  'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'
];

const hundreds = [
  '', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 
  'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'
];

const thousands = ['', 'тысяча', 'тысячи', 'тысяч'];
const millions = ['', 'миллион', 'миллиона', 'миллионов'];

function getNumeral(num: number, gender: 'male' | 'female' = 'male'): string {
  if (num === 0) return 'ноль';
  if (num === 1) return gender === 'female' ? 'одна' : 'один';
  if (num === 2) return gender === 'female' ? 'две' : 'два';
  return ones[num] || '';
}

function convertThreeDigits(num: number, gender: 'male' | 'female' = 'male'): string {
  if (num === 0) return '';
  
  let result = '';
  const h = Math.floor(num / 100);
  const remaining = num % 100;
  const t = Math.floor(remaining / 10);
  const o = remaining % 10;
  
  if (h > 0) {
    result += hundreds[h] + ' ';
  }
  
  if (remaining >= 10 && remaining <= 19) {
    result += teens[remaining - 10] + ' ';
  } else {
    if (t > 0) {
      result += tens[t] + ' ';
    }
    if (o > 0) {
      result += getNumeral(o, gender) + ' ';
    }
  }
  
  return result.trim();
}

function getPlural(num: number, forms: string[]): string {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return forms[3] || forms[2]; // Для чисел 11-14 используем форму "много"
  }
  
  if (lastDigit === 1) {
    return forms[1]; // Единственное число
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    return forms[2]; // 2-4
  } else {
    return forms[3] || forms[2]; // 5-9, 0
  }
}

export function convertNumberToKazakhWords(amount: number): string {
  if (amount === 0) {
    return 'ноль тенге';
  }
  
  const integerPart = Math.floor(amount);
  const fractionalPart = Math.round((amount - integerPart) * 100);
  
  let result = '';
  
  if (integerPart === 0) {
    result = 'ноль';
  } else {
    const millions = Math.floor(integerPart / 1000000);
    const thousands = Math.floor((integerPart % 1000000) / 1000);
    const units = integerPart % 1000;
    
    if (millions > 0) {
      result += convertThreeDigits(millions) + ' ';
      result += getPlural(millions, ['', 'миллион', 'миллиона', 'миллионов']) + ' ';
    }
    
    if (thousands > 0) {
      result += convertThreeDigits(thousands, 'female') + ' ';
      result += getPlural(thousands, ['', 'тысяча', 'тысячи', 'тысяч']) + ' ';
    }
    
    if (units > 0) {
      result += convertThreeDigits(units) + ' ';
    }
  }
  
  // Добавляем валюту
  result += getPlural(integerPart, ['', 'тенге', 'тенге', 'тенге']);
  
  // Добавляем копейки только если есть дробная часть
  if (fractionalPart > 0) {
    result += ` ${fractionalPart.toString().padStart(2, '0')} `;
    result += getPlural(fractionalPart, ['', 'тиын', 'тиын', 'тиын']);
  }
  // Убираем автоматическое добавление "00 тиын" для целых сумм
  
  return result.trim();
}

// Вспомогательная функция для тестирования
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}