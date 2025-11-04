import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface SelectedCell {
  rowId: string;
  field: string;
  value: string;
  rowIndex: number;
  colIndex: number;
}

interface SpreadsheetFormulaBarProps {
  selectedCell: SelectedCell | null;
  onCellValueChange: ( newValue: string) => void;
  onAddRow: () => void;
}

// Map display field names to actual database field names


export function SpreadsheetFormulaBar({
  selectedCell,
  onCellValueChange,
  onAddRow,
}: SpreadsheetFormulaBarProps) {
  const [localValue, setLocalValue] = useState("");

  // Sync local value with selected cell
  useEffect(() => {
    setLocalValue(selectedCell?.value || "");
  }, [selectedCell]);

  const handleBlur = () => {
    if (selectedCell && localValue !== selectedCell.value) {
      // Map the display field name to the actual database field name
  
      onCellValueChange( localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && selectedCell) {
 
      onCellValueChange( localValue);
      e.currentTarget.blur();
    }
  };

 

  return (
    <div className="border-b bg-muted/50 px-3 py-2 flex items-center gap-2">
      <Button
        onClick={onAddRow}
        className="flex items-center gap-2 rounded-full"
      >
        <Plus className="h-4 w-4" />
        {/* Add New Lead */}
      </Button>

      <span className="text-xs font-medium text-muted-foreground min-w-[60px]">
        {selectedCell ? `${selectedCell.field}:` : "Cell:"}
      </span>

      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-8 text-xs bg-background flex-1"
        placeholder="Select a cell to view and edit its value"
      />
    </div>
  );
}