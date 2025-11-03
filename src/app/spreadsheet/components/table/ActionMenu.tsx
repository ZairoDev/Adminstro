import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { unregisteredOwners } from "@/util/type";
import { MoreVertical } from "lucide-react";
import { UploadCell } from "../cells/UploadCell";
import { DownloadCell } from "../cells/DownloadCell";


interface ActionMenuProps {
    item: unregisteredOwners;
    onUploadComplete?: (id: string, newUrls: string[]) => void;
  }

 export function ActionMenu({ item, onUploadComplete }: ActionMenuProps) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="p-0 h-6 w-6"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem asChild>
            <div onClick={(e) => e.stopPropagation()}>
              <UploadCell item={item} onUploadComplete={onUploadComplete} />
              <span className="ml-2 text-sm">Upload</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <div onClick={(e) => e.stopPropagation()}>
              <DownloadCell item={item} />
              <span className="ml-2 text-sm">Download</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

