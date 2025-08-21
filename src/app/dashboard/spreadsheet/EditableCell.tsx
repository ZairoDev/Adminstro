import { useState } from "react";
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

  const handleSave = () => {
    setIsEditing(false);
    if (draft !== value) {
      onSave(draft);
    }
  };

  return (
    <div
      className={`truncate cursor-pointer inline-block`}
      style={{ maxWidth }}
      onClick={() => !isEditing && setIsEditing(true)}
    >
      {isEditing ? (
        type === "date" ? (
          // 👇 date editor
          <input
    type="date"
    autoFocus
    value={draft || ""} // keep as yyyy-mm-dd string
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
          // 👇 normal text editor
          <input
            autoFocus
            value={draft}
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
              <span>
                {type === "date" && value
                  ? new Date(value).toLocaleDateString()
                  : value}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="whitespace-pre-wrap">
                {type === "date" && value
                  ? new Date(value).toLocaleString()
                  : value}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
