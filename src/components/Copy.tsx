import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyCellProps {
  value: string;
}

export const CopyCell: React.FC<CopyCellProps> = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div
      className="flex items-center gap-2 cursor-pointer text-blue-600 hover:underline"
      onClick={handleCopy}
    >
      <span>{value}</span>
      {copied ? (
        <Check size={16} className="text-green-500" />
      ) : (
        <Copy size={16} />
      )}
    </div>
  );
};
