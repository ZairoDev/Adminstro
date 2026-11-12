"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Mail,
  Eye,
  Edit2,
  Send,
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  html: string;
  onSend: (editedSubject: string, editedHtml: string) => Promise<void>;
  sending: boolean;
  recipientEmail: string;
}

/** Signature root — prefer stable marker; keep legacy style selectors as fallback. */
function findSignatureEl(root: ParentNode): Element | null {
  return (
    root.querySelector("[data-zairo-signature='1']") ||
    root.querySelector('div[style*="margin-top: 32px"]') ||
    root.querySelector('div[style*="margin-top: 40px"]')
  );
}

export function EmailPreviewDialog({
  open,
  onOpenChange,
  subject: initialSubject,
  html: initialHtml,
  onSend,
  sending,
  recipientEmail,
}: EmailPreviewDialogProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [originalHtml, setOriginalHtml] = useState<string>("");
  const [editedHtml, setEditedHtml] = useState<string>("");

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4",
      },
    },
    onUpdate: ({ editor }) => {
      // Update edited HTML when content changes
      const html = editor.getHTML();
      setEditedHtml(html);
    },
  });

  // Update editor content when dialog opens or initial values change
  useEffect(() => {
    if (open && editor && initialHtml) {
      setSubject(initialSubject);
      setOriginalHtml(initialHtml);
      
      // Parse HTML to extract editable content, signature, and footer
      const parser = new DOMParser();
      const doc = parser.parseFromString(initialHtml, 'text/html');
      
      // Find the main content div (usually has padding:35px 30px)
      const contentDiv = doc.querySelector('div[style*="padding:35px"], div[style*="padding: 35px"]');
      
      if (contentDiv) {
        // Keep signature out of TipTap — otherwise tables flatten to plain
        // text and reconstruct can show name/contact twice (text + logo block).
        const signatureDiv = findSignatureEl(contentDiv);
        let contentHtml = contentDiv.innerHTML;
        let signatureHtml = "";

        if (signatureDiv) {
          signatureHtml = signatureDiv.outerHTML;
          contentHtml = contentHtml.replace(signatureDiv.outerHTML, "").trim();
        }

        (editor as any).signatureHtml = signatureHtml;

        // Editable body only (signature reattached on preview/send)
        editor.commands.setContent(contentHtml || "", false);
        setEditedHtml(contentHtml);
      } else {
        // Fallback: use full HTML
        editor.commands.setContent(initialHtml, false);
        setEditedHtml(initialHtml);
      }
      
      setActiveTab("preview");
    }
  }, [open, initialSubject, initialHtml, editor]);

  // Reconstruct full HTML with signature and footer
  const reconstructFullHtml = (): string => {
    if (!editor || !originalHtml) return originalHtml;
    
    try {
      const parser = new DOMParser();
      const originalDoc = parser.parseFromString(originalHtml, 'text/html');
      
      // Get edited content from Tiptap
      const editedContent = editor.getHTML();
      
      // Find the main content div (padding:35px 30px)
      const contentDiv = originalDoc.querySelector('div[style*="padding:35px"], div[style*="padding: 35px"]');
      
      if (!contentDiv) return originalHtml;
      
      let signatureHtml = (editor as any).signatureHtml || "";

      if (!signatureHtml) {
        const signatureDiv = findSignatureEl(contentDiv);
        if (signatureDiv) {
          signatureHtml = signatureDiv.outerHTML;
        }
      }

      // Body from editor + one signature block (never leave signature inside TipTap)
      let newContent = editedContent.trim();
      if (signatureHtml) {
        newContent += "\n\n            " + signatureHtml;
      }
      
      // Update content div with new content
      contentDiv.innerHTML = newContent;
      
      // Get the outer wrapper div (max-width:600px)
      const wrapperDiv = originalDoc.querySelector('div[style*="max-width:600px"], div[style*="max-width: 600px"]');
      
      if (wrapperDiv) {
        // Return the wrapper's outerHTML which includes header, content, and footer
        return wrapperDiv.outerHTML;
      }
      
      // Fallback: return body content
      return originalDoc.body.innerHTML;
    } catch (error) {
      console.error('Error reconstructing HTML:', error);
      return originalHtml;
    }
  };

  const hasEmailWrapper = (html: string) =>
    html.includes("max-width:600px") || html.includes("max-width: 600px");

  const handleSend = async () => {
    let fullHtml = reconstructFullHtml();

    // Accept both "max-width:600px" and "max-width: 600px" so send matches preview.
    if (!fullHtml || fullHtml.length < 200 || !hasEmailWrapper(fullHtml)) {
      console.warn("Reconstruction may have failed, using original HTML");
      fullHtml = originalHtml;
    }

    if (!fullHtml.includes("<div") && !fullHtml.includes("<html")) {
      console.warn("HTML structure missing, using original");
      fullHtml = originalHtml;
    }

    await onSend(subject, fullHtml);
  };

  // Get full HTML for preview
  const getFullHtml = (): string => {
    return reconstructFullHtml();
  };

  if (!editor) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Preview & Edit
            <span className="text-sm font-normal text-muted-foreground ml-2">
              To: {recipientEmail}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "edit")} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit2 className="h-4 w-4" />
              Edit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="mb-3">
                <Label className="text-sm font-semibold">Subject:</Label>
                <p className="text-sm mt-1 font-medium">{subject}</p>
              </div>
              <div className="border rounded bg-white p-4 overflow-auto" style={{ maxHeight: '500px' }}>
                {originalHtml ? (
                  <iframe
                    srcDoc={getFullHtml()}
                    style={{
                      width: '100%',
                      minHeight: '400px',
                      border: 'none',
                      fontFamily: "'Segoe UI', Arial, sans-serif"
                    }}
                    title="Email Preview"
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p>Loading preview...</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="flex-1 overflow-auto mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Email Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-content">Email Content</Label>
              <div className="border rounded-lg overflow-hidden">
                {/* Toolbar */}
                <div className="border-b bg-muted/50 p-2 flex items-center gap-1 flex-wrap">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={editor.isActive("bold") ? "bg-accent" : ""}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={editor.isActive("italic") ? "bg-accent" : ""}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    className={editor.isActive("strike") ? "bg-accent" : ""}
                  >
                    <Strikethrough className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive("bulletList") ? "bg-accent" : ""}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive("orderedList") ? "bg-accent" : ""}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={editor.isActive("blockquote") ? "bg-accent" : ""}
                  >
                    <Quote className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </div>
                {/* Editor Content */}
                <div className="bg-white min-h-[400px]">
                  <EditorContent editor={editor} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Edit the email content using the formatting toolbar above. The signature and footer will be automatically preserved.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={sending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="bg-primary hover:bg-primary/90"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
