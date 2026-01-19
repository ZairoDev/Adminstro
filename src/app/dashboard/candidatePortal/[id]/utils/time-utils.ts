export const convertTo24Hour = (hour: string, minute: string, amPm: "AM" | "PM"): string => {
  let hour24 = parseInt(hour);
  if (amPm === "PM" && hour24 !== 12) {
    hour24 += 12;
  } else if (amPm === "AM" && hour24 === 12) {
    hour24 = 0;
  }
  return `${hour24.toString().padStart(2, "0")}:${minute}`;
};

export const formatSalary = (monthlySalary: number | string): string => {
  const numericSalary = typeof monthlySalary === 'number' 
    ? monthlySalary 
    : parseFloat(String(monthlySalary)) || 0;
  const annualSalary = numericSalary * 12;
  const lpa = annualSalary / 100000;
  return `Rs. ${numericSalary.toLocaleString("en-IN")}/month (${lpa.toFixed(2)} LPA)`;
};

