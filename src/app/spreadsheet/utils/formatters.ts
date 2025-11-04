export const formatPhoneNumber = (value: string): string => {
  return value.replace(/[\s+]/g, "");
};

/**
 * Remove all whitespace from a string
 */
export const removeWhitespace = (value: string): string => {
  return value.replace(/\s/g, "");
};

/**
 * Format currency by removing non-numeric characters except decimal point
 */
export const formatCurrency = (value: string): string => {
  return value.replace(/[^\d.]/g, "");
};

/**
 * Trim and normalize whitespace (multiple spaces to single space)
 */
export const normalizeWhitespace = (value: string): string => {
  return value.trim().replace(/\s+/g, " ");
};
