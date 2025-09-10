"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Area {
  _id: string;
  name: string;
}

interface SearchableSelectProps {
  areas: Area[];
  onSelect: (value: Area) => void;
}

export default function SearchableAreaSelect({
  areas,
  onSelect,
}: SearchableSelectProps) {
  const [selected, setSelected] = React.useState<Area | null>(null);

  const handleSelect = (loc: Area) => {
    setSelected(loc);
    onSelect(loc);
  };

  const clearSelection = () => {
    setSelected(null);
  };

  return (
    <div className="w-64 border rounded-md p-2">
      {!selected && (
        <Command>
          <CommandInput placeholder="Search area..." className="h-8 text-sm" />
          <CommandList className="max-h-20 overflow-y-auto">
            <CommandEmpty>No area found.</CommandEmpty>
            <CommandGroup>
              {areas
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((loc) => (
                  <CommandItem
                    key={loc._id}
                    value={loc.name}
                    onSelect={() => handleSelect(loc)}
                    className="py-1 text-sm" // smaller row height
                  >
                    {loc.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      )}

      {selected && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="font-medium">{selected.name}</span>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="text-muted-foreground hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
