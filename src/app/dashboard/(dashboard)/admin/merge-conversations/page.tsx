"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import ConversationMergePanel from "@/components/admin/ConversationMergePanel";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";

export default function MergeConversationsPage() {
  const { role } = useDashboardAccess();
  const router = useRouter();

  useEffect(() => {
    if (role && role !== "SuperAdmin") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  if (!role) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role !== "SuperAdmin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-4 py-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
      <ConversationMergePanel />
    </div>
  );
}
