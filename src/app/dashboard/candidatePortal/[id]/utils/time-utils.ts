export const convertTo24Hour = (hour: string, minute: string, amPm: "AM" | "PM"): string => {
  let hour24 = parseInt(hour);
  if (amPm === "PM" && hour24 !== 12) {
    hour24 += 12;
  } else if (amPm === "AM" && hour24 === 12) {
    hour24 = 0;
  }
  return `${hour24.toString().padStart(2, "0")}:${minute}`;
};

export const formatAnnualCtc = (annualCtc: number | string): string => {
  const numericCtc = typeof annualCtc === "number"
    ? annualCtc
    : parseFloat(String(annualCtc).replace(/,/g, "")) || 0;
  return `Rs. ${numericCtc.toLocaleString("en-IN")} per year`;
};

export const formatJoiningDate = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatSalary = (monthlySalary: number | string): string => {
  const numericSalary = typeof monthlySalary === 'number' 
    ? monthlySalary 
    : parseFloat(String(monthlySalary)) || 0;
  const annualSalary = numericSalary * 12;
  const lpa = annualSalary / 100000;
  return `Rs. ${numericSalary.toLocaleString("en-IN")}/month (${lpa.toFixed(2)} LPA)`;
};

