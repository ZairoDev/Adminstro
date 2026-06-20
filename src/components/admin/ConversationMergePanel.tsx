"use client";

import React, { useState } from "react";
import axios from "@/util/axios";
import type {
  DryRunResult,
  MergeExecutionResult,
  MergeGroup,
} from "@/lib/whatsapp/conversationMergeService";
import { mergeGroupKeyString } from "@/lib/whatsapp/conversationMergeService";

type Step = "idle" | "preview" | "confirm" | "done";

export default function ConversationMergePanel() {
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<MergeExecutionResult | null>(
    null,
  );
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [confirmInput, setConfirmInput] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const groupKey = (g: MergeGroup) => mergeGroupKeyString(g.groupKey);

  async function runDryRun() {
    setLoading(true);
    setMergeResult(null);
    try {
      const res = await axios.get<DryRunResult>("/api/admin/merge-conversations");
      setDryRun(res.data);
      setSelectedGroups(
        new Set(res.data.groups.map((g) => groupKey(g))),
      );
      setStep("preview");
    } catch (e) {
      alert("Failed to load duplicates. Check console.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function executeMerge() {
    if (confirmInput !== "MERGE CONFIRMED") {
      alert("Type MERGE CONFIRMED exactly to proceed.");
      return;
    }
    setMerging(true);
    try {
      const res = await axios.post<MergeExecutionResult>(
        "/api/admin/merge-conversations",
        {
          groupKeys: Array.from(selectedGroups),
          confirmText: confirmInput,
        },
      );
      setMergeResult(res.data);
      setStep("done");
    } catch (e) {
      alert("Merge failed. Check console.");
      console.error(e);
    } finally {
      setMerging(false);
    }
  }

  function toggleGroup(key: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleAll() {
    if (!dryRun) return;
    const all = dryRun.groups.map((g) => groupKey(g));
    setSelectedGroups(
      selectedGroups.size === all.length ? new Set() : new Set(all),
    );
  }

  const s: Record<string, React.CSSProperties> = {
    page: {
      fontFamily: "system-ui, sans-serif",
      maxWidth: 960,
      margin: "0 auto",
      padding: "24px 16px",
      color: "#1a1a1a",
    },
    h1: { fontSize: 22, fontWeight: 600, marginBottom: 4 },
    sub: { fontSize: 14, color: "#666", marginBottom: 24 },
    btn: {
      padding: "10px 20px",
      borderRadius: 8,
      border: "none",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 500,
    },
    btnPrimary: { background: "#1D9E75", color: "#fff" },
    btnDanger: { background: "#DC2626", color: "#fff" },
    btnGhost: { background: "#f1f1f1", color: "#333" },
    card: {
      border: "1px solid #e5e5e5",
      borderRadius: 10,
      marginBottom: 12,
      overflow: "hidden",
    },
    cardHead: {
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      cursor: "pointer",
      background: "#fafafa",
    },
    cardBody: { padding: "0 16px 16px" },
    tag: {
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 20,
      fontWeight: 500,
    },
    tagGreen: { background: "#E1F5EE", color: "#085041" },
    tagRed: { background: "#FEE2E2", color: "#991B1B" },
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: 13,
      marginTop: 8,
    },
    th: {
      textAlign: "left" as const,
      padding: "6px 8px",
      borderBottom: "1px solid #e5e5e5",
      fontSize: 12,
      color: "#666",
      fontWeight: 500,
    },
    td: {
      padding: "7px 8px",
      borderBottom: "1px solid #f5f5f5",
      fontSize: 13,
    },
    statRow: {
      display: "flex",
      gap: 16,
      marginBottom: 20,
      flexWrap: "wrap" as const,
    },
    stat: {
      background: "#f9f9f9",
      border: "1px solid #e5e5e5",
      borderRadius: 8,
      padding: "12px 16px",
      minWidth: 140,
    },
    statN: { fontSize: 24, fontWeight: 600, color: "#1D9E75" },
    statL: { fontSize: 12, color: "#666", marginTop: 2 },
    warn: {
      background: "#FAEEDA",
      border: "1px solid #F59E0B",
      borderRadius: 8,
      padding: "12px 16px",
      marginBottom: 20,
      fontSize: 14,
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid #d1d5db",
      fontSize: 14,
      marginTop: 8,
      boxSizing: "border-box" as const,
    },
    success: {
      background: "#E1F5EE",
      border: "1px solid #5DCAA5",
      borderRadius: 8,
      padding: "16px",
      marginBottom: 16,
    },
    error: {
      background: "#FEE2E2",
      border: "1px solid #F87171",
      borderRadius: 8,
      padding: "16px",
      marginBottom: 16,
    },
  };

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Conversation Merge Tool</h1>
      <p style={s.sub}>
        Finds duplicate WhatsApp conversations for the same customer on the same
        business channel and merges them — keeping the most recent conversation as
        canonical and moving all message history into it.
      </p>

      {step === "idle" && (
        <button
          style={{ ...s.btn, ...s.btnPrimary }}
          onClick={() => void runDryRun()}
          disabled={loading}
        >
          {loading ? "Scanning for duplicates…" : "Scan for Duplicate Conversations"}
        </button>
      )}

      {step === "preview" && dryRun && (
        <>
          <div style={s.statRow}>
            <div style={s.stat}>
              <div style={s.statN}>{dryRun.totalGroups}</div>
              <div style={s.statL}>Duplicate groups found</div>
            </div>
            <div style={s.stat}>
              <div style={s.statN}>{dryRun.totalDuplicateConversations}</div>
              <div style={s.statL}>Conversations to soft-delete</div>
            </div>
            <div style={s.stat}>
              <div style={{ ...s.statN, color: "#F59E0B" }}>
                {dryRun.groups.reduce((sum, g) => sum + g.totalMessagesToMove, 0)}
              </div>
              <div style={s.statL}>Messages to reassign</div>
            </div>
            <div style={s.stat}>
              <div style={{ ...s.statN, color: "#1D9E75" }}>
                {selectedGroups.size}
              </div>
              <div style={s.statL}>Groups selected</div>
            </div>
          </div>

          {dryRun.totalGroups === 0 ? (
            <div style={s.success}>
              <strong>No duplicates found.</strong> Your conversations are clean.
            </div>
          ) : (
            <>
              <div style={s.warn}>
                <strong>Review carefully before merging.</strong> Soft-deleted
                conversations can be recovered but message reassignment cannot be
                automatically undone. Uncheck any groups you do not want to merge.
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 12,
                  alignItems: "center",
                }}
              >
                <button
                  style={{ ...s.btn, ...s.btnGhost, padding: "6px 12px" }}
                  onClick={toggleAll}
                >
                  {selectedGroups.size === dryRun.groups.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
                <span style={{ fontSize: 13, color: "#666" }}>
                  {selectedGroups.size} of {dryRun.groups.length} groups selected
                </span>
              </div>

              {dryRun.groups.map((g) => {
                const key = groupKey(g);
                const isSelected = selectedGroups.has(key);
                const isExpanded = expandedGroup === key;

                return (
                  <div
                    key={key}
                    style={{ ...s.card, opacity: isSelected ? 1 : 0.5 }}
                  >
                    <div
                      style={s.cardHead}
                      onClick={() =>
                        setExpandedGroup(isExpanded ? null : key)
                      }
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleGroup(key)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 16, height: 16, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>
                          {g.canonical.name || g.canonical.phone}
                          <span style={{ color: "#666", fontWeight: 400 }}>
                            {" "}
                            · {g.canonical.phone}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                          {g.groupKey.channelKey} · {g.totalConversations}{" "}
                          conversations · {g.totalMessagesToMove} messages to move
                        </div>
                      </div>
                      <span style={{ ...s.tag, ...s.tagGreen }}>
                        Keep: {g.canonical._id.slice(-6)}
                      </span>
                      <span style={{ ...s.tag, ...s.tagRed, marginLeft: 4 }}>
                        Delete: {g.duplicates.length}
                      </span>
                      <span style={{ fontSize: 18, color: "#999", marginLeft: 8 }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>

                    {isExpanded && (
                      <div style={s.cardBody}>
                        <table style={s.table}>
                          <thead>
                            <tr>
                              <th style={s.th}>Role</th>
                              <th style={s.th}>Name</th>
                              <th style={s.th}>ID</th>
                              <th style={s.th}>Phone Line</th>
                              <th style={s.th}>Last Message</th>
                              <th style={s.th}>Messages</th>
                              <th style={s.th}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ background: "#f0fdf8" }}>
                              <td style={s.td}>
                                <span style={{ ...s.tag, ...s.tagGreen }}>
                                  CANONICAL
                                </span>
                              </td>
                              <td style={s.td}>{g.canonical.name}</td>
                              <td
                                style={{
                                  ...s.td,
                                  fontFamily: "monospace",
                                  fontSize: 11,
                                }}
                              >
                                {g.canonical._id.slice(-8)}
                              </td>
                              <td
                                style={{
                                  ...s.td,
                                  fontFamily: "monospace",
                                  fontSize: 11,
                                }}
                              >
                                {g.canonical.businessPhoneId}
                              </td>
                              <td
                                style={{
                                  ...s.td,
                                  maxWidth: 200,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {g.canonical.lastMessage}
                              </td>
                              <td style={s.td}>{g.canonical.messageCount}</td>
                              <td style={s.td}>
                                <span style={{ color: "#1D9E75", fontWeight: 500 }}>
                                  Kept
                                </span>
                              </td>
                            </tr>
                            {g.duplicates.map((d) => (
                              <tr key={d._id} style={{ background: "#fff5f5" }}>
                                <td style={s.td}>
                                  <span style={{ ...s.tag, ...s.tagRed }}>
                                    DUPLICATE
                                  </span>
                                </td>
                                <td style={s.td}>{d.name}</td>
                                <td
                                  style={{
                                    ...s.td,
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                  }}
                                >
                                  {d._id.slice(-8)}
                                </td>
                                <td
                                  style={{
                                    ...s.td,
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                  }}
                                >
                                  {d.businessPhoneId}
                                </td>
                                <td
                                  style={{
                                    ...s.td,
                                    maxWidth: 200,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {d.lastMessage}
                                </td>
                                <td style={s.td}>{d.messageCount}</td>
                                <td style={s.td}>
                                  <span
                                    style={{ color: "#DC2626", fontWeight: 500 }}
                                  >
                                    Soft-deleted
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                <button
                  style={{ ...s.btn, ...s.btnPrimary }}
                  onClick={() => setStep("confirm")}
                  disabled={selectedGroups.size === 0}
                >
                  Merge {selectedGroups.size} Selected Groups →
                </button>
                <button
                  style={{ ...s.btn, ...s.btnGhost }}
                  onClick={() => {
                    setStep("idle");
                    setDryRun(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </>
      )}

      {step === "confirm" && (
        <div style={{ maxWidth: 500 }}>
          <div style={s.warn}>
            <strong>
              You are about to merge {selectedGroups.size} duplicate groups.
            </strong>
            <br />
            This will:
            <ul style={{ margin: "8px 0 0 16px", lineHeight: 1.8 }}>
              <li>Move all messages to the most recent conversation</li>
              <li>
                Soft-delete{" "}
                {dryRun?.groups
                  .filter((g) => selectedGroups.has(groupKey(g)))
                  .reduce((sum, g) => sum + g.duplicates.length, 0)}{" "}
                duplicate conversation records
              </li>
              <li>Enrich canonical conversations with best available metadata</li>
            </ul>
            <br />
            Soft-deleted conversations are recoverable. Message reassignment is not
            automatically reversible.
          </div>

          <label style={{ fontSize: 14, fontWeight: 500 }}>
            Type <strong>MERGE CONFIRMED</strong> to proceed:
            <input
              style={s.input}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="MERGE CONFIRMED"
              autoFocus
            />
          </label>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              style={{
                ...s.btn,
                ...s.btnDanger,
                opacity: confirmInput === "MERGE CONFIRMED" ? 1 : 0.4,
              }}
              onClick={() => void executeMerge()}
              disabled={merging || confirmInput !== "MERGE CONFIRMED"}
            >
              {merging ? "Merging…" : "Execute Merge"}
            </button>
            <button
              style={{ ...s.btn, ...s.btnGhost }}
              onClick={() => setStep("preview")}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === "done" && mergeResult && (
        <>
          {mergeResult.merged > 0 && (
            <div style={s.success}>
              <strong>✓ Merge complete.</strong> {mergeResult.merged} groups merged
              successfully. Total messages reassigned:{" "}
              {mergeResult.results.reduce((sum, r) => sum + r.messagesMoved, 0)}
            </div>
          )}
          {mergeResult.failedGroups.length > 0 && (
            <div style={s.error}>
              <strong>{mergeResult.failedGroups.length} groups failed:</strong>
              <ul style={{ margin: "8px 0 0 16px" }}>
                {mergeResult.failedGroups.map((e, i) => (
                  <li key={i}>
                    {e.phone} — {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Phone</th>
                <th style={s.th}>Channel</th>
                <th style={s.th}>Canonical ID</th>
                <th style={s.th}>Dupes Removed</th>
                <th style={s.th}>Messages Moved</th>
              </tr>
            </thead>
            <tbody>
              {mergeResult.results.map((r, i) => (
                <tr key={i}>
                  <td style={s.td}>{r.phone}</td>
                  <td style={s.td}>{r.channelKey}</td>
                  <td
                    style={{
                      ...s.td,
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}
                  >
                    {r.canonicalId.slice(-8)}
                  </td>
                  <td style={s.td}>{r.mergedCount}</td>
                  <td style={s.td}>{r.messagesMoved}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 20 }}>
            <button
              style={{ ...s.btn, ...s.btnGhost }}
              onClick={() => {
                setStep("idle");
                setDryRun(null);
                setMergeResult(null);
                setConfirmInput("");
              }}
            >
              Run Again
            </button>
          </div>
        </>
      )}
    </div>
  );
}
