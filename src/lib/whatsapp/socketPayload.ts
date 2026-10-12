/**
 * Build socket emit payloads with stable channel routing keys.
 * Clients subscribe to whatsapp-phone-* and whatsapp-channel-* rooms.
 */
export function buildWhatsAppRoomPayload(
  conversation: Record<string, unknown> | null | undefined,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const businessPhoneId =
    (extra.businessPhoneId as string | undefined) ??
    (conversation?.businessPhoneId as string | undefined);

  const whatsappChannelId = conversation?.whatsappChannelId
    ? String(conversation.whatsappChannelId)
    : (extra.whatsappChannelId as string | undefined);

  return {
    ...extra,
    ...(businessPhoneId ? { businessPhoneId } : {}),
    ...(whatsappChannelId ? { whatsappChannelId } : {}),
  };
}
