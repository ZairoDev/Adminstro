"use client";

import { useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Loader2, Database } from "lucide-react";
import { toast } from "sonner";

/**
 * SuperAdmin: bulk-set conversationType=owner for WhatsApp conversations
 * created from 2026-04-01 through now.
 */
type Props = {
  onSuccess?: () => void;
};

export function WhatsAppConversationTypeMigrationButton({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const runMigration = async () => {
    const ok = window.confirm(
      "Set conversationType to OWNER for all WhatsApp conversations created from 2026-04-01 until now?\n\nThis cannot be undone in bulk.",
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await axios.post("/api/whatsapp/admin/migrate-conversation-types", {
        conversationType: "owner",
        startDate: "2026-04-01T00:00:00.000Z",
      });
      const { matchedCount, modifiedCount } = res.data as {
        matchedCount?: number;
        modifiedCount?: number;
      };
      toast.success(
        `Migration complete: matched ${matchedCount ?? 0}, modified ${modifiedCount ?? 0} conversation(s).`,
      );
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Migration failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => void runMigration()}
      className="shrink-0 border-amber-300 text-amber-900 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/40"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Database className="h-4 w-4 mr-2" />
      )}
      Mark Apr 2026+ chats as owners
    </Button>
  );
}
