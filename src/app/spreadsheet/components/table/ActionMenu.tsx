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

interface ActionMenuProps {
  item: unregisteredOwners;
  onUploadComplete?: (id: string, newUrls: string[]) => void;
}

export function ActionMenu({ item, onUploadComplete }: ActionMenuProps) {
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
  className={`p-0 h-6 w-6 transition-all rounded-md ${
    hasDownloadable
      ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-800"
      : "text-muted-foreground hover:text-foreground"
  }`}
  onClick={(e) => e.stopPropagation()}
>
  <MoreVertical className="h-4 w-4" />
</Button>

      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-32">
        <DropdownMenuItem asChild >
          <div  onClick={(e) => e.stopPropagation()}>
            <UploadCell item={item} onUploadComplete={onUploadComplete} />
            
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
