export function generateMobilePin(length = 4): string {
  const digits = "0123456789";
  let pin = "";
  for (let i = 0; i < length; i++) {
    pin += digits[Math.floor(Math.random() * digits.length)];
  }
  return pin;
}

