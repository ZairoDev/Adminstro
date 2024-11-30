// utils/validateDuration.ts
interface FormData {
  bookingTerm: string;
  duration: string;
}

export const validateAndSetDuration = <
  T extends { bookingTerm: string; duration: string }
>(
  value: string,
  bookingTerm: string,
  setFormData: React.Dispatch<React.SetStateAction<T>>
) => {
  let durationValues = value.split("-").map(Number);

  if (bookingTerm === "Short Term") {
    if (
      durationValues.length === 2 &&
      durationValues[0] >= 1 &&
      durationValues[0] <= 30 &&
      durationValues[1] <= 30
    ) {
      setFormData((prevData) => ({
        ...prevData,
        duration: value,
      }));
    } else if (
      durationValues.length === 1 &&
      durationValues[0] >= 1 &&
      durationValues[0] <= 30
    ) {
      setFormData((prevData) => ({
        ...prevData,
        duration: `${durationValues[0]}-${durationValues[0]}`,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        duration: "",
      }));
    }
  } else if (bookingTerm === "Mid Term") {
    if (
      durationValues.length === 2 &&
      durationValues[0] >= 1 &&
      durationValues[0] <= 3 &&
      durationValues[1] <= 3
    ) {
      setFormData((prevData) => ({
        ...prevData,
        duration: value,
      }));
    } else if (
      durationValues.length === 1 &&
      durationValues[0] >= 1 &&
      durationValues[0] <= 3
    ) {
      setFormData((prevData) => ({
        ...prevData,
        duration: `${durationValues[0]}-${durationValues[0]}`,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        duration: "",
      }));
    }
  } else if (bookingTerm === "Long Term") {
    if (durationValues.length === 2 && durationValues[0] >= 4) {
      setFormData((prevData) => ({
        ...prevData,
        duration: value,
      }));
    } else if (durationValues.length === 1 && durationValues[0] >= 4) {
      setFormData((prevData) => ({
        ...prevData,
        duration: `${durationValues[0]}-${durationValues[0]}`,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        duration: "",
      }));
    }
  }
};
