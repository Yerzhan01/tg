// Import full PT Sans fonts
import { PTSansRegularFont } from './PTSans-Regular';
import { PTSansBoldFont } from './PTSans-Bold';

// Register PT Sans fonts in jsPDF with full font data
export function registerPTSansFont(doc: any) {
  try {
    // Register PT Sans Regular with full font data
    doc.addFileToVFS('PTSans-Regular.ttf', PTSansRegularFont);
    doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal');
    
    // Register PT Sans Bold with full font data
    doc.addFileToVFS('PTSans-Bold.ttf', PTSansBoldFont);
    doc.addFont('PTSans-Bold.ttf', 'PTSans', 'bold');
    
    console.log('✅ PT Sans fonts registered successfully - full Cyrillic and Kazakh support enabled');
    return true;
  } catch (error) {
    console.warn('❌ Failed to register PT Sans fonts:', error);
    return false;
  }
}

// Fallback function for text transliteration if font fails
export function ensureCyrillicSupport(text: string): string {
  // If PT Sans font is not available, we can transliterate Cyrillic to Latin
  // This is a fallback only - PT Sans should handle Cyrillic properly
  const cyrillicMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    // Kazakh specific characters
    'ә': 'a', 'ғ': 'g', 'қ': 'q', 'ң': 'n', 'ө': 'o', 'ұ': 'u',
    'ү': 'u', 'һ': 'h', 'і': 'i',
    'Ә': 'A', 'Ғ': 'G', 'Қ': 'Q', 'Ң': 'N', 'Ө': 'O', 'Ұ': 'U',
    'Ү': 'U', 'Һ': 'H', 'І': 'I'
  };
  
  return text.split('').map(char => cyrillicMap[char] || char).join('');
}