import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const surfaceCard =
  "rounded-2xl border border-[#EAE5DF] bg-white shadow-sm dark:border-border dark:bg-card";

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
        withHeader && "space-y-4 p-4",
        !withHeader && "space-y-5",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading attendance"
    >
      <span className="sr-only">Loading attendance</span>

      {withHeader ? (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2 border-l-4 border-primary pl-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
            <Skeleton className="h-11 w-11 rounded-md" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </header>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-8">
        <div
          className={cn(
            surfaceCard,
            "col-span-2 flex items-center justify-center gap-3 px-3 py-3 sm:col-span-3 md:col-span-2",
          )}
        >
          <Skeleton className="h-14 w-14 shrink-0 rounded-full sm:h-16 sm:w-16" />
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className={cn(
              surfaceCard,
              "col-span-1 flex flex-col items-start gap-1.5 px-3 py-3",
            )}
          >
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className={cn(surfaceCard, "space-y-3 border-transparent p-4")}
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </section>

      <section className={cn(surfaceCard, "space-y-5 p-4 md:p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-9 w-48 rounded-full" />
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl bg-[#EAE7E3] dark:bg-border">
          {Array.from({ length: 35 }, (_, index) => (
            <div
              key={index}
              className="min-h-[88px] space-y-2 bg-white p-2.5 dark:bg-card sm:min-h-[110px]"
            >
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="hidden h-3 w-16 sm:block" />
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.6fr]">
        <div className={cn(surfaceCard, "space-y-6 p-5 md:p-6")}>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-6 w-44" />
          </div>
          <div className="flex flex-wrap items-center justify-around gap-8">
            <Skeleton className="h-[190px] w-[190px] rounded-full" />
            <div className="space-y-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="flex min-w-[140px] items-center justify-between gap-8"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={cn(surfaceCard, "space-y-4 p-4 md:p-5")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Skeleton className="h-10 w-44 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
          <div className="space-y-0 overflow-hidden rounded-xl border border-[#EFEAE4] dark:border-border">
            <Skeleton className="h-11 w-full rounded-none" />
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-14 w-full rounded-none border-t border-[#F0EBE5] dark:border-border"
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </section>
    </div>
  );
}
