import type { InboundProcessingOutcome } from "./persist";

/**
 * Mutable scratchpad passed through the inbound-message handler so the webhook
 * route can record exactly what happened to each message (saved / dropped / error)
 * without changing the handler's control flow.
 */
export type InboundTrace = {
  status?: InboundProcessingOutcome["processingStatus"];
  reason?: string;
  conversationId?: string;
  mongoMessageId?: string;
  eligibleUserCount?: number;
  socketEmittedCount?: number;
};

export function createInboundTrace(): InboundTrace {
  return {};
}

/** Mark the message as intentionally NOT stored. */
export function traceDropped(trace: InboundTrace, reason: string): void {
  trace.status = "dropped";
  trace.reason = reason;
}
