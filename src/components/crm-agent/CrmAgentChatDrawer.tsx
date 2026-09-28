"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/AuthStore";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ChatSource = { sourcePath: string; heading: string };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  toolNames?: string[];
};

type WriteProposal = {
  type: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  confirmApi: string;
};

const PILOT_FALLBACK = new Set(["SuperAdmin", "Sales-TeamLead", "HR"]);

export function CrmAgentChatDrawer() {
  const token = useAuthStore((s) => s.token);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<WriteProposal | null>(null);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const role = token?.role ?? "";
  const roleAllowed = PILOT_FALLBACK.has(role);

  useEffect(() => {
    if (!token?.id || !roleAllowed) {
      setEnabled(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get("/api/crm-agent/status");
        if (!cancelled) setEnabled(Boolean(data?.enabled));
      } catch {
        if (!cancelled) setEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token?.id, roleAllowed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = useCallback(async () => {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);
    try {
      const { data } = await axios.post("/api/crm-agent/chat", {
        message,
        conversationId,
      });
      setConversationId(data.conversationId ?? null);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer ?? "No answer returned.",
          sources: data.sources ?? [],
          toolNames: data.toolNames ?? [],
        },
      ]);
      if (data.proposal) {
        setProposal(data.proposal as WriteProposal);
      }
    } catch (err: unknown) {
      const ax = err as {
        response?: { data?: { error?: string }; status?: number };
      };
      const msg =
        ax.response?.data?.error ||
        (ax.response?.status === 429
          ? "Rate limit exceeded — try again later."
          : "Failed to reach CRM Copilot.");
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId]);

  const confirmWrite = useCallback(async () => {
    if (!proposal) return;
    setConfirming(true);
    try {
      const { data } = await axios.post(
        proposal.confirmApi || "/api/crm-agent/confirm-write",
        {
          type: proposal.type,
          payload: proposal.payload,
          confirmed: true,
        },
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.deferred
            ? String(data.message ?? "Open the dashboard to finish this action.")
            : `Confirmed. ${data.deepLink ? `Open ${data.deepLink}` : ""}`,
        },
      ]);
      setProposal(null);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || "Confirm failed");
    } finally {
      setConfirming(false);
    }
  }, [proposal]);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Open CRM Copilot"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#F7951D] text-white shadow-lg hover:opacity-90"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 z-40 flex h-[min(560px,70vh)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
            <div>
              <p className="text-sm font-semibold">CRM Copilot</p>
              <p className="text-xs text-muted-foreground">
                How-to + live lookup · {role}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X size={16} />
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ask how to use a board, who can open a page, or look up a phone /
                VSID.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-8 bg-[#F7951D]/15"
                    : "mr-4 bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.sources && m.sources.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {m.sources.slice(0, 4).map((s) => (
                      <li key={`${s.sourcePath}-${s.heading}`}>
                        [{s.sourcePath}#{s.heading}]
                      </li>
                    ))}
                  </ul>
                )}
                {m.toolNames && m.toolNames.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tools: {m.toolNames.join(", ")}
                  </p>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="flex items-start gap-2 border-t border-border bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 border-t border-border p-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask CRM Copilot…"
              className="min-h-[44px] max-h-28 resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(proposal)} onOpenChange={(v) => !v && setProposal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{proposal?.title ?? "Confirm action"}</DialogTitle>
            <DialogDescription>
              CRM Copilot proposed a write. Review and confirm to continue. Nothing
              is saved until you confirm.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm whitespace-pre-wrap">{proposal?.description}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposal(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmWrite()} disabled={confirming}>
              {confirming ? "Confirming…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
