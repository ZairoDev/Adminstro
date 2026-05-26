/**
 * Build `/whatsapp` deep link from CRM lead fields (location drives the business line server-side).
 */
export function buildWhatsAppLeadOpenUrl(params: {
  phone: string;
  name?: string;
  profilePic?: string;
  location?: string;
  /** Defaults to guest when opening from lead tables */
  conversationType?: "owner" | "guest";
}): string {
  const search = new URLSearchParams();
  search.set("phone", params.phone);
  if (params.name?.trim()) search.set("name", params.name.trim());
  if (params.profilePic?.trim()) search.set("profilePic", params.profilePic.trim());
  if (params.location?.trim()) search.set("location", params.location.trim());
  const type = params.conversationType ?? "guest";
  search.set("conversationType", type);
  return `/whatsapp?${search.toString()}`;
}
