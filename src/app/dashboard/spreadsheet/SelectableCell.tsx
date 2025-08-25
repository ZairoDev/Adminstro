import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SelectableCell({
  data,
  value,
  save,
  maxWidth,
}: {
  data: string[];
  value: string;
  save: (val: string) => void;
  maxWidth?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div
      className={`truncate cursor-pointer inline-block px-2 py-1 rounded-md transition-colors
        ${editing ? "bg-gray-100" : "hover:bg-gray-50"}`}
      style={{ maxWidth }}
      onClick={() => !editing && setEditing(true)}
    >
      {editing ? (
        <select
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            save(draft);
          }}
          className="w-full text-xs border border-gray-300 rounded-md p-1 focus:outline-none focus:ring focus:ring-blue-200"
        >
          {data.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`text-xs block ${
                  value ? "text-gray-500" : "text-gray-400 italic"
                }`}
              >
                {value || "Click to select"}
              </span>
            </TooltipTrigger>
            {value && (
              <TooltipContent>
                <p className="whitespace-pre-wrap">{value}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
