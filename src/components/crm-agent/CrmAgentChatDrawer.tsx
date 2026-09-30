"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Loader2, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/AuthStore";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CRM_AGENT_DISPLAY_NAME,
  CRM_AGENT_EMPTY_AGENT,
  CRM_AGENT_EMPTY_ASK,
  CRM_AGENT_TAGLINE,
} from "@/lib/crm-agent-brand";

type ChatSource = { sourcePath: string; heading: string };

type CrmAgentUi =
  | {
      type: "choices";
      id: string;
      prompt: string;
      options: { label: string; value: string }[];
    }
  | {
      type: "plan";
      title: string;
      lines: string[];
      confirmLabel: string;
    }
  | {
      type: "report";
      title: string;
      metrics: Array<{ label: string; value: string | number; href?: string }>;
    };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  toolNames?: string[];
  ui?: CrmAgentUi;
};

type AgentMode = "ask" | "agent";

const PILOT_FALLBACK = new Set(["SuperAdmin", "Sales-TeamLead", "HR"]);
const MODE_STORAGE_KEY = "crm-agent-mode";

export function CrmAgentChatDrawer() {
  const token = useAuthStore((s) => s.token);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<AgentMode>("ask");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingUi, setPendingUi] = useState<CrmAgentUi | null>(null);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const role = token?.role ?? "";
  const roleAllowed = PILOT_FALLBACK.has(role);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === "ask" || saved === "agent") setMode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setModePersist = useCallback((next: AgentMode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

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
  }, [messages, open, pendingUi]);

  const sendMessage = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || loading) return;
      setInput("");
      setError(null);
      setPendingUi(null);
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setLoading(true);
      try {
        const { data } = await axios.post("/api/crm-agent/chat", {
          message,
          conversationId,
          mode,
        });
        setConversationId(data.conversationId ?? null);
        const ui = (data.ui as CrmAgentUi | undefined) ?? null;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer ?? "No answer returned.",
            sources: data.sources ?? [],
            toolNames: data.toolNames ?? [],
            ui: ui ?? undefined,
          },
        ]);
        setPendingUi(ui);
      } catch (err: unknown) {
        const ax = err as {
          response?: { data?: { error?: string }; status?: number };
        };
        const msg =
          ax.response?.data?.error ||
          (ax.response?.status === 429
            ? "Rate limit exceeded — try again later."
            : `Failed to reach ${CRM_AGENT_DISPLAY_NAME}.`);
        setError(msg);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${msg}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, conversationId, mode],
  );

  const send = useCallback(async () => {
    await sendMessage(input);
  }, [input, sendMessage]);

  const confirmWrite = useCallback(
    async (confirmed: boolean) => {
      if (!conversationId) return;
      setConfirming(true);
      setError(null);
      try {
        const { data } = await axios.post("/api/crm-agent/confirm-write", {
          conversationId,
          confirmed,
        });
        setPendingUi(null);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: confirmed
              ? String(data.answer ?? "Done.")
              : "Cancelled.",
          },
        ]);
      } catch (err: unknown) {
        const ax = err as { response?: { data?: { error?: string } } };
        setError(ax.response?.data?.error || "Confirm failed");
      } finally {
        setConfirming(false);
      }
    },
    [conversationId],
  );

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        aria-label={`Open ${CRM_AGENT_DISPLAY_NAME}`}
        title={CRM_AGENT_TAGLINE}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#F7951D] text-white shadow-lg hover:opacity-90"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 z-40 flex h-[min(560px,70vh)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
            <div>
              <p className="text-sm font-semibold">{CRM_AGENT_DISPLAY_NAME}</p>
              <p className="text-xs text-muted-foreground">
                {CRM_AGENT_TAGLINE}
              </p>
              <p className="text-[10px] text-muted-foreground/80">
                {mode === "agent" ? "Agent · writes with confirm" : "Ask · read-only"} · {role}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex rounded-md border border-border p-0.5 text-xs">
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 ${
                    mode === "ask"
                      ? "bg-[#F7951D] text-white"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setModePersist("ask")}
                >
                  Ask
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 ${
                    mode === "agent"
                      ? "bg-[#F7951D] text-white"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setModePersist("agent")}
                >
                  Agent
                </button>
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
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="space-y-2 rounded-lg bg-[#F7951D]/10 px-3 py-3">
                <p className="text-sm font-medium text-foreground">
                  {CRM_AGENT_TAGLINE}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mode === "agent"
                    ? CRM_AGENT_EMPTY_AGENT
                    : CRM_AGENT_EMPTY_ASK}
                </p>
              </div>
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
                {m.ui?.type === "report" && (
                  <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                    <p className="text-xs font-medium">{m.ui.title}</p>
                    {m.ui.metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="flex justify-between gap-2 text-xs"
                      >
                        <span className="text-muted-foreground">
                          {metric.label}
                        </span>
                        {metric.href ? (
                          <Link
                            href={metric.href}
                            className="font-medium text-[#F7951D] underline-offset-2 hover:underline"
                          >
                            {metric.value}
                          </Link>
                        ) : (
                          <span className="font-medium">{metric.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {pendingUi?.type === "report" && (
              <div className="space-y-2 rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-semibold">{pendingUi.title}</p>
                {pendingUi.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex justify-between gap-2 text-xs"
                  >
                    <span className="text-muted-foreground">{metric.label}</span>
                    {metric.href ? (
                      <Link
                        href={metric.href}
                        className="font-medium text-[#F7951D] underline-offset-2 hover:underline"
                      >
                        {metric.value}
                      </Link>
                    ) : (
                      <span className="font-medium">{metric.value}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pendingUi?.type === "choices" && (
              <div className="space-y-2 rounded-lg border border-border bg-background p-2">
                <p className="text-xs text-muted-foreground">
                  {pendingUi.prompt}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pendingUi.options.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={loading}
                      onClick={() => void sendMessage(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {pendingUi?.type === "plan" && (
              <div className="space-y-2 rounded-lg border border-[#F7951D]/40 bg-[#F7951D]/5 p-3">
                <p className="text-sm font-semibold">{pendingUi.title}</p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {pendingUi.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={confirming}
                    onClick={() => void confirmWrite(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={confirming}
                    onClick={() => void confirmWrite(true)}
                  >
                    {confirming
                      ? "Working…"
                      : pendingUi.confirmLabel || "Confirm"}
                  </Button>
                </div>
              </div>
            )}

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
              placeholder={
                mode === "agent"
                  ? `Ask ${CRM_AGENT_DISPLAY_NAME} to change leads…`
                  : `Message ${CRM_AGENT_DISPLAY_NAME}…`
              }
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
    </>
  );
}
