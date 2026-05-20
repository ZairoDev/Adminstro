/** Remove all whitespace from phone input (spaces in pasted numbers, etc.). */
export function normalizeOwnerPhoneInput(value: string): string {
  return String(value ?? "").replace(/\s/g, "");
}
