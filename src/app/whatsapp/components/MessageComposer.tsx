import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LayoutTemplate, Loader2, Music, Film, Smile, Paperclip, Image as ImageIcon, Send, FileText } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import type { Template } from "../types";
import { TemplateDialog } from "./TemplateDialog";

type MediaKind = "image" | "document" | "audio" | "video";

interface MessageComposerProps {
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  sendingMessage: boolean;
  canSendFreeForm: boolean;
  showTemplateDialog: boolean;
  onTemplateDialogChange: (open: boolean) => void;
  templates: Template[];
  templatesLoading: boolean;
  selectedTemplate: Template | null;
  onSelectTemplate: (template: Template | null) => void;
  templateParams: Record<string, string>;
  onTemplateParamsChange: (params: Record<string, string>) => void;
  onSendTemplate: () => void;
  uploadingMedia: boolean;
  onHandleFileUpload: (event: React.ChangeEvent<HTMLInputElement>, mediaType: MediaKind) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  imageInputRef: React.RefObject<HTMLInputElement>;
  onOpenTemplateFromWarning: () => void;
}

export function MessageComposer({
  newMessage,
  onMessageChange,
  onSendMessage,
  sendingMessage,
  canSendFreeForm,
  showTemplateDialog,
  onTemplateDialogChange,
  templates,
  templatesLoading,
  selectedTemplate,
  onSelectTemplate,
  templateParams,
  onTemplateParamsChange,
  onSendTemplate,
  uploadingMedia,
  onHandleFileUpload,
  fileInputRef,
  imageInputRef,
  onOpenTemplateFromWarning,
}: MessageComposerProps) {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className="p-4 border-t">
      <div className="flex items-end gap-2">
        <TemplateDialog
          open={showTemplateDialog}
          onOpenChange={onTemplateDialogChange}
          templates={templates}
          templatesLoading={templatesLoading}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={onSelectTemplate}
          templateParams={templateParams}
          onTemplateParamsChange={onTemplateParamsChange}
          onSend={onSendTemplate}
          sendingMessage={sendingMessage}
        />

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          onChange={(e) => onHandleFileUpload(e, "document")}
        />
        <input
          type="file"
          ref={imageInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => onHandleFileUpload(e, "image")}
        />

        <Popover open={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" disabled={uploadingMedia || !canSendFreeForm}>
              {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" side="top" align="start">
            <div className="grid gap-1">
              <Button variant="ghost" className="justify-start gap-2 h-9" onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Photo</span>
              </Button>
              <Button variant="ghost" className="justify-start gap-2 h-9" onClick={() => fileInputRef.current?.click()}>
                <FileText className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Document</span>
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-2 h-9"
                onClick={() => {
                  setShowAttachmentMenu(false);
                }}
                disabled
              >
                <Music className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Audio (soon)</span>
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-2 h-9"
                onClick={() => {
                  setShowAttachmentMenu(false);
                }}
                disabled
              >
                <Film className="h-4 w-4 text-red-500" />
                <span className="text-sm">Video (soon)</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploadingMedia || !canSendFreeForm}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" disabled={!canSendFreeForm}>
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" side="top" align="start">
            <Picker
              data={data}
              onEmojiSelect={(emoji: any) => {
                onMessageChange(newMessage + emoji.native);
                setShowEmojiPicker(false);
              }}
              theme="auto"
              previewPosition="none"
              skinTonePosition="none"
            />
          </PopoverContent>
        </Popover>

        <Textarea
          placeholder={
            canSendFreeForm ? "Type a message..." : "24-hour window expired. Send a template to start."
          }
          value={newMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          className="flex-1 min-h-[44px] max-h-[120px] resize-none"
          rows={1}
          disabled={!canSendFreeForm}
        />

        <Button
          onClick={onSendMessage}
          disabled={!newMessage.trim() || sendingMessage || !canSendFreeForm}
          className="bg-green-500 hover:bg-green-600"
        >
          {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {!canSendFreeForm && (
        <Alert variant="destructive" className="mt-3">
          <AlertTitle>Messaging Window Expired</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>The 24-hour free messaging window has closed. You can only send template messages now.</span>
            <Button variant="outline" size="sm" onClick={onOpenTemplateFromWarning} className="ml-2">
              <LayoutTemplate className="h-4 w-4 mr-1" />
              Send Template
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

