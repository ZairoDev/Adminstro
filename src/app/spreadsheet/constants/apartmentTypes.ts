export const apartmentTypes = [
  { label: "Studio", value: "Studio" },
  { label: "1 Bedroom", value: "1 Bedroom" },
  { label: "2 Bedroom", value: "2 Bedroom" },
  { label: "3 Bedroom", value: "3 Bedroom" },
  { label: "4 Bedroom", value: "4 Bedroom" },
  { label: "Villa", value: "Villa" },
  { label: "Pent House", value: "Pent House" },
  { label: "Detached House", value: "Detached House" },
  { label: "Loft", value: "Loft" },
  { label: "Shared Apartment", value: "Shared Apartment" },
  { label: "Maisotte", value: "Maisotte" },
] 

export const interiorStatus = [
  { label: "F", value: "Fully Furnished" },
  { label: "S F", value: "SemiFurnished" },
  { label: "Un", value: "Unfurnished" },
] 

export const availabilityStatus = [
  { label: "A", value: "Available" },
  { label: "NA", value: "Not Available" },
] 

export const propertyTypeColors: Record<string, string> = {
  Studio: "bg-blue-200 dark:bg-blue-800/30 text-blue-900 dark:text-blue-200",
  "1 Bedroom": "bg-green-200 dark:bg-green-800/30 text-green-900 dark:text-green-200",
  "2 Bedroom": "bg-orange-200 dark:bg-orange-800/30 text-orange-900 dark:text-orange-200",
  "3 Bedroom": "bg-yellow-200 dark:bg-yellow-800/30 text-yellow-900 dark:text-yellow-200",
  "4 Bedroom": "bg-red-200 dark:bg-red-800/30 text-red-900 dark:text-red-200",
  Villa: "bg-rose-200 dark:bg-rose-800/30 text-rose-900 dark:text-rose-200",
  "Pent House": "bg-purple-200 dark:bg-purple-800/30 text-purple-900 dark:text-purple-200",
  "Detached House": "bg-cyan-200 dark:bg-cyan-800/30 text-cyan-900 dark:text-cyan-200",
  Loft: "bg-teal-200 dark:bg-teal-800/30 text-teal-900 dark:text-teal-200",
  "Shared Apartment": "bg-amber-200 dark:bg-amber-800/30 text-amber-900 dark:text-amber-200",
  Maisotte: "bg-lime-200 dark:bg-lime-800/30 text-lime-900 dark:text-lime-200",
};