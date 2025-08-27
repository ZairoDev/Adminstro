"use client";

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option =
  | { label: string; value: string }
  | string;

export function SelectableCell({
  data,
  value,
  save,
  maxWidth,
}: {
  data: Option[];
  value: string;
  save: (val: string) => void;
  maxWidth?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // Normalize: get label for display
  const getLabel = (val: string) => {
    const found = data.find((item) =>
      typeof item === "string" ? item === val : item.value === val
    );
    if (!found) return val;
    return typeof found === "string" ? found : found.label;
  };

  return (
    <div
      className={`truncate cursor-pointer inline-block px-2 py-1 rounded-md transition-colors
        ${editing ? "bg-gray-700" : "hover:bg-gray-500"}`}
      style={{ maxWidth }}
      onClick={() => !editing && setEditing(true)}
    >
      {editing ? (
        <Select
          defaultValue={draft}
          onValueChange={(val) => {
            setDraft(val);
            save(val);
            setEditing(false);
          }}
        >
          <SelectTrigger className="w-full text-md border border-gray-100 rounded-md p-1  ">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {data.map((item) =>
              typeof item === "string" ? (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ) : (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`text-md border rounded-md p-1 block ${
                  value ? "text-gray-200" : "text-gray-400 italic"
                }`}
              >
                {value ? getLabel(value) : "Click"}
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
