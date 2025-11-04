import type { unregisteredOwners } from "@/util/type";
import JSZip from "jszip"
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { saveAs } from "file-saver";


export function DownloadCell({ item }: { item: unregisteredOwners }) {
    const handleDownloadZip = async () => {
      if (!item.imageUrls || item.imageUrls.length === 0) {
        alert("No images to download");
        return;
      }

      const zip = new JSZip();

      for (let i = 0; i < item.imageUrls.length; i++) {
        const url = item.imageUrls[i];
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const filename = url.split("/").pop() || `image-${i + 1}.jpg`;
          zip.file(filename, blob);
        } catch (err) {
          console.error(`Failed to fetch ${url}`, err);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${item.name || "images"}.zip`);
    };

    return (
      <Button
        variant="ghost"
        size="icon"
        className="p-0 h-6 w-32 "
        onClick={handleDownloadZip}
      >
        <Download className="h-4 w-4 text-muted-foreground" />
        <span className="ml-2 text-sm">Download</span>
      </Button>
    );
  }