// Festival dates in MM-DD format
// Update yearly festivals as needed (Diwali, Holi dates change each year)
export const festivals: Record<string, string> = {
  "01-26": "Republic Day",
  "08-15": "Independence Day",
  "10-02": "Gandhi Jayanti",
  "12-25": "Christmas",

  // Update these dates yearly
  "11-01": "Diwali",
  "03-25": "Holi",
};

export function getTodayFestival(): string | null {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const key = `${month}-${day}`;
  
  return festivals[key] || null;
}
