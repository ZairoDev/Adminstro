import type { WebhookInspectorFilter } from "./types";

/** In-memory runtime overrides (set via admin API without restart). */
let runtimeFilter: Partial<WebhookInspectorFilter> | null = null;

function envBool(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function getWebhookInspectorFilter(): WebhookInspectorFilter {
  const fromEnv: WebhookInspectorFilter = {
    enabled: envBool("WEBHOOK_INSPECTOR_ENABLED"),
    customerPhone: process.env.WEBHOOK_INSPECTOR_FILTER_PHONE?.trim() || undefined,
    messageId: process.env.WEBHOOK_INSPECTOR_FILTER_MESSAGE_ID?.trim() || undefined,
    businessPhoneId:
      process.env.WEBHOOK_INSPECTOR_FILTER_BUSINESS_PHONE_ID?.trim() || undefined,
    conversationId:
      process.env.WEBHOOK_INSPECTOR_FILTER_CONVERSATION_ID?.trim() || undefined,
  };

  if (!runtimeFilter) return fromEnv;

  return {
    enabled: runtimeFilter.enabled ?? fromEnv.enabled,
    customerPhone: runtimeFilter.customerPhone ?? fromEnv.customerPhone,
    messageId: runtimeFilter.messageId ?? fromEnv.messageId,
    businessPhoneId: runtimeFilter.businessPhoneId ?? fromEnv.businessPhoneId,
    conversationId: runtimeFilter.conversationId ?? fromEnv.conversationId,
  };
}

export function setWebhookInspectorRuntimeFilter(
  patch: Partial<WebhookInspectorFilter> | null,
): WebhookInspectorFilter {
  runtimeFilter = patch;
  return getWebhookInspectorFilter();
}

export function isWebhookInspectorActive(): boolean {
  const f = getWebhookInspectorFilter();
  if (!f.enabled) return false;
  return Boolean(
    f.customerPhone || f.messageId || f.businessPhoneId || f.conversationId,
  );
}
