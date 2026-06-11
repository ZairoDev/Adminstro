"use client";

import { useEffect, useState } from "react";
import axios from "@/util/axios";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_TRANSLATION_LANGUAGES } from "@/lib/whatsapp/translation/types";

type TranslateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceText: string;
  conversationId: string;
  onSendTranslated: (text: string) => void;
};

export function TranslateDialog({
  open,
  onOpenChange,
  sourceText,
  conversationId,
  onSendTranslated,
}: TranslateDialogProps) {
  const { toast } = useToast();
  const [targetCode, setTargetCode] = useState("el");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);

  useEffect(() => {
    if (!open || !conversationId) return;
    setPreview("");
    setPrefsLoading(true);
    axios
      .get(`/api/whatsapp/conversations/${conversationId}/preferences`)
      .then((res) => {
        const code = res.data?.preferredLanguageCode;
        if (code) setTargetCode(code);
      })
      .finally(() => setPrefsLoading(false));
  }, [open, conversationId]);

  const runTranslate = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post("/api/whatsapp/translate", {
        text: sourceText,
        targetLanguageCode: targetCode,
      });
      setPreview(res.data.translatedText || "");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Translation failed";
      toast({ title: "Translation error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const savePreference = async () => {
    const lang = SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === targetCode);
    await axios.patch(`/api/whatsapp/conversations/${conversationId}/preferences`, {
      preferredLanguageCode: targetCode,
      preferredLanguage: lang?.name || targetCode,
    });
  };

  const handleSend = async () => {
    const text = preview.trim();
    if (!text) return;
    await savePreference();
    onSendTranslated(text);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-[#00a884]" />
            Translate message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Original</p>
            <Textarea value={sourceText} readOnly rows={3} className="resize-none bg-muted/40" />
          </div>

          <div className="flex items-center gap-2">
            <Select value={targetCode} onValueChange={setTargetCode} disabled={prefsLoading}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Target language" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {SUPPORTED_TRANSLATION_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="secondary" onClick={runTranslate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Translate"}
            </Button>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Preview (editable)</p>
            <Textarea
              value={preview}
              onChange={(e) => setPreview(e.target.value)}
              rows={4}
              placeholder="Translated text will appear here…"
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(preview)}
            disabled={!preview.trim()}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button
            type="button"
            className="bg-[#00a884] hover:bg-[#008f6f]"
            onClick={handleSend}
            disabled={!preview.trim()}
          >
            Send translated
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
