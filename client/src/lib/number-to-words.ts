export function numberToWords(num: number): string {
  const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  
  if (num === 0) return 'ноль тенге 0 тиын';
  if (num < 0) return 'минус ' + numberToWords(-num);
  
  const processThreeDigits = (n: number): string => {
    let result = '';
    
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    
    if (h > 0) {
      result += hundreds[h] + ' ';
    }
    
    if (t === 1) {
      result += teens[o] + ' ';
    } else {
      if (t > 1) {
        result += tens[t] + ' ';
      }
      if (o > 0) {
        result += ones[o] + ' ';
      }
    }
    
    return result.trim();
  };
  
  const getThousandsWord = (n: number): string => {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'тысяч';
    }
    
    switch (lastDigit) {
      case 1: return 'тысяча';
      case 2:
      case 3:
      case 4: return 'тысячи';
      default: return 'тысяч';
    }
  };
  
  const getMillionsWord = (n: number): string => {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'миллионов';
    }
    
    switch (lastDigit) {
      case 1: return 'миллион';
      case 2:
      case 3:
      case 4: return 'миллиона';
      default: return 'миллионов';
    }
  };
  
  let result = '';
  
  // Миллионы
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    result += processThreeDigits(millions) + ' ' + getMillionsWord(millions) + ' ';
    num %= 1000000;
  }
  
  // Тысячи
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    let thousandsWords = processThreeDigits(thousands);
    
    // Особые формы для тысяч (женский род)
    thousandsWords = thousandsWords.replace(/один$/, 'одна');
    thousandsWords = thousandsWords.replace(/два$/, 'две');
    
    result += thousandsWords + ' ' + getThousandsWord(thousands) + ' ';
    num %= 1000;
  }
  
  // Единицы, десятки, сотни
  if (num > 0) {
    result += processThreeDigits(num) + ' ';
  }
  
  result += 'тенге';
  
  return result.trim();
}
