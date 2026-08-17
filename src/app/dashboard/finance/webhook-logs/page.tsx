import { Suspense } from "react";
import WebhookLogsClient from "./webhook-logs-client";

export default function WebhookLogsPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <WebhookLogsClient />
    </Suspense>
  );
}
