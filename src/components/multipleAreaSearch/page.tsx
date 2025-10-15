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
import { Badge } from "@/components/ui/badge";

type Option = { label: string; value: string; tooltip?: string } | string;

type MultiAreaSelectProps = {
  data: Option[];
  values: string[];
  save: (vals: string[]) => void;
  tooltipText?: string;
  icon?: React.ReactNode;
  maxWidth?: string;
};

export function MultiAreaSelect({
  data,
  values,
  save,
  tooltipText,
  icon,
  maxWidth = "260px",
}: MultiAreaSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const getLabel = (val: string) => {
    const found = data.find((item) =>
      typeof item === "string" ? item === val : item.value === val
    );
    if (!found) return val;
    return typeof found === "string" ? found : found.label;
  };

  const handleToggle = (val: string) => {
    const newValues = values.includes(val)
      ? values.filter((v) => v !== val)
      : [...values, val];
    save(newValues);
  };

  const handleClear = () => {
    save([]);
    setOpen(false);
    setSearch("");
  };

  const handleRemoveChip = (val: string) => {
    save(values.filter((v) => v !== val));
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
              "justify-between px-3 py-2 h-auto rounded-md border border-gray-700 bg-gray-900 hover:bg-gray-800 transition-colors",
              "text-sm font-medium text-gray-200 w-full flex-wrap gap-1"
            )}
            style={{ maxWidth }}
            onClick={() => setOpen(true)}
          >
            <div className="flex items-center gap-2 flex-wrap truncate">
              {icon}
              {values.length > 0 ? (
                values.map((v) => (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="flex items-center gap-1 text-xs bg-gray-800 border border-gray-600 text-gray-100"
                  >
                    {getLabel(v)}
                    <X
                      className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveChip(v);
                      }}
                    />
                  </Badge>
                ))
              ) : (
                <span className="text-gray-400">Select Areas</span>
              )}
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
              Select Multiple Areas
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
                    const isSelected = values.includes(val);
                    return (
                      <CommandItem
                        key={index}
                        value={val}
                        onSelect={() => handleToggle(val)}
                        className="flex justify-between py-2 text-sm"
                      >
                        <span>{label}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          {values.length > 0 && (
            <div className="flex justify-end p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600"
                onClick={handleClear}
              >
                <X className="mr-1 h-4 w-4" /> Clear All
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
