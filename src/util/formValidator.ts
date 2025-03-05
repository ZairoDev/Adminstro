export const FormValidator = (req: Object) => {
  const emptyFields: string[] = [];
  Object.entries(req).forEach(([key, value]) => {
    if (value === "" || value === null || value === undefined || value.length === 0) {
      const fieldName = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      emptyFields.push(fieldName);
    }
  });
  if (emptyFields.length > 0) {
    // {description: `Please fill in the following required fields: ${emptyFields.join(
    //   ", "
    // )}`},
    return `Please fill in the following required fields: ${emptyFields.join(", ")}`;
  }
  return "";
};
