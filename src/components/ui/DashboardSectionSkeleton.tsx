import { Loader2 } from "lucide-react";

interface DashboardSectionSkeletonProps {
  label?: string;
  height?: string;
}

export function DashboardSectionSkeleton({
  label = "Loading...",
  height = "h-64",
}: DashboardSectionSkeletonProps) {
  return (
    <div
      className={`w-full ${height} flex flex-col items-center justify-center gap-3
                    rounded-xl border border-border bg-muted/30 animate-pulse`}
    >
      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
