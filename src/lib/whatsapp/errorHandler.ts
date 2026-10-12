/**
 * WhatsApp Error Handler
 * Centralized error code classification and user-facing messages
 */

export type ErrorSeverity = "info" | "warning" | "critical";
export type SystemAction = "retry" | "block" | "wait" | "manual_fix" | "no_action";

export interface WhatsAppErrorInfo {
  code: number;
  userMessage: string;
  systemAction: SystemAction;
  severity: ErrorSeverity;
  canRetry: boolean;
  shouldBlock: boolean;
  retryAfter?: number; // minutes
  description: string;
}

/**
 * Centralized error code mapping
 * Maps WhatsApp API error codes to user-facing messages and system actions
 */
const ERROR_MAP: Record<number, WhatsAppErrorInfo> = {
  // A. Authentication & Permission Errors
  0: {
    code: 0,
    userMessage: "Message not sent: Authentication or permission issue.",
    systemAction: "no_action",
    severity: "critical",
    canRetry: false,
    shouldBlock: false,
    description: "Authentication token expired or invalid. Requires admin attention.",
  },
  131005: {
    code: 131005,
    userMessage: "Message not sent: Authentication or permission issue.",
    systemAction: "no_action",
    severity: "critical",
    canRetry: false,
    shouldBlock: false,
    description: "Permission denied. Check API token and permissions.",
  },

  // B. Phone Number / Recipient Errors
  131026: {
    code: 131026,
    userMessage: "Message not sent: This number is not available on WhatsApp or has blocked messages.",
    systemAction: "block",
    severity: "warning",
    canRetry: false,
    shouldBlock: true,
    description: "Recipient number is not on WhatsApp, has blocked messages, or is temporarily unavailable.",
  },
  131021: {
    code: 131021,
    userMessage: "Message not sent: Sender and recipient number are the same.",
    systemAction: "block",
    severity: "warning",
    canRetry: false,
    shouldBlock: true,
    description: "Cannot send message to the same number (sender = recipient).",
  },
  130472: {
    code: 130472,
    userMessage: "Message not sent: Recipient is temporarily unavailable.",
    systemAction: "wait",
    severity: "info",
    canRetry: true,
    shouldBlock: false,
    retryAfter: 60, // 1 hour
    description: "Recipient phone is temporarily unavailable. Can retry after cooldown.",
  },

  // C. Message Policy / Engagement Errors
  131047: {
    code: 131047,
    userMessage: "Message not sent: 24-hour window expired. Template required.",
    systemAction: "manual_fix",
    severity: "warning",
    canRetry: false,
    shouldBlock: false,
    description: "24-hour messaging window expired. Must use approved template for next message.",
  },
  131048: {
    code: 131048,
    userMessage: "Message restricted due to quality issues.",
    systemAction: "wait",
    severity: "warning",
    canRetry: false,
    shouldBlock: false,
    retryAfter: 1440, // 24 hours
    description: "Message restricted due to quality or engagement issues. Wait before retrying.",
  },
  131049: {
    code: 131049,
    userMessage: "Message not delivered to maintain a healthy WhatsApp ecosystem.",
    systemAction: "block",
    severity: "critical",
    canRetry: false,
    shouldBlock: true,
    description: "User blocked us or Meta detected spam. Permanent block - do not retry.",
  },
  131056: {
    code: 131056,
    userMessage: "Message rate limit reached for this recipient.",
    systemAction: "wait",
    severity: "warning",
    canRetry: true,
    shouldBlock: false,
    retryAfter: 60, // 1 hour
    description: "Rate limit exceeded for this specific recipient. Wait before retrying.",
  },

  // D. Template & Content Errors
  132001: {
    code: 132001,
    userMessage: "Message not sent: Template or message content issue.",
    systemAction: "manual_fix",
    severity: "critical",
    canRetry: false,
    shouldBlock: false,
    description: "Template not found, expired, or content validation failed. Fix template/content before retrying.",
  },
  132007: {
    code: 132007,
    userMessage: "Message not sent: Template or message content issue.",
    systemAction: "manual_fix",
    severity: "critical",
    canRetry: false,
    shouldBlock: false,
    description: "Template parameter validation failed. Check template parameters.",
  },
  131008: {
    code: 131008,
    userMessage: "Message not sent: Template or message content issue.",
    systemAction: "manual_fix",
    severity: "critical",
    canRetry: false,
    shouldBlock: false,
    description: "Message content violates WhatsApp policies. Review and fix content.",
  },
  131009: {
    code: 131009,
    userMessage: "Message not sent: Template or message content issue.",
    systemAction: "manual_fix",
    severity: "critical",
    canRetry: false,
    shouldBlock: false,
    description: "Message format or structure is invalid. Fix message format.",
  },
  131052: {
    code: 131052,
    userMessage: "Message not sent: Template or message content issue.",
    systemAction: "manual_fix",
    severity: "critical",
    canRetry: false,
    shouldBlock: false,
    description: "Template language or locale mismatch. Fix template configuration.",
  },

  // E. Rate Limiting / Throughput Errors
  4: {
    code: 4,
    userMessage: "Message not sent: Rate limit exceeded.",
    systemAction: "retry",
    severity: "info",
    canRetry: true,
    shouldBlock: false,
    retryAfter: 5, // 5 minutes
    description: "API rate limit exceeded. Retry after short delay.",
  },
  130429: {
    code: 130429,
    userMessage: "Message not sent: Rate limit exceeded.",
    systemAction: "retry",
    severity: "info",
    canRetry: true,
    shouldBlock: false,
    retryAfter: 10, // 10 minutes
    description: "Too many requests. Rate limit exceeded. Retry after delay.",
  },
  80007: {
    code: 80007,
    userMessage: "Message not sent: Rate limit exceeded.",
    systemAction: "retry",
    severity: "info",
    canRetry: true,
    shouldBlock: false,
    retryAfter: 5, // 5 minutes
    description: "User rate limit exceeded. Retry after short delay.",
  },

  // F. Technical / Server Errors
  131000: {
    code: 131000,
    userMessage: "Message not sent due to a temporary system issue.",
    systemAction: "retry",
    severity: "info",
    canRetry: true,
    shouldBlock: false,
    retryAfter: 2, // 2 minutes
    description: "Internal server error. Retry automatically with backoff.",
  },
  131016: {
    code: 131016,
    userMessage: "Message not sent due to a temporary system issue.",
    systemAction: "retry",
    severity: "info",
    canRetry: true,
    shouldBlock: false,
    retryAfter: 2, // 2 minutes
    description: "Service temporarily unavailable. Retry automatically.",
  },
  500: {
    code: 500,
    userMessage: "Message not sent due to a temporary system issue.",
    systemAction: "retry",
    severity: "info",
    canRetry: true,
    shouldBlock: false,
    retryAfter: 2, // 2 minutes
    description: "Internal server error. Retry automatically.",
  },
  502: {
    code: 502,
    userMessage: "Message not sent due to a temporary system issue.",
    systemAction: "retry",
    severity: "info",
    canRetry: true,
    shouldBlock: false,
    retryAfter: 2, // 2 minutes
    description: "Bad gateway. Retry automatically.",
  },
  503: {
    code: 503,
    userMessage: "Message not sent due to a temporary system issue.",
    systemAction: "retry",
    severity: "info",
    canRetry: true,
    shouldBlock: false,
    retryAfter: 2, // 2 minutes
    description: "Service unavailable. Retry automatically.",
  },

  // Additional known codes
  131042: {
    code: 131042,
    userMessage: "Message not sent: Billing issue detected.",
    systemAction: "no_action",
    severity: "critical",
    canRetry: false,
    shouldBlock: false,
    description: "Account billing problem. Requires admin attention. No retry until resolved.",
  },
  131215: {
    code: 131215,
    userMessage: "Message not sent: Cannot message groups.",
    systemAction: "block",
    severity: "warning",
    canRetry: false,
    shouldBlock: true,
    description: "Groups are not eligible for messaging. Permanent block.",
  },
};

