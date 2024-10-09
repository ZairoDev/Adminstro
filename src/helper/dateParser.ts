import { formatDate } from "@fullcalendar/core";
export default function dateParser(date: string | Date) {
  if (date === "") return "";
  const localeDate = new Date(date).toLocaleDateString();
  const splitDate = localeDate.split(",")[0].split("/");
	const year = splitDate[2];
	const month = splitDate[0].length === 1 ? `0${splitDate[0]}` : splitDate[0];
	const day = splitDate[1].length === 1 ? `0${splitDate[1]}` : splitDate[1];
	const newDate = `${year}-${month}-${day}`;
  return newDate;
}
