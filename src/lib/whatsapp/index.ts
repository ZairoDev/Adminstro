/**
 * WhatsApp module — unified inbox + location visibility.
 *
 * - Inbox/list/search: `inboxQuery`, `locationAccess`
 * - Per-conversation access: `access.canAccessConversation`
 * - Outbound sends: `resolveOutboundPhone.resolveOutboundBusinessPhoneId`
 * - Realtime: `notificationRecipients`, `emitToEligibleUsers`, `pusher.emitWhatsAppEvent`
 */

export {
  buildConversationVisibilityFilter,
  canUserSeeConversation,
  getUserAreasFromToken,
  locationKeyFromDisplay,
  assertLocationAllowedForCreate,
  applyInboxLocationFilter,
  applySuperAdminInboxLocationFilter,
  buildAdminQueueFilter,
  SUPERADMIN_INBOX_LOCATION_ALL,
  SUPERADMIN_DEFAULT_INBOX_LOCATION,
} from "./locationAccess";

export {
  canAccessConversation,
  shouldEmitToUser,
  assertAccessOrThrow,
} from "./access";

export {
  normalizeWhatsAppToken,
  resolveAllowedPhoneIds,
  requireWhatsAppAccess,
  isWhatsAppRole,
  hasFullWhatsAppAccess,
} from "./apiContext";

export { buildInboxListQuery, parseInboxListParams } from "./inboxQuery";

export { resolveOutboundBusinessPhoneId } from "./resolveOutboundPhone";

export { getEligibleUsersForNotification } from "./notificationRecipients";

export { emitWhatsAppEventToEligibleUsers } from "./emitToEligibleUsers";

export {
  canAccessWhatsAppAdminQueue,
  canUseInboxLocationFilter,
  getInboxLocationFilterOptionsForUser,
  isWhatsAppLocationCoordinatorEmail,
} from "./participantLocationPrivileges";

export {
  usesUnifiedWhatsAppInbox,
  getAllowedPhoneIds,
  getAllPhoneConfigsWithInternal,
  WHATSAPP_ACCESS_ROLES,
  FULL_ACCESS_ROLES,
  INTERNAL_YOU_PHONE_ID,
} from "./config";

export {
  resolveWhatsappChannel,
  getChannelByPhoneNumberId,
  getOutboundTokenForPhoneId,
  assertLocationRentalTypeUnique,
  normalizeChannelLocationKeys,
} from "./channelService";

export {
  rentalTypeVisibleToUser,
  buildRentalTypeVisibilityClause,
  isRentalTypeFullAccessRole,
  normalizeChannelRentalType,
  WHATSAPP_CHANNEL_RENTAL_TYPES,
  DEFAULT_CONVERSATION_RENTAL_TYPE,
  resolveCreateConversationRentalType,
} from "./rentalTypeAccess";
