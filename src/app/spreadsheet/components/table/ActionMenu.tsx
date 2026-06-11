import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { unregisteredOwners } from "@/util/type";
import { MoreVertical } from "lucide-react";
import { UploadCell } from "../cells/UploadCell";
import { DownloadCell } from "../cells/DownloadCell";
import { useMemo } from "react";

import { OWNER_SHEET_LONG_TERM_CONFIG } from "../../ownerSheetConfig";

interface ActionMenuProps {
  item: unregisteredOwners;
  apiBasePath?: string;
  onUploadComplete?: (id: string, newUrls: string[]) => void;
}

export function ActionMenu({
  item,
  apiBasePath = OWNER_SHEET_LONG_TERM_CONFIG.apiBasePath,
  onUploadComplete,
}: ActionMenuProps) {
  // ✅ Determine if there's something to download
  const hasDownloadable = useMemo(() => {
    return (
      item?.imageUrls?.length > 0 // if your object has downloadUrls
      // item?.fileUrls?.length > 0 ||     // or maybe fileUrls depending on schema
      // item?.documents?.some((d) => !!d.url) // or a nested array of docs
    );
  }, [item]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 rounded-md shadow-none ${
            hasDownloadable
              ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
          onClick={(e) => e.stopPropagation()}
          aria-label="Row actions"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>

      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-32">
        <DropdownMenuItem asChild >
          <div  onClick={(e) => e.stopPropagation()}>
            <UploadCell
              item={item}
              apiBasePath={apiBasePath}
              onUploadComplete={onUploadComplete}
            />
            
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <div onClick={(e) => e.stopPropagation()}>
            <DownloadCell item={item} />
            
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
