/**
 * Convert a paise amount to Indian Rupee words.
 * e.g., 1050050 paise → "Ten Thousand Five Hundred Rupees and Fifty Paise Only"
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function twoDigitWords(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? ' ' + ones[o] : '');
}

function threeDigitWords(n: number): string {
  if (n === 0) return '';
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  let result = '';
  if (hundreds > 0) {
    result = ones[hundreds] + ' Hundred';
    if (remainder > 0) result += ' and ';
  }
  if (remainder > 0) {
    result += twoDigitWords(remainder);
  }
  return result;
}

/**
 * Converts a number to Indian numbering system words.
 * Indian system: Ones, Thousands, Lakhs, Crores
 */
function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero';

  let result = '';
  
  // Crores (10,000,000+)
  const crores = Math.floor(num / 10000000);
  if (crores > 0) {
    result += threeDigitWords(crores) + ' Crore ';
    num %= 10000000;
  }

  // Lakhs (100,000 - 9,999,999)
  const lakhs = Math.floor(num / 100000);
  if (lakhs > 0) {
    result += twoDigitWords(lakhs) + ' Lakh ';
    num %= 100000;
  }

  // Thousands (1,000 - 99,999)
  const thousands = Math.floor(num / 1000);
  if (thousands > 0) {
    result += twoDigitWords(thousands) + ' Thousand ';
    num %= 1000;
  }

  // Hundreds and below
  if (num > 0) {
    result += threeDigitWords(num);
  }

  return result.trim();
}

/**
 * Convert paise amount to Indian Rupee words.
 * @param amountInPaise - Amount in paise (integer)
 * @returns e.g., "One Thousand One Hundred Eighty Rupees Only"
 */
export function paiseToWords(amountInPaise: number): string {
  if (amountInPaise < 0) amountInPaise = Math.abs(amountInPaise);

  const rupees = Math.floor(amountInPaise / 100);
  const paise = amountInPaise % 100;

  let result = '';

  if (rupees > 0) {
    result = numberToIndianWords(rupees) + ' Rupees';
  }

  if (paise > 0) {
    if (rupees > 0) result += ' and ';
    result += numberToIndianWords(paise) + ' Paise';
  }

  if (!result) return 'Zero Rupees Only';

  return result + ' Only';
}

/**
 * Convert a rupee float to words (convenience for display).
 * @param rupeeAmount - Amount in rupees (e.g., 1180.50)
 */
export function rupeesToWords(rupeeAmount: number): string {
  const paise = Math.round(rupeeAmount * 100);
  return paiseToWords(paise);
}

export default paiseToWords;
