"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Send,
  Loader2,
  FileText,
  Film,
  Music,
  ImageIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MediaType = "image" | "video" | "document" | "audio";

export interface MediaFile {
  id: string;
  file: File;
  previewUrl: string;
  type: MediaType;
  caption: string;
  uploadProgress?: number;
}

export interface MediaSendPreviewProps {
  files: MediaFile[];
  onFilesChange: (files: MediaFile[]) => void;
  onSend: (files: MediaFile[]) => Promise<void>;
  onCancel: () => void;
  isSending?: boolean;
  captionPlaceholder?: string;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: MediaType[];
  showAddMore?: boolean;
  onAddMore?: () => void;
  className?: string;
  disabled?: boolean;
}

export function getMediaTypeFromFile(file: File): MediaType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("application/") || file.type === "text/plain") return "document";
  return null;
}

export function createMediaFile(file: File, index: number = 0): MediaFile | null {
  const type = getMediaTypeFromFile(file);
  if (!type) return null;

  return {
    id: `media-${Date.now()}-${index}`,
    file,
    previewUrl: URL.createObjectURL(file),
    type,
    caption: "",
  };
}

export function revokeMediaFileUrls(files: MediaFile[]): void {
  files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaIcon({ type, className }: { type: MediaType; className?: string }) {
  switch (type) {
    case "image":
      return <ImageIcon className={className} />;
    case "video":
      return <Film className={className} />;
    case "audio":
      return <Music className={className} />;
    case "document":
      return <FileText className={className} />;
  }
}

export const MediaSendPreview = memo(function MediaSendPreview({
  files,
  onFilesChange,
  onSend,
  onCancel,
  isSending = false,
  captionPlaceholder = "Add a caption...",
  maxFiles = 10,
  showAddMore = true,
  onAddMore,
  className,
  disabled = false,
}: MediaSendPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (files.length > 0 && selectedIndex >= files.length) {
      setSelectedIndex(files.length - 1);
    }
  }, [files.length, selectedIndex]);

  useEffect(() => {
    if (files.length > 0) {
      setTimeout(() => captionInputRef.current?.focus(), 100);
    }
  }, [files.length, selectedIndex]);

  const handleRemoveFile = useCallback(
    (id: string) => {
      const fileToRemove = files.find((f) => f.id === id);
      if (fileToRemove) URL.revokeObjectURL(fileToRemove.previewUrl);
      const newFiles = files.filter((f) => f.id !== id);
      onFilesChange(newFiles);
      if (newFiles.length === 0) onCancel();
    },
    [files, onFilesChange, onCancel]
  );

  const handleCaptionChange = useCallback(
    (caption: string) => {
      const updated = files.map((f, i) =>
        i === selectedIndex ? { ...f, caption } : f
      );
      onFilesChange(updated);
    },
    [files, selectedIndex, onFilesChange]
  );

  const handleSend = useCallback(async () => {
    if (files.length === 0 || isSending || disabled) return;
    setLocalError(null);
    try {
      await onSend(files);
    } catch (error: any) {
      setLocalError(error?.message || "Failed to send media");
    }
  }, [files, isSending, disabled, onSend]);

  const handleCancel = useCallback(() => {
    revokeMediaFileUrls(files);
    onCancel();
  }, [files, onCancel]);

  const goToPrev = useCallback(() => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToNext = useCallback(() => {
    setSelectedIndex((i) => Math.min(files.length - 1, i + 1));
  }, [files.length]);

  if (files.length === 0) return null;

  const currentFile = files[selectedIndex];
  const allImages = files.every((f) => f.type === "image");
  const canAddMore = showAddMore && allImages && files.length < maxFiles && onAddMore;
  const isUploading = files.some(
    (f) => f.uploadProgress !== undefined && f.uploadProgress < 100
  );
  const overallProgress =
    files.reduce((acc, f) => acc + (f.uploadProgress ?? 100), 0) / files.length;

  return (
    <div
      className={cn(
        "bg-[#f0f2f5] dark:bg-[#1f2c33] border-b border-[#e9edef] dark:border-[#222d34]",
        className
      )}
    >
      <div className="px-2 py-2 ">
        <div className="bg-white dark:bg-[#202c33] rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[#111b21] dark:text-[#e9edef]">
              <MediaIcon type={currentFile.type} className="h-5 w-5" />
              <span className="text-[14px] font-medium truncate max-w-[180px]">
                {currentFile.file.name}
              </span>
              <span className="text-[12px] text-[#667781] dark:text-[#8696a0]">
                ({formatFileSize(currentFile.file.size)})
              </span>
            </div>
            <button
              onClick={handleCancel}
              disabled={isSending}
              className="p-1.5 hover:bg-[#f0f2f5] dark:hover:bg-[#374045] rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-[#54656f] dark:text-[#8696a0]" />
            </button>
          </div>

          <div className="flex items-center justify-center mb-3 ">
            <div className="w-full max-w-[420px] max-h-[50vh] flex items-center justify-center">
              {currentFile.type === "image" && (
                <img
                  src={currentFile.previewUrl}
                  alt={currentFile.file.name}
                  className="max-w-full max-h-[50vh] object-contain rounded-lg"
                />
              )}
              {currentFile.type === "video" && (
                <video
                  src={currentFile.previewUrl}
                  controls
                  className="max-w-full max-h-[50vh] rounded-lg"
                />
              )}
              {currentFile.type === "audio" && (
                <div className="w-full max-w-[360px] p-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl">
                  <Music className="h-12 w-12 text-white mx-auto mb-3" />
                  <p className="text-white text-center font-medium truncate mb-3">
                    {currentFile.file.name}
                  </p>
                  <audio src={currentFile.previewUrl} controls className="w-full" />
                </div>
              )}
              {currentFile.type === "document" && (
                <div className="w-full max-w-[360px] p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-center">
                  <FileText className="h-12 w-12 text-white mx-auto mb-3" />
                  <p className="text-white font-medium truncate">
                    {currentFile.file.name}
                  </p>
                  <p className="text-white/70 text-sm mt-1">
                    {formatFileSize(currentFile.file.size)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {files.length > 1 && (
            <div className="mb-3 pb-2 ">
              <div className="flex gap-2 overflow-x-auto h-20 p-2  justify-center scrollbar-thin scrollbar-thumb-[#c5c6c8] dark:scrollbar-thumb-[#374045]">
                {files.map((media, index) => (
                  <button
                    key={media.id}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "relative flex-shrink-0 w-16 h-full rounded-lg overflow-hidden transition-all",
                      index === selectedIndex
                        ? "ring-2 ring-[#25d366] ring-offset-2 ring-offset-white dark:ring-offset-[#202c33]"
                        : "opacity-60 hover:opacity-100"
                    )}
                  >
                    {media.type === "image" && (
                      <img
                        src={media.previewUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    {media.type === "video" && (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Film className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {media.type === "audio" && (
                      <div className="w-full h-full bg-orange-500 flex items-center justify-center">
                        <Music className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {media.type === "document" && (
                      <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {media.caption && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#25d366]" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(media.id);
                      }}
                      className="absolute top-0 right-0 w-5 h-5 z-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg border-2 border-white dark:border-[#202c33] hover:bg-red-600 transition-colors p-0"
                    >
                      <X className="h-3 w-3 text-white m-0" />
                    </button>
                  </button>
                ))}
                {canAddMore && !isSending && (
                  <button
                    onClick={onAddMore}
                    className="flex-shrink-0 w-12 h-12 rounded-lg border-2 border-dashed border-[#c5c6c8] dark:border-[#374045] hover:border-[#25d366] flex items-center justify-center transition-colors"
                  >
                    <Plus className="h-5 w-5 text-[#667781] dark:text-[#8696a0]" />
                  </button>
                )}
              </div>
              <div className="text-center text-xs text-[#667781] dark:text-[#8696a0] mt-0.5">
                {selectedIndex + 1} of {files.length}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-[#667781] dark:text-[#8696a0] mb-1">
                <span>Uploading...</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <div className="w-full bg-[#e9edef] dark:bg-[#374045] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#25d366] h-full transition-all duration-150"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {localError && (
            <div className="mb-3 px-3 py-2 bg-red-500/10 rounded-lg">
              <p className="text-[13px] text-red-500 dark:text-red-400">
                {localError}
              </p>
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                ref={captionInputRef}
                placeholder={captionPlaceholder}
                value={currentFile.caption}
                onChange={(e) => handleCaptionChange(e.target.value)}
                disabled={isSending || disabled}
                rows={1}
                className={cn(
                  "w-full bg-[#f0f2f5] dark:bg-[#2a3942] rounded-lg px-3 py-2",
                  "text-[14px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0]",
                  "border-0 outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]",
                  "min-h-[40px] max-h-[96px] resize-none"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={isSending || disabled || files.length === 0}
              className="h-10 w-10 rounded-full bg-[#25d366] hover:bg-[#1da851] p-0 flex-shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Send className="h-4 w-4 text-white" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export interface UsePasteMediaOptions {
  enabled?: boolean;
  allowedTypes?: MediaType[];
  maxFileSize?: number;
  maxFiles?: number;
  onPaste?: (files: MediaFile[]) => void;
  onError?: (error: string) => void;
}

export function usePasteMedia({
  enabled = true,
  allowedTypes = ["image"],
  maxFileSize = 200 * 1024 * 1024,
  maxFiles = 10,
  onPaste,
  onError,
}: UsePasteMediaOptions = {}) {
  const [pastedFiles, setPastedFiles] = useState<MediaFile[]>([]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (!enabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const newFiles: MediaFile[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const mediaType = getMediaTypeFromFile({ type: item.type } as File);

        if (mediaType && allowedTypes.includes(mediaType)) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          if (file.size > maxFileSize) {
            onError?.(`File too large (max ${formatFileSize(maxFileSize)})`);
            continue;
          }
          if (newFiles.length + pastedFiles.length >= maxFiles) {
            onError?.(`Maximum ${maxFiles} files allowed`);
            break;
          }
          const mediaFile = createMediaFile(file, newFiles.length);
          if (mediaFile) newFiles.push(mediaFile);
        }
      }

      if (newFiles.length > 0) {
        setPastedFiles((prev) => [...prev, ...newFiles]);
        onPaste?.(newFiles);
      }
    },
    [enabled, allowedTypes, maxFileSize, maxFiles, pastedFiles.length, onPaste, onError]
  );

  const clearPastedFiles = useCallback(() => {
    revokeMediaFileUrls(pastedFiles);
    setPastedFiles([]);
  }, [pastedFiles]);

  const removePastedFile = useCallback((id: string) => {
    setPastedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  useEffect(() => {
    return () => {
      pastedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  return { handlePaste, pastedFiles, setPastedFiles, clearPastedFiles, removePastedFile };
}

export interface UseDragDropMediaOptions {
  enabled?: boolean;
  allowedTypes?: MediaType[];
  maxFileSize?: number;
  maxFiles?: number;
  onDrop?: (files: MediaFile[]) => void;
  onError?: (error: string) => void;
}

export function useDragDropMedia({
  enabled = true,
  allowedTypes = ["image", "video", "document", "audio"],
  maxFileSize = 200 * 1024 * 1024,
  maxFiles = 10,
  onDrop,
  onError,
}: UseDragDropMediaOptions = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCountRef = useRef(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!enabled) return;
      dragCountRef.current++;
      if (dragCountRef.current === 1) setIsDragging(true);
    },
    [enabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setIsDragging(false);
      if (!enabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 0) return;

      const validFiles: MediaFile[] = [];

      for (const file of droppedFiles) {
        const mediaType = getMediaTypeFromFile(file);
        if (!mediaType) {
          onError?.(`Unsupported file type: ${file.type || "unknown"}`);
          continue;
        }
        if (!allowedTypes.includes(mediaType)) {
          onError?.(`${mediaType} files not allowed`);
          continue;
        }
        if (file.size > maxFileSize) {
          onError?.(`${file.name} is too large (max ${formatFileSize(maxFileSize)})`);
          continue;
        }
        if (validFiles.length >= maxFiles) {
          onError?.(`Maximum ${maxFiles} files allowed`);
          break;
        }
        const mediaFile = createMediaFile(file, validFiles.length);
        if (mediaFile) validFiles.push(mediaFile);
      }

      if (validFiles.length > 0) onDrop?.(validFiles);
    },
    [enabled, allowedTypes, maxFileSize, maxFiles, onDrop, onError]
  );

  return {
    isDragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}

export default MediaSendPreview;
