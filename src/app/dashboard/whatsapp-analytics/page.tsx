import { Metadata } from "next";
import WhatsAppAnalyticsDashboard from "@/modules/whatsapp/ui/analytics/whatsapp-analytics-dashboard";

export const metadata: Metadata = {
  title: "WhatsApp Analytics | CRM Dashboard",
  description: "Real-time WhatsApp performance analytics across locations, rental types, and agents.",
};

export default function WhatsAppAnalyticsPage() {
  return <WhatsAppAnalyticsDashboard />;
}
