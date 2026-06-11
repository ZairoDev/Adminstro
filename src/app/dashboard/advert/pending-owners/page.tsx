import { redirect } from "next/navigation";

export default function PendingOwnersRedirectPage() {
  redirect("/dashboard/user?tab=listing-queue");
}
