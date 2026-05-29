import { buildWhatsAppLeadOpenUrl } from "@/lib/whatsapp/leadOpenUrl";

/** Deep link from Owner Sheet → in-app WhatsApp chat as an owner contact. */
export function buildOwnerSheetWhatsAppUrl(owner: {
  phoneNumber?: string | number | null;
  name?: string | null;
  location?: string | null;
}): string | null {
  const phone = String(owner.phoneNumber ?? "").replace(/\D/g, "");
  if (!phone) return null;

  return buildWhatsAppLeadOpenUrl({
    phone,
    name: owner.name ? String(owner.name) : undefined,
    location: owner.location ? String(owner.location) : undefined,
    conversationType: "owner",
  });
}
