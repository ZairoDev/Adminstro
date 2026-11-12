"use client";

import { useCallback, useRef, useState } from "react";
import axios from "@/util/axios";
import { toast } from "sonner";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";

type PreviewConfirm = (subject: string, html: string) => Promise<void>;

export function useEmailPreviewFlow() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const onConfirmRef = useRef<PreviewConfirm | null>(null);

  const openPreview = useCallback(
    async (opts: {
      type: string;
      payload: Record<string, unknown>;
      recipientEmail: string;
      onConfirm: PreviewConfirm;
    }) => {
      setPreparing(true);
      try {
        const response = await axios.post("/api/email/generateTemplate", {
          type: opts.type,
          payload: opts.payload,
        });

        if (!response.data?.success) {
          throw new Error(
            response.data?.error || "Failed to generate email template",
          );
        }

        setSubject(String(response.data.subject || ""));
        setHtml(String(response.data.html || ""));
        setRecipientEmail(opts.recipientEmail);
        onConfirmRef.current = opts.onConfirm;
        setOpen(true);
        return true;
      } catch (error: unknown) {
        const message =
          axios.isAxiosError(error) &&
          typeof error.response?.data?.error === "string"
            ? error.response.data.error
            : error instanceof Error
              ? error.message
              : "Failed to generate email template";
        toast.error(message);
        return false;
      } finally {
        setPreparing(false);
      }
    },
    [],
  );

  const openPreviewFromTemplate = useCallback(
    (opts: {
      subject: string;
      html: string;
      recipientEmail: string;
      onConfirm: PreviewConfirm;
    }) => {
      setSubject(opts.subject);
      setHtml(opts.html);
      setRecipientEmail(opts.recipientEmail);
      onConfirmRef.current = opts.onConfirm;
      setOpen(true);
    },
    [],
  );

  const handleSend = useCallback(async (editedSubject: string, editedHtml: string) => {
    if (!onConfirmRef.current) return;
    setSending(true);
    try {
      await onConfirmRef.current(editedSubject, editedHtml);
      setOpen(false);
      onConfirmRef.current = null;
    } finally {
      setSending(false);
    }
  }, []);

  const previewDialog = (
    <EmailPreviewDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onConfirmRef.current = null;
      }}
      subject={subject}
      html={html}
      onSend={handleSend}
      sending={sending}
      recipientEmail={recipientEmail}
    />
  );

  return {
    openPreview,
    openPreviewFromTemplate,
    previewDialog,
    preparing,
    sending,
  };
}
