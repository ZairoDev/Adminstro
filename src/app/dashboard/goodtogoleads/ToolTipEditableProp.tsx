"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EditableCell } from "./EditableCell"; // adjust path

type TooltipEditableCellProps = {
  value: string;
  onSave: (val: string) => void;
  tooltipText?: string; // text shown inside tooltip
  icon?: React.ReactNode;
  maxWidth?: string; // optional for styling
};

export const TooltipEditableCell = ({
  value,
  onSave,
  tooltipText,
  icon,
  maxWidth = "80px",
}: TooltipEditableCellProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {icon}
            <EditableCell value={value} onSave={onSave} maxWidth={maxWidth} />
          </div>
        </TooltipTrigger>
        {tooltipText && (
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