/**
 * Get error information for a given error code
 * @param errorCode - WhatsApp API error code
 * @returns Error information or default unknown error
 */
export function getWhatsAppErrorInfo(errorCode: number | string | null | undefined): WhatsAppErrorInfo {
  if (!errorCode) {
    return {
      code: 0,
      userMessage: "Message not sent: Unknown error occurred.",
      systemAction: "no_action",
      severity: "warning",
      canRetry: false,
      shouldBlock: false,
      description: "Unknown error code. Check logs for details.",
    };
  }

  const code = typeof errorCode === "string" ? parseInt(errorCode, 10) : errorCode;
  const errorInfo = ERROR_MAP[code];

  if (errorInfo) {
    return errorInfo;
  }

  // Default for unknown error codes
  return {
    code,
    userMessage: `Message not sent: Error code ${code}.`,
    systemAction: "no_action",
    severity: "warning",
    canRetry: false,
    shouldBlock: false,
    description: `Unknown error code ${code}. Check WhatsApp API documentation.`,
  };
}

/**
 * Get user-facing action message based on system action
 * @param errorInfo - Error information
 * @returns Human-readable action message
 */
export function getActionMessage(errorInfo: WhatsAppErrorInfo): string {
  switch (errorInfo.systemAction) {
    case "retry":
      if (errorInfo.retryAfter) {
        return `Can retry after ${errorInfo.retryAfter} minute(s).`;
      }
      return "Can retry automatically.";
    case "block":
      return "Lead is blocked. Do not send more messages.";
    case "wait":
      if (errorInfo.retryAfter) {
        return `Wait ${errorInfo.retryAfter} minute(s) before retrying.`;
      }
      return "Wait before retrying.";
    case "manual_fix":
      return "Requires manual fix before retrying.";
    case "no_action":
      return "No action needed. Check system logs.";
    default:
      return "Check error details.";
  }
}

/**
 * Get full error message with action for UI display
 * @param errorCode - WhatsApp API error code
 * @returns Full error message with suggested action
 */
export function getFullErrorMessage(errorCode: number | string | null | undefined): string {
  const errorInfo = getWhatsAppErrorInfo(errorCode);
  const actionMessage = getActionMessage(errorInfo);
  return `${errorInfo.userMessage} ${actionMessage}`;
}

/**
 * Check if error should prevent NR count increment
 * Failed messages should NOT increment NR count
 * @param errorCode - WhatsApp API error code
 * @returns true if message failed (should not count for NR)
 */
export function shouldNotCountForNR(errorCode: number | string | null | undefined): boolean {
  if (!errorCode) return false;
  const errorInfo = getWhatsAppErrorInfo(errorCode);
  // All errors mean message failed, so don't count for NR
  return true;
}
