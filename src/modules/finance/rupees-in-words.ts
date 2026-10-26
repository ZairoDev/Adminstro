const BELOW_TWENTY = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
] as const;

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
] as const;

function twoDigits(value: number): string {
  if (value < 20) return BELOW_TWENTY[value] ?? "";
  const ten = Math.floor(value / 10);
  const one = value % 10;
  const tens = TENS[ten] ?? "";
  return one ? `${tens} ${BELOW_TWENTY[one]}` : tens;
}

function threeDigits(value: number): string {
  if (value < 100) return twoDigits(value);
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const hundredWords = `${BELOW_TWENTY[hundred]} Hundred`;
  return rest ? `${hundredWords} ${twoDigits(rest)}` : hundredWords;
}

function indianIntegerWords(value: number): string {
  if (value === 0) return "Zero";
  if (value < 1000) return threeDigits(value);

  const parts: string[] = [];
  let remaining = value;
  const crore = Math.floor(remaining / 10_000_000);
  remaining %= 10_000_000;
  const lakh = Math.floor(remaining / 100_000);
  remaining %= 100_000;
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  if (crore) parts.push(`${indianIntegerWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (remaining) parts.push(threeDigits(remaining));
  return parts.join(" ");
}

export function rupeesInWords(amount: number): string {
  const paiseTotal = Math.round(amount * 100);
  const rupees = Math.floor(Math.abs(paiseTotal) / 100);
  const paise = Math.abs(paiseTotal) % 100;
  const rupeeLabel = rupees === 1 ? "Rupee" : "Rupees";
  const main = `${indianIntegerWords(rupees)} ${rupeeLabel}`;
  if (paise === 0) return `${main} Only`;
  const paiseLabel = paise === 1 ? "Paisa" : "Paise";
  return `${main} and ${twoDigits(paise)} ${paiseLabel} Only`;
}
