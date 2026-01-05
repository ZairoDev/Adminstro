"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface Note {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  onUpdate?: () => void;
}

export function NotesModal({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  onUpdate,
}: NotesModalProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchNotes = async () => {
    if (!candidateId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/notes`);
      const result = await response.json();

      if (result.success) {
        setNotes(result.data || []);
      } else {
        toast.error("Failed to fetch notes");
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && candidateId) {
      fetchNotes();
    }
  }, [open, candidateId]);

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) {
      toast.error("Note content cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNoteContent }),
      });

      const result = await response.json();

      if (result.success) {
        setNotes((prev) => [result.data, ...prev]);
        setNewNoteContent("");
        setIsAddingNote(false);
        toast.success("Note created successfully");
        onUpdate?.();
      } else {
        toast.error(result.error || "Failed to create note");
      }
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Failed to create note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) {
      toast.error("Note content cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/candidates/${candidateId}/notes/${noteId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setNotes((prev) =>
          prev.map((note) =>
            note._id === noteId ? result.data : note
          )
        );
        setEditingNoteId(null);
        setEditContent("");
        toast.success("Note updated successfully");
        onUpdate?.();
      } else {
        toast.error(result.error || "Failed to update note");
      }
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    setIsDeleting(noteId);
    try {
      const response = await fetch(
        `/api/candidates/${candidateId}/notes/${noteId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        setNotes((prev) => prev.filter((note) => note._id !== noteId));
        toast.success("Note deleted successfully");
        onUpdate?.();
      } else {
        toast.error(result.error || "Failed to delete note");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    } finally {
      setIsDeleting(null);
    }
  };

  const startEditing = (note: Note) => {
    setEditingNoteId(note._id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notes for {candidateName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Note Section */}
          {!isAddingNote ? (
            <Button
              onClick={() => setIsAddingNote(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          ) : (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              <Textarea
                placeholder="Enter your note here..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingNote(false);
                    setNewNoteContent("");
                  }}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateNote}
                  disabled={isSaving || !newNoteContent.trim()}
                >
                  {isSaving ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>
          )}

          {/* Notes List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading notes...
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No notes yet. Add your first note above.
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className="p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                >
                  {editingNoteId === note._id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                          disabled={isSaving}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateNote(note._id)}
                          disabled={isSaving || !editContent.trim()}
                        >
                          {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground whitespace-pre-wrap flex-1">
                          {note.content}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(note)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note._id)}
                            disabled={isDeleting === note._id}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            {isDeleting === note._id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground text-right">
                        Last updated: {formatDate(note.updatedAt)}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

