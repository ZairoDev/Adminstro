import type { ReadNotRepliedRow } from "./monitorService";

/** Quote a CSV cell and neutralise spreadsheet formula injection (names come from customers). */
export function csvCell(value: string | number | undefined): string {
  const raw = value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function readNotRepliedToCsv(rows: ReadNotRepliedRow[]): string {
  const header = [
    "phone",
    "name",
    "location",
    "assigned_agent",
    "verdict",
    "last_message_sent_at",
    "read_at",
    "template",
    "message_preview",
    "lost_inbound_count",
    "conversation_id",
  ];
  const lines = rows.map((r) =>
    [
      r.phone,
      r.name,
      r.location,
      r.assignedAgentName,
      r.verdict,
      r.lastReadMessage.sentAt,
      r.lastReadMessage.readAt,
      r.lastReadMessage.templateName,
      r.lastReadMessage.preview,
      r.lostInbound.length,
      r.conversationId,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
