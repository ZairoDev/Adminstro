import type { Metadata } from "next";
import WebhookMonitorClient from "./_components/WebhookMonitorClient";

export const metadata: Metadata = {
  title: "WhatsApp Webhook Monitor | CRM Dashboard",
  description:
    "Raw Meta webhook log with per-message processing outcome, and customers who read a message but have no stored reply.",
};

export default function WhatsAppWebhookMonitorPage() {
  return <WebhookMonitorClient />;
}
