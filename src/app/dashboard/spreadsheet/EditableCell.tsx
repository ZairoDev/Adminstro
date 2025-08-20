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
};

export function EditableCell({
  value,
  onSave,
  maxWidth = "150px",
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
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{value}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="whitespace-pre-wrap">{value}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
