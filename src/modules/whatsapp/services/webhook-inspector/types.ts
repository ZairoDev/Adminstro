export type WebhookInspectorEventType =
  | "raw_webhook"
  | "status_received"
  | "status_processed"
  | "socket_emitted"
  | "send_api";

export type WebhookInspectorOutcome =
  | "message_not_found"
  | "duplicate_status"
  | "db_updated"
  | "db_update_skipped"
  | "processing_error"
  | "filtered_out"
  | "recorded";

export type WebhookInspectorEventRecord = {
  timestamp: Date;
  eventType: WebhookInspectorEventType;
  webhookType?: string;
  status?: string;
  messageId?: string;
  businessPhoneId?: string;
  wabaId?: string;
  customerPhone?: string;
  conversationFound?: boolean;
  conversationId?: string;
  messageFound?: boolean;
  mongoMessageId?: string;
  previousStatus?: string;
  newStatus?: string;
  databaseUpdated?: boolean;
  socketEmitted?: boolean;
  outcome?: WebhookInspectorOutcome;
  inspectorErrors?: string[];
  rawPayload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

export type WebhookInspectorFilter = {
  enabled: boolean;
  customerPhone?: string;
  messageId?: string;
  businessPhoneId?: string;
  conversationId?: string;
};

export type TimelineEntry = {
  timestamp: string;
  stage: string;
  detail: string;
  outcome?: string;
  messageId?: string;
  status?: string;
};

export type MessageDeliveryReport = {
  messageId: string;
  customerPhone?: string;
  conversationId?: string;
  businessPhoneId?: string;
  currentMongoStatus: string;
  statusEvents: Array<{ status: string; timestamp: string; source: "mongo" | "webhook_inspector" }>;
  timeline: TimelineEntry[];
  gaps: string[];
  conclusion:
    | "working"
    | "meta_never_delivered"
    | "crm_message_not_found"
    | "crm_db_not_updated"
    | "crm_socket_gap"
    | "ui_stale_possible"
    | "inconclusive";
  inspectorEventCount: number;
};
