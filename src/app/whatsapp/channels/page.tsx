import { redirect } from "next/navigation";

/** Redirect legacy path to the canonical dashboard location. */
export default function WhatsAppChannelsRedirect() {
  redirect("/dashboard/whatsapp/channels");
}
