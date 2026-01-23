import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  LayoutTemplate,
  Loader2,
  Music,
  Film,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Send,
  FileText,
  Mic,
  X,
  Plus,
  Camera,
  Play,
  Reply,
} from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import type { Template, Message } from "../types";
import { TemplateDialog } from "./TemplateDialog";
import { cn } from "@/lib/utils";
import axios from "axios";
import { getMessageDisplayText } from "../utils";

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
  templateContext?: {
    clientName?: string;
    locationName?: string;
  };
  // Reply functionality
  replyToMessage?: Message | null;
  onCancelReply?: () => void;
  // "You" conversation flag - templates not needed, always active
  isYouConversation?: boolean;
  // For pasted image sending with caption
  selectedConversation?: { _id: string; participantPhone: string } | null;
  selectedPhoneConfig?: { phoneNumberId?: string } | null;
  onSendPastedImagesWithCaption?: (files: File[], caption: string) => Promise<void>;
}

export const MessageComposer = memo(function MessageComposer({
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
  templateContext,
  replyToMessage,
  onCancelReply,
  isYouConversation = false,
  selectedConversation,
  selectedPhoneConfig,
  onSendPastedImagesWithCaption,
}: MessageComposerProps) {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pastedImages, setPastedImages] = useState<Array<{ id: string; file: File; previewUrl: string }>>([]);
  const [imageCaption, setImageCaption] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 150); // Max 6 lines approximately
    textarea.style.height = `${newHeight}px`;
  }, [newMessage]);

  // Cleanup preview URLs on unmount or when preview changes
  useEffect(() => {
    return () => {
      pastedImages.forEach((img) => {
        URL.revokeObjectURL(img.previewUrl);
      });
    };
  }, [pastedImages]);

  // Determine media type from file
  const getMediaType = useCallback((file: File): MediaKind | null => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("application/") || file.type === "text/plain") return "document";
    return null;
  }, []);

  // Handle drag & drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canSendFreeForm && !uploadingMedia) {
      setIsDragging(true);
    }
  }, [canSendFreeForm, uploadingMedia]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!canSendFreeForm || uploadingMedia) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const mediaType = getMediaType(file);

    if (!mediaType) {
      alert("Unsupported file type. Please upload images, videos, audio, or documents.");
      return;
    }

    await handleFileDrop(file, mediaType);
  }, [canSendFreeForm, uploadingMedia, getMediaType]);

  // Handle file drop upload
  const handleFileDrop = async (file: File, mediaType: MediaKind) => {
    try {
      setUploadProgress(0);

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

      const customEvent = new CustomEvent("fileDropped", {
        detail: { file, mediaType, bunnyUrl: url, filename },
      });
      window.dispatchEvent(customEvent);

      setUploadProgress(0);
    } catch (error: any) {
      console.error("Drag & drop upload error:", error);
      alert(error.response?.data?.error || "Failed to upload file");
      setUploadProgress(0);
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  }, [onSendMessage]);

  // Handle paste event for image support
  // Shows preview first, only sends when user clicks send button
  // Supports multiple images in a single paste
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Check if clipboard contains image
    const items = e.clipboardData?.items;
    if (!items) return;

    const newImages: Array<{ id: string; file: File; previewUrl: string }> = [];

    // Find all image items in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // If clipboard contains an image (any image/* MIME type)
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // Prevent default text paste for images
        
        try {
          // Extract image as File
          const file = item.getAsFile();
          if (!file) continue;

          // Validate file size (200MB limit)
          const maxSize = 200 * 1024 * 1024;
          if (file.size > maxSize) {
            console.error("Pasted image too large");
            continue;
          }

          // Create preview URL and add to array
          const previewUrl = URL.createObjectURL(file);
          newImages.push({
            id: `pasted-${Date.now()}-${i}`,
            file,
            previewUrl,
          });
        } catch (error) {
          console.error("Error handling pasted image:", error);
        }
      }
    }

    // If images were found, add them to the preview
    if (newImages.length > 0) {
      setPastedImages((prev) => [...prev, ...newImages]);
      // Autofocus caption input when preview appears
      setTimeout(() => {
        captionInputRef.current?.focus();
      }, 100);
    }
    // If no image found, let default text paste behavior continue unchanged
  }, []);

  // Remove a single image from preview
  const handleRemovePastedImage = useCallback((id: string) => {
    setPastedImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  // Handle sending all pasted images with optional caption
  const handleSendPastedImages = useCallback(async () => {
    if (pastedImages.length === 0) return;

    // If custom handler provided (for caption support), use it
    if (onSendPastedImagesWithCaption) {
      const files = pastedImages.map((img) => img.file);
      await onSendPastedImagesWithCaption(files, imageCaption);
      
      // Clear preview and caption
      pastedImages.forEach((img) => {
        URL.revokeObjectURL(img.previewUrl);
      });
      setPastedImages([]);
      setImageCaption("");
      return;
    }

    // Fallback: Use existing file upload handler (no caption support)
    const dataTransfer = new DataTransfer();
    pastedImages.forEach((img) => {
      dataTransfer.items.add(img.file);
    });
    
    const syntheticEvent = {
      target: {
        files: dataTransfer.files,
        value: "",
      },
    } as React.ChangeEvent<HTMLInputElement>;

    // Use existing file upload handler
    onHandleFileUpload(syntheticEvent, "image");
    
    // Clear preview and caption
    pastedImages.forEach((img) => {
      URL.revokeObjectURL(img.previewUrl);
    });
    setPastedImages([]);
    setImageCaption("");
  }, [pastedImages, imageCaption, onHandleFileUpload, onSendPastedImagesWithCaption]);

  // Handle canceling all pasted images
  const handleCancelPastedImages = useCallback(() => {
    pastedImages.forEach((img) => {
      URL.revokeObjectURL(img.previewUrl);
    });
    setPastedImages([]);
    setImageCaption("");
  }, [pastedImages]);

  const handleEmojiSelect = useCallback((emoji: any) => {
    onMessageChange(newMessage + emoji.native);
    setShowEmojiPicker(false);
  }, [newMessage, onMessageChange]);

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        "flex-shrink-0 bg-[#f0f2f5] dark:bg-[#202c33] relative",
        isDragging && "ring-2 ring-inset ring-[#25d366]"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#25d366]/10 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-white dark:bg-[#202c33] rounded-2xl p-6 shadow-xl text-center">
            <div className="w-16 h-16 rounded-full bg-[#25d366]/10 flex items-center justify-center mx-auto mb-3">
              <Plus className="h-8 w-8 text-[#25d366]" />
            </div>
            <p className="text-[16px] text-[#111b21] dark:text-[#e9edef] font-medium">
              Drop files here
            </p>
            <p className="text-[14px] text-[#667781] dark:text-[#8696a0]">
              to send them
            </p>
          </div>
        </div>
      )}

      {/* Pasted image preview - WhatsApp Web style */}
      {pastedImages.length > 0 && (
        <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#1f2c33] border-b border-[#e9edef] dark:border-[#222d34] transition-all duration-200 ease-in-out">
          <div className="bg-white dark:bg-[#202c33] rounded-lg p-3">
            {/* Image preview strip - horizontal scrollable */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-thin scrollbar-thumb-[#c5c6c8] dark:scrollbar-thumb-[#374045]">
              {pastedImages.map((img) => (
                <div
                  key={img.id}
                  className="relative flex-shrink-0 group"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#f0f2f5] dark:bg-[#374045]">
                    <img
                      src={img.previewUrl}
                      alt="Pasted image"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Remove button - appears on hover */}
                  <button
                    onClick={() => handleRemovePastedImage(img.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>

            {/* Caption input */}
            <div className="mb-3">
              <textarea
                ref={captionInputRef}
                placeholder="Add a caption..."
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent Enter from sending if Shift is not held
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    // Don't send on Enter - user must click Send button
                  }
                }}
                rows={2}
                className={cn(
                  "w-full bg-[#f0f2f5] dark:bg-[#2a3942] rounded-lg px-3 py-2",
                  "text-[14px] text-[#111b21] dark:text-[#e9edef]",
                  "placeholder:text-[#8696a0] resize-none",
                  "border-0 outline-none focus-visible:ring-2 focus-visible:ring-[#25d366] focus-visible:ring-offset-0",
                  "min-h-[60px] max-h-[120px]",
                  "scrollbar-thin scrollbar-thumb-[#c5c6c8] dark:scrollbar-thumb-[#374045]"
                )}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleCancelPastedImages}
                className="h-9 px-4 rounded-full text-[#667781] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#374045]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendPastedImages}
                disabled={uploadingMedia}
                className="h-9 px-6 rounded-full bg-[#25d366] hover:bg-[#1da851] text-white font-medium"
              >
                {uploadingMedia ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reply preview bar - WhatsApp style */}
      {replyToMessage && (
        <div className="px-4 py-2 bg-[#f0f2f5] dark:bg-[#1f2c33] border-b border-[#e9edef] dark:border-[#222d34]">
          <div className="flex items-start gap-2 bg-white dark:bg-[#202c33] rounded-lg overflow-hidden">
            {/* Left accent bar */}
            <div className="w-1 self-stretch bg-[#25d366] flex-shrink-0" />
            
            {/* Content */}
            <div className="flex-1 py-2 pr-2 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[13px] font-medium text-[#25d366]">
                  {replyToMessage.direction === "outgoing" ? "You" : replyToMessage.from}
                </p>
                <button
                  onClick={onCancelReply}
                  className="p-1 hover:bg-[#f0f2f5] dark:hover:bg-[#374045] rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-[#8696a0]" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                {/* Media thumbnail if present */}
                {replyToMessage.mediaUrl && (
                  <div className="w-10 h-10 rounded flex-shrink-0 bg-black/10 dark:bg-white/10 overflow-hidden">
                    {replyToMessage.type === "image" || replyToMessage.type === "sticker" ? (
                      <img
                        src={replyToMessage.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : replyToMessage.type === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-black/20">
                        <Play className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-[#8696a0]" />
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[13px] text-[#667781] dark:text-[#8696a0] truncate">
                  {(() => {
                    if (replyToMessage.type === "image") return "📷 Photo";
                    if (replyToMessage.type === "video") return "🎬 Video";
                    if (replyToMessage.type === "audio") return "🎵 Audio";
                    if (replyToMessage.type === "document") return "📄 Document";
                    if (replyToMessage.type === "sticker") return "🎭 Sticker";
                    return getMessageDisplayText(replyToMessage);
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="px-4 py-2 border-b border-[#e9edef] dark:border-[#222d34]">
          <div className="flex items-center justify-between text-xs text-[#667781] dark:text-[#8696a0] mb-1">
            <span>Uploading file...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-[#e9edef] dark:bg-[#374045] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#25d366] h-full transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Template expired warning - Hidden for "You" conversations */}
      {!canSendFreeForm && !isYouConversation && (
        <div className="px-4 py-3 bg-[#fdf4e3] dark:bg-[#3b2c13] border-b border-[#e9c96c] dark:border-[#5c4516]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#f0c14b]/20 flex items-center justify-center">
                <LayoutTemplate className="h-4 w-4 text-[#b7892b]" />
              </div>
              <div>
                <p className="text-[14px] text-[#111b21] dark:text-[#e9edef] font-medium">
                  24-hour window closed
                </p>
                <p className="text-[12px] text-[#667781] dark:text-[#8696a0]">
                  You can only send template messages
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={onOpenTemplateFromWarning}
              className="bg-[#25d366] hover:bg-[#1da851] text-white rounded-full"
            >
              <LayoutTemplate className="h-4 w-4 mr-1" />
              Send Template
            </Button>
          </div>
        </div>
      )}

      {/* Main composer area */}
      <div className="px-4 py-2 flex items-end gap-2">
        {/* Template dialog (hidden trigger) */}
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
          context={templateContext}
        />

        {/* Hidden file inputs */}
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
          multiple
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

        {/* Emoji picker */}
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canSendFreeForm}
              className="h-10 w-10 rounded-full text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#374045] flex-shrink-0"
            >
              <Smile className="h-6 w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-0" side="top" align="start">
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="auto"
              previewPosition="none"
              skinTonePosition="none"
            />
          </PopoverContent>
        </Popover>

        {/* Attachment menu */}
        <Popover open={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={uploadingMedia || !canSendFreeForm}
              className={cn(
                "h-10 w-10 rounded-full text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#374045] flex-shrink-0 transition-transform",
                showAttachmentMenu && "rotate-45"
              )}
            >
              {uploadingMedia ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Plus className="h-6 w-6" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top" align="start">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  imageInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#374045] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#7f66ff] flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-[12px] text-[#54656f] dark:text-[#8696a0]">Photos</span>
              </button>

              <button
                onClick={() => {
                  videoInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#374045] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#ff2e74] flex items-center justify-center">
                  <Film className="h-6 w-6 text-white" />
                </div>
                <span className="text-[12px] text-[#54656f] dark:text-[#8696a0]">Videos</span>
              </button>

              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#374045] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#5157ae] flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <span className="text-[12px] text-[#54656f] dark:text-[#8696a0]">Document</span>
              </button>

              <button
                onClick={() => {
                  audioInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#374045] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#ff5c00] flex items-center justify-center">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <span className="text-[12px] text-[#54656f] dark:text-[#8696a0]">Audio</span>
              </button>

              {/* Template button - Hidden for "You" conversations */}
              {!isYouConversation && (
                <button
                  onClick={() => {
                    onTemplateDialogChange(true);
                    setShowAttachmentMenu(false);
                  }}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#374045] transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-[#25d366] flex items-center justify-center">
                    <LayoutTemplate className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-[12px] text-[#54656f] dark:text-[#8696a0]">Template</span>
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            placeholder={
              canSendFreeForm ? "Type a message" : "Send a template message..."
            }
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={!canSendFreeForm}
            rows={1}
            className={cn(
              "w-full bg-white dark:bg-[#2a3942] rounded-lg px-3 py-2.5",
              "text-[15px] text-[#111b21] dark:text-[#e9edef]",
              "placeholder:text-[#8696a0] resize-none",
              "border-0 outline-none focus-visible:ring-0",
              "min-h-[42px] max-h-[150px]",
              "scrollbar-thin scrollbar-thumb-[#c5c6c8] dark:scrollbar-thumb-[#374045]"
            )}
          />
        </div>

        {/* Send / Voice button */}
        {newMessage.trim() ? (
          <Button
            onClick={onSendMessage}
            disabled={!newMessage.trim() || sendingMessage || uploadingMedia || !canSendFreeForm}
            className="h-10 w-10 rounded-full bg-[#25d366] hover:bg-[#1da851] flex-shrink-0 p-0"
          >
            {sendingMessage ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Send className="h-5 w-5 text-white" />
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            disabled={!canSendFreeForm}
            className="h-10 w-10 rounded-full text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#374045] flex-shrink-0"
          >
            <Mic className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
});
