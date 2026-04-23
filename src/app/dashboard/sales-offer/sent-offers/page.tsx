import { redirect } from "next/navigation";

export default function SentOffersRedirect() {
  redirect("/dashboard/sales-offer/pending-leads");
}
