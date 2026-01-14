import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LayoutTemplate, Loader2, Music, Film, Smile, Paperclip, Image as ImageIcon, Send, FileText } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import type { Template } from "../types";
import { TemplateDialog } from "./TemplateDialog";
import { cn } from "@/lib/utils";
import axios from "axios";

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
  videoInputRef: React.RefObject<HTMLInputElement>;
  audioInputRef: React.RefObject<HTMLInputElement>;
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
  videoInputRef,
  audioInputRef,
  onOpenTemplateFromWarning,
}: MessageComposerProps) {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Determine media type from file
  const getMediaType = (file: File): MediaKind | null => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("application/") || file.type === "text/plain") return "document";
    return null;
  };

  // Handle drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canSendFreeForm && !uploadingMedia) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!canSendFreeForm || uploadingMedia) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Process first file (can extend to multiple later)
    const file = files[0];
    const mediaType = getMediaType(file);
    
    if (!mediaType) {
      alert("Unsupported file type. Please upload images, videos, audio, or documents.");
      return;
    }

    await handleFileDrop(file, mediaType);
  };

  // Handle file drop upload
  const handleFileDrop = async (file: File, mediaType: MediaKind) => {
    try {
      setUploadProgress(0);

      // Upload to Bunny CDN first
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await axios.post(
        "/api/whatsapp/upload-to-bunny",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
        }
      );

      if (!uploadResponse.data.success) {
        throw new Error("Failed to upload to CDN");
      }

      const { url, filename } = uploadResponse.data;

      // Use the Bunny URL directly via custom handler
      await handleFileWithBunnyUrl(file, mediaType, url, filename);
      
      setUploadProgress(0);
    } catch (error: any) {
      console.error("Drag & drop upload error:", error);
      alert(error.response?.data?.error || "Failed to upload file");
      setUploadProgress(0);
    }
  };

  // Handle file with Bunny URL (bypasses WhatsApp Media API upload)
  const handleFileWithBunnyUrl = async (
    file: File,
    mediaType: MediaKind,
    bunnyUrl: string,
    filename: string
  ) => {
    // We need to call the send-media API with the Bunny URL
    // But first we need to get the conversation info
    // This will be handled by the parent component
    // For now, we'll create a custom event that the parent can handle
    const customEvent = new CustomEvent("fileDropped", {
      detail: { file, mediaType, bunnyUrl, filename },
    });
    window.dispatchEvent(customEvent);
  };

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        "p-4 border-t relative",
        isDragging && "bg-blue-50 dark:bg-blue-950/20 border-blue-500 border-2"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-2 text-blue-500" />
            <p className="text-lg font-medium text-blue-700 dark:text-blue-300">
              Drop files here to upload
            </p>
          </div>
        </div>
      )}
      
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
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
        <input
          type="file"
          ref={videoInputRef}
          className="hidden"
          accept="video/*"
          onChange={(e) => onHandleFileUpload(e, "video")}
        />
        <input
          type="file"
          ref={audioInputRef}
          className="hidden"
          accept="audio/*"
          onChange={(e) => onHandleFileUpload(e, "audio")}
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
                  audioInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                disabled={uploadingMedia || !canSendFreeForm}
              >
                <Music className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Audio</span>
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-2 h-9"
                onClick={() => {
                  videoInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                disabled={uploadingMedia || !canSendFreeForm}
              >
                <Film className="h-4 w-4 text-red-500" />
                <span className="text-sm">Video</span>
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
          disabled={!newMessage.trim() || sendingMessage || uploadingMedia || !canSendFreeForm}
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

