// WhatsApp Business API Types

export type MessageType =
  | "text"
  | "image"
  | "document"
  | "audio"
  | "video"
  | "sticker"
  | "location"
  | "contacts"
  | "interactive"
  | "template"
  | "button";

export type MessageStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type MessageDirection = "incoming" | "outgoing";

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
  mimeType?: string;
  timestamp: Date;
  status: MessageStatus;
  direction: MessageDirection;
  templateName?: string;
  templateLanguage?: string;
  error?: string;
}

export interface WhatsAppContact {
  id: string;
  phone: string;
  name: string;
  profilePic?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  lastMessageStatus?: MessageStatus;
  unreadCount: number;
  isOnline?: boolean;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  category: string;
  components: WhatsAppTemplateComponent[];
}

export interface WhatsAppTemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
  buttons?: WhatsAppTemplateButton[];
}

export interface WhatsAppTemplateButton {
  type: "URL" | "PHONE_NUMBER" | "QUICK_REPLY";
  text: string;
  url?: string;
  phone_number?: string;
  example?: string[];
}

export interface SendTextMessagePayload {
  to: string;
  message: string;
}

export interface SendTemplateMessagePayload {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponentPayload[];
}

export interface TemplateComponentPayload {
  type: "header" | "body" | "button";
  parameters?: TemplateParameter[];
  sub_type?: "url" | "quick_reply";
  index?: string;
}

export interface TemplateParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video";
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

export interface SendMediaMessagePayload {
  to: string;
  mediaType: "image" | "document" | "audio" | "video" | "sticker";
  mediaUrl: string;
  caption?: string;
  filename?: string;
}

export interface SendLocationMessagePayload {
  to: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface SendContactMessagePayload {
  to: string;
  contacts: ContactInfo[];
}

export interface ContactInfo {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    suffix?: string;
    prefix?: string;
  };
  phones?: {
    phone: string;
    type?: "CELL" | "MAIN" | "IPHONE" | "HOME" | "WORK";
    wa_id?: string;
  }[];
  emails?: {
    email: string;
    type?: "HOME" | "WORK";
  }[];
  addresses?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    country_code?: string;
    type?: "HOME" | "WORK";
  }[];
  org?: {
    company?: string;
    department?: string;
    title?: string;
  };
  urls?: {
    url: string;
    type?: "HOME" | "WORK";
  }[];
  birthday?: string;
}

export interface SendInteractiveMessagePayload {
  to: string;
  type: "button" | "list" | "product" | "product_list";
  header?: InteractiveHeader;
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: InteractiveAction;
}

export interface InteractiveHeader {
  type: "text" | "image" | "video" | "document";
  text?: string;
  image?: { link: string };
  video?: { link: string };
  document?: { link: string; filename?: string };
}

export interface InteractiveAction {
  buttons?: InteractiveButton[];
  button?: string;
  sections?: InteractiveSection[];
  catalog_id?: string;
  product_retailer_id?: string;
}

export interface InteractiveButton {
  type: "reply";
  reply: {
    id: string;
    title: string;
  };
}

export interface InteractiveSection {
  title?: string;
  rows?: InteractiveRow[];
  product_items?: { product_retailer_id: string }[];
}

export interface InteractiveRow {
  id: string;
  title: string;
  description?: string;
}

// Webhook Types
export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  field: string;
  value: WebhookValue;
}

export interface WebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WebhookContact[];
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
}

export interface WebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: MessageType;
  text?: { body: string };
  image?: WebhookMedia;
  video?: WebhookMedia;
  audio?: WebhookMedia;
  document?: WebhookMedia & { filename?: string };
  sticker?: WebhookMedia;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contacts?: ContactInfo[];
  button?: {
    payload: string;
    text: string;
  };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  context?: {
    from: string;
    id: string;
  };
  errors?: WebhookError[];
}

export interface WebhookMedia {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

export interface WebhookStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin?: {
      type: "business_initiated" | "user_initiated" | "referral_conversion";
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: WebhookError[];
}

export interface WebhookError {
  code: number;
  title: string;
  message?: string;
  error_data?: {
    details: string;
  };
}

// API Response Types
export interface WhatsAppAPIResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  data?: any;
}

export interface TemplatesAPIResponse {
  success: boolean;
  templates?: WhatsAppTemplate[];
  error?: string;
}
