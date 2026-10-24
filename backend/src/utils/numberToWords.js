// Convert number to Indian Currency Words (Rupees & Paise)
const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanOneThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)] + ' ';
    n %= 10;
  }
  if (n > 0) {
    str += ones[n] + ' ';
  }
  return str.trim();
}

export function numberToWordsINR(amount) {
  if (amount === 0 || isNaN(amount)) return 'Zero Rupees Only';

  const num = Math.abs(Number(amount));
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let current = integerPart;
  let result = '';

  const crores = Math.floor(current / 10000000);
  current %= 10000000;

  const lakhs = Math.floor(current / 100000);
  current %= 100000;

  const thousands = Math.floor(current / 1000);
  current %= 1000;

  const remainder = current;

  if (crores > 0) {
    result += convertLessThanOneThousand(crores) + ' Crore ';
  }
  if (lakhs > 0) {
    result += convertLessThanOneThousand(lakhs) + ' Lakh ';
  }
  if (thousands > 0) {
    result += convertLessThanOneThousand(thousands) + ' Thousand ';
  }
  if (remainder > 0) {
    result += convertLessThanOneThousand(remainder) + ' ';
  }

  result = result.trim();
  if (result.length === 0) {
    result = 'Zero';
  }

  let finalStr = 'Rupees ' + result;

  if (decimalPart > 0) {
    finalStr += ' and ' + convertLessThanOneThousand(decimalPart) + ' Paise';
  }

  finalStr += ' Only';
  return finalStr;
}

export default numberToWordsINR;
