import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

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

  return (
    <Card
      className={`
        relative overflow-hidden
        bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950
        border border-stone-700/50
        shadow-2xl shadow-stone-950/50
        backdrop-blur-sm
        transition-all duration-300
        hover:shadow-stone-900/80
        hover:border-stone-600/50
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
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-stone-800/20 to-transparent rounded-bl-full" />

      <div className="relative p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl text-stone-100 tracking-tight">
            {title}
          </h3>
          <TrendingUp className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between group">
            <span className="text-stone-400 text-sm">Target</span>
            <span className="text-emerald-400 font-semibold font-mono text-base tabular-nums group-hover:text-emerald-300 transition-colors">
              {target}
            </span>
          </div>
          <div className="flex items-center justify-between group">
            <span className="text-stone-400 text-sm">Achieved</span>
            <span className="text-rose-400 font-semibold font-mono text-base tabular-nums group-hover:text-rose-300 transition-colors">
              {achieved}
            </span>
          </div>
        </div>

        <div className="border-t border-stone-700/50 pt-3 space-y-2.5">
          <div className="flex items-center justify-between group">
            <span className="text-stone-400 text-sm">Today</span>
            <span className="text-amber-400 font-semibold font-mono text-base tabular-nums group-hover:text-amber-300 transition-colors">
              {today}
            </span>
          </div>
          <div className="flex items-center justify-between group">
            <span className="text-stone-400 text-sm">Yesterday</span>
            <span className="text-sky-400 font-semibold font-mono text-base tabular-nums group-hover:text-sky-300 transition-colors">
              {yesterday}
            </span>
          </div>
          <div className="flex items-center justify-between group">
            <span className="text-stone-400 text-sm">Daily Required</span>
            <span className="text-violet-400 font-semibold font-mono text-base tabular-nums group-hover:text-violet-300 transition-colors">
              {dailyrequired}
            </span>
          </div>
          <div className="flex items-center justify-between group">
            <span className="text-stone-400 text-sm">Current Average</span>
            <span className="text-violet-400 font-semibold font-mono text-base tabular-nums group-hover:text-violet-300 transition-colors">
              {dailyAchieved}
            </span>
          </div>
        </div>

        <div className="border-t border-stone-700/50 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-stone-400 text-sm font-medium">Success Rate</span>
            <div className="flex items-baseline gap-1">
              <span className="text-stone-100 font-bold text-2xl tabular-nums">
                {rate}
              </span>
              <span className="text-stone-400 font-bold text-lg">%</span>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>

        {/* <div className="pt-2 text-xs text-stone-500 font-mono">
          Total: {total} entries
        </div> */}
      </div>
    </Card>
  );
}
