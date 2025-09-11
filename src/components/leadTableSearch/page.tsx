"use client";

import { useState } from "react";
import { Check, X, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Option = { label: string; value: string; tooltip?: string } | string;

type AreaSelectProps = {
  data: Option[];
  value: string;
  save: (val: string) => void;
  tooltipText?: string;
  icon?: React.ReactNode;
  maxWidth?: string;
};

export function AreaSelect({
  data,
  value,
  save,
  tooltipText,
  icon,
  maxWidth = "180px",
}: AreaSelectProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(value || null);
  const [search, setSearch] = useState("");

  const getLabel = (val: string) => {
    const found = data.find((item) =>
      typeof item === "string" ? item === val : item.value === val
    );
    if (!found) return val;
    return typeof found === "string" ? found : found.label;
  };

  const handleSelect = (val: string) => {
    setDraft(val);
    save(val);
    setOpen(false);
    setSearch(""); // clear search after select
  };

  const clearSelection = () => {
    setDraft(null);
    save("");
    setOpen(false);
    setSearch("");
  };

  const filteredData = data.filter((item) => {
    const label = typeof item === "string" ? item : item.label;
    return label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "justify-between px-3 py-2 h-10 rounded-md border border-gray-700 bg-gray-900 hover:bg-gray-800 transition-colors",
              "text-sm font-medium text-gray-200 w-full"
            )}
            style={{ maxWidth }}
            onClick={() => setOpen(true)}
          >
            <div className="flex items-center gap-2 truncate">
              {icon}
              {draft ? getLabel(draft) : "Select Area"}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </TooltipTrigger>
        {tooltipText && (
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        )}
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-lg font-semibold">
              Select Area
            </DialogTitle>
          </DialogHeader>

          <div className="p-2">
            <Command>
              <CommandInput
                placeholder="Search area..."
                className="h-9 text-sm"
                value={search}
                onValueChange={(val) => setSearch(val)}
              />
              <CommandList className="max-h-60 overflow-y-auto">
                <CommandEmpty>No area found.</CommandEmpty>
                <CommandGroup>
                  {filteredData.map((item, index) => {
                    const val = typeof item === "string" ? item : item.value;
                    const label = typeof item === "string" ? item : item.label;
                    return (
                      <CommandItem
                        key={index}
                        value={val}
                        onSelect={() => handleSelect(val)}
                        className="flex justify-between py-2 text-sm"
                      >
                        <span>{label}</span>
                        {draft === val && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          {draft && (
            <div className="flex justify-end p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600"
                onClick={clearSelection}
              >
                <X className="mr-1 h-4 w-4" /> Clear
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
