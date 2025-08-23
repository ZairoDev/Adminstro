import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type EditableCellProps = {
  value: string;
  onSave: (newValue: string) => void;
  maxWidth?: string;
  type?: "text" | "date";
};

export function EditableCell({
  maxWidth = "150px",
  value,
  onSave,
  type = "text",
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // keep draft in sync if parent updates value externally
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    setIsEditing(false);
    // prevent saving unchanged values
    if (draft !== value) {
      onSave(draft.trim()); // trim spaces before saving
    }
  };

  return (
    <div
      className="inline-block cursor-pointer"
      style={{ maxWidth, minWidth: "80px" }} // ✅ minWidth ensures always clickable area
      onClick={() => !isEditing && setIsEditing(true)}
    >
      {isEditing ? (
        type === "date" ? (
          <input
            type="date"
            autoFocus
            value={draft || ""} // ✅ allow empty string safely
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setDraft(value);
                setIsEditing(false);
              }
            }}
            className="w-full border px-1 text-sm rounded outline-none"
          />
        ) : (
          <input
            type="text"
            autoFocus
            value={draft}
            placeholder="Click to edit" // ✅ visible placeholder when empty
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setDraft(value);
                setIsEditing(false);
              }
            }}
            className="w-full border px-1 text-sm rounded outline-none"
          />
        )
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block">
                {type === "date" && value
                  ? new Date(value).toLocaleDateString()
                  : value || "—"}{" "}
                {/* ✅ fallback display, but still editable */}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="whitespace-pre-wrap">
                {type === "date" && value
                  ? new Date(value).toLocaleString()
                  : value || "No value"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
