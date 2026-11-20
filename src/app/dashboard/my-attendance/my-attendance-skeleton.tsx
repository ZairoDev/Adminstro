import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function MyAttendanceSkeleton({
  withHeader = true,
  className,
}: {
  withHeader?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[#f2f4f7] dark:bg-background",
        withHeader && "space-y-6 p-4 md:p-6",
        !withHeader && "space-y-6",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading attendance"
    >
      <span className="sr-only">Loading attendance</span>
      {withHeader ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      ) : null}
      <div className="grid grid-cols-1 overflow-hidden rounded-md border border-border sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2 border-border p-4 sm:border-l sm:first:border-l-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="rounded-md border border-border p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    </div>
  );
}
