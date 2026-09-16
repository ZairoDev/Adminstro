"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, FolderOpen, Search } from "lucide-react";
import { toast } from "sonner";
import axios from "@/util/axios";
import { Input } from "@/components/ui/input";
import { MyDocumentCard } from "@/components/documents/MyDocumentCard";
import {
  MY_DOCUMENT_CATEGORIES,
  MY_DOCUMENT_CATEGORY_LABELS,
  type MyDocumentCategory,
  type MyDocumentItem,
} from "@/lib/people/my-documents";
import { cn } from "@/lib/utils";

type DocumentsResponse = {
  documents?: MyDocumentItem[];
  hasCandidateProfile?: boolean;
};

export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState<MyDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCandidateProfile, setHasCandidateProfile] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MyDocumentCategory | "all">("all");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<DocumentsResponse>("/api/employee/my-documents");
      setDocuments(res.data?.documents ?? []);
      setHasCandidateProfile(res.data?.hasCandidateProfile !== false);
    } catch {
      toast.error("Could not load your documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (category !== "all" && doc.category !== category) return false;
      if (!term) return true;
      return (
        doc.label.toLowerCase().includes(term) ||
        (doc.details ?? "").toLowerCase().includes(term) ||
        MY_DOCUMENT_CATEGORY_LABELS[doc.category].toLowerCase().includes(term)
      );
    });
  }, [documents, query, category]);

  const counts = useMemo(() => {
    const byCategory = MY_DOCUMENT_CATEGORIES.reduce(
      (acc, key) => {
        acc[key] = documents.filter((doc) => doc.category === key).length;
        return acc;
      },
      {} as Record<MyDocumentCategory, number>
    );
    return byCategory;
  }, [documents]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FolderOpen className="h-6 w-6 text-[#F7951D]" aria-hidden="true" />
          My Documents
        </h1>
        <p className="text-sm text-muted-foreground">
          Application, onboarding, issued letters, and other files on your profile.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search documents"
            className="h-11 pl-9"
            aria-label="Search documents"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Document categories">
        <button
          type="button"
          role="tab"
          aria-selected={category === "all"}
          onClick={() => setCategory("all")}
          className={cn(
            "inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            category === "all"
              ? "bg-[#F7951D] text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          All ({documents.length})
        </button>
        {MY_DOCUMENT_CATEGORIES.map((key) =>
          counts[key] > 0 ? (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={category === key}
              onClick={() => setCategory(key)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                category === key
                  ? "bg-[#F7951D] text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {MY_DOCUMENT_CATEGORY_LABELS[key]} ({counts[key]})
            </button>
          ) : null
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">No documents to show</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {!hasCandidateProfile
              ? "No hiring or onboarding files are linked to this account yet. Profile uploads will appear here when they are added."
              : query || category !== "all"
                ? "Try a different search or category."
                : "Files from your application, onboarding, and issued letters will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <MyDocumentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
