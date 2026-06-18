import { Metadata } from "next";
import WhatsAppAnalyticsDashboard from "@/components/whatsapp/analytics/WhatsAppAnalyticsDashboard";

export const metadata: Metadata = {
  title: "WhatsApp Analytics | CRM Dashboard",
  description: "Real-time WhatsApp performance analytics across locations, rental types, and agents.",
};

export default function WhatsAppAnalyticsPage() {
  return <WhatsAppAnalyticsDashboard />;
}
