import { Card } from "@/components/ui/card";
import { Dot, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";

interface StatsCardProps {
  title?: string;
  target: number;
  achieved: number;
  today: number;
  yesterday: number;
  dailyrequired: number;
  dailyAchieved: number;
  rate: number;
  position?: { x: number; y: number };
  className?: string;
}

export function StatsCard({
  title = "Unknown",
  target,
  achieved,
  today,
  yesterday,
  dailyrequired,
  dailyAchieved,
  rate,
  position,
  className = "",
}: StatsCardProps) {
  //   const total = registered + unregistered;

  const requiredRunRate = useMemo(() => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of the month
    let remainingDays = 0;

    for (let d = new Date(today); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) remainingDays++; // Exclude Sundays (0 = Sunday)
    }

    if (remainingDays === 0) return 0; // avoid division by zero

    return (target - achieved) / remainingDays; // optional 2 decimal places
  }, [target, achieved]);

  return (
    <Card
      className={`
        relative overflow-hidden
        bg-gradient-to-br from-background via-muted/50 to-background
        dark:from-stone-950 dark:via-stone-900 dark:to-stone-950
        border border-border
        dark:border-stone-700/50
        shadow-lg
        dark:shadow-2xl dark:shadow-stone-950/50
        backdrop-blur-sm
        transition-all duration-300
        hover:shadow-xl
        dark:hover:shadow-stone-900/80
        hover:border-stone-400
        dark:hover:border-stone-600/50
        ${className}
      `}
      style={
        position
          ? {
              top: position.y + 20,
              left: position.x + 20,
              minWidth: "220px",
            }
          : { minWidth: "220px" }
      }
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-muted/30 to-transparent dark:from-stone-800/20 rounded-bl-full" />

      <div className="relative p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl text-foreground tracking-tight">
            {title}
          </h3>
          {dailyAchieved >= requiredRunRate ? (
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
          ) : (
            <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-500" />
          )}
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between group">
            <span className="text-muted-foreground text-sm">Target</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-base tabular-nums group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
              {target}
            </span>
          </div>
          <div className="flex items-center justify-between group">
            <span className="text-muted-foreground text-sm">Achieved</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold font-mono text-base tabular-nums group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
              {achieved}
            </span>
          </div>
        </div>

        <div className="border-t border-border dark:border-stone-700/50 pt-3 space-y-2.5">
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">Today</span>
              {(() => {
                const percentage = (today / dailyrequired) * 100;

                let color = "text-red-500 dark:text-red-400"; // default
                if (percentage >= 90) color = "text-green-500 dark:text-green-400";
                else if (percentage >= 60) color = "text-yellow-500 dark:text-yellow-400";

                return <Dot className={`w-10 h-10 ${color}`} />;
              })()}
            </div>
            <span className="text-amber-600 dark:text-amber-400 font-semibold font-mono text-base tabular-nums group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
              {today}
            </span>
          </div>

          <div className="flex items-center justify-between group">
            <span className="text-muted-foreground text-sm">Yesterday</span>
            <span className="text-sky-600 dark:text-sky-400 font-semibold font-mono text-base tabular-nums group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
              {yesterday}
            </span>
          </div>
          <div className="flex items-center justify-between group">
            <span className="text-muted-foreground text-sm">Daily Required</span>
            <span className="text-violet-600 dark:text-violet-400 font-semibold font-mono text-base tabular-nums group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
              {dailyrequired}
            </span>
          </div>
          <div className="flex items-center justify-between group">
            <span className="text-muted-foreground text-sm">Current Average</span>
            <span className="text-pink-600 dark:text-pink-400 font-semibold font-mono text-base tabular-nums group-hover:text-pink-700 dark:group-hover:text-violet-300 transition-colors">
              {dailyAchieved}
            </span>
          </div>
          <div className="flex items-center justify-between group">
            <span className="text-muted-foreground text-sm">Required Rate</span>
            <span className="text-orange-600 dark:text-orange-400 font-semibold font-mono text-base tabular-nums group-hover:text-orange-700 dark:group-hover:text-violet-300 transition-colors">
              {requiredRunRate.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="border-t border-border dark:border-stone-700/50 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-medium">
              Success Rate
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-foreground font-bold text-2xl tabular-nums">
                {rate}
              </span>
              <span className="text-muted-foreground font-bold text-lg">%</span>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-muted dark:bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-500 dark:to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>

        {/* <div className="pt-2 text-xs text-muted-foreground font-mono">
          Total: {total} entries
        </div> */}
      </div>
    </Card>
  );
}