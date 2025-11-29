"use client";
import { TrendingDown, TrendingUp, Target, Calendar, Zap, Activity } from "lucide-react";
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

export function VisitStatsCard({
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
  const requiredRunRate = useMemo(() => {
    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();
    
    // Get last day of current month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Calculate remaining working days (excluding Sundays)
    let remainingDays = 0;
    
    // Start from tomorrow (since today's work might not be complete)
    for (let day = currentDate + 1; day <= lastDayOfMonth; day++) {
      const checkDate = new Date(currentYear, currentMonth, day);
      // Count all days except Sundays (0 = Sunday)
      if (checkDate.getDay() !== 0) {
        remainingDays++;
      }
    }
    
    // Debug logging to help troubleshoot

    
    // If no remaining days or target already achieved
    if (remainingDays === 0) {
      // If it's the last working day, return what's needed today
      return Math.max(0, target - achieved);
    }
    
    // If target already achieved
    if (achieved >= target) {
      return 0;
    }
    
    // Calculate required daily rate
    const remainingTarget = target - achieved;
    const calculatedRate = remainingTarget / remainingDays;
    
    // Return the calculated rate, ensuring it's not negative
    return Math.max(0, calculatedRate);
  }, [target, achieved, title]);

  const todayPercentage = dailyrequired > 0 ? (today / dailyrequired) * 100 : 0;
  const isOnTrack = dailyAchieved >= requiredRunRate;

  const getDotColor = () => {
    if (todayPercentage >= 90) return "bg-emerald-500 dark:bg-emerald-400";
    if (todayPercentage >= 60) return "bg-amber-500 dark:bg-amber-400";
    return "bg-rose-500 dark:bg-rose-400";
  };

  // Additional helper to show progress percentage
  const progressPercentage = target > 0 ? (achieved / target) * 100 : 0;

  return (
    <div
      className={`
        relative overflow-hidden
        bg-card
        dark:bg-stone-800
        rounded-xl
        border border-border
        dark:border-slate-700/30
        shadow-lg
        dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        transition-all duration-500
        hover:shadow-xl
        dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)]
        hover:border-slate-400
        dark:hover:border-slate-600/50
        hover:-translate-y-1
        ${className}
      `}
      style={
        position
          ? {
              top: position.y + 20,
              left: position.x + 20,
              minWidth: "240px",
            }
          : { minWidth: "240px" }
      }
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent blur-2xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-radial from-purple-500/10 via-transparent to-transparent blur-2xl" />

      <div className="relative p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h3 className="font-bold text-lg text-foreground tracking-tight">
              {title}
            </h3>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnTrack ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'} animate-pulse`} />
              <span className={`text-[10px] font-medium ${isOnTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isOnTrack ? 'On Track' : 'Behind'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({progressPercentage.toFixed(1)}% complete)
              </span>
            </div>
          </div>
          <div className={`
            p-1.5 rounded-lg
            ${isOnTrack ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-rose-500/10 border border-rose-500/30'}
            transition-all duration-300
          `}>
            {isOnTrack ? (
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-muted/50 to-muted/80 dark:from-slate-800/50 dark:to-slate-900/50 p-3 rounded-lg border border-border dark:border-slate-700/30 backdrop-blur-sm">
          <div className="flex justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-green-600 dark:text-green-400" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Target</span>
            </div>
            <div className="text-base font-bold text-green-700 dark:text-green-300 tabular-nums">{target}</div>
          </div>

          <div className="flex justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-red-600 dark:text-red-400" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Done</span>
            </div>
            <div className="text-base font-bold text-red-700 dark:text-red-300 tabular-nums">
              {achieved} <span className="text-xs text-muted-foreground">({target - achieved} left)</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 dark:bg-slate-800/30 border border-border dark:border-slate-700/20 hover:bg-muted/50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
              <span className="text-xs font-medium text-foreground dark:text-slate-300">Today</span>
            </div>
            <span className="text-sm font-bold text-foreground tabular-nums">{today}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 dark:bg-slate-800/30 border border-border dark:border-slate-700/20 hover:bg-muted/50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-foreground dark:text-slate-300">Yesterday</span>
            </div>
            <span className="text-sm font-bold text-foreground tabular-nums">{yesterday}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 dark:bg-slate-800/30 border border-border dark:border-slate-700/20 hover:bg-muted/50 dark:hover:bg-slate-800/50 transition-colors">
            <span className="text-xs font-medium text-foreground dark:text-slate-300">Daily Required</span>
            <span className="text-sm font-bold text-foreground tabular-nums">{dailyrequired.toFixed(1)}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 dark:bg-slate-800/30 border border-border dark:border-slate-700/20 hover:bg-muted/50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-medium text-foreground dark:text-slate-300">Current Avg</span>
            </div>
            <span className="text-sm font-bold text-foreground tabular-nums">{dailyAchieved.toFixed(1)}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/30">
            <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Required Rate</span>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-200 tabular-nums">
              {requiredRunRate.toFixed(2)}
              {requiredRunRate === 0 && target > achieved && (
                <span className="text-[10px] ml-1 text-orange-500">
                  (check data)
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Success Rate</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-black bg-gradient-to-r from-green-600 to-green-700 dark:from-green-400 dark:to-green-500 bg-clip-text text-transparent tabular-nums">
                {rate.toFixed(1)}
              </span>
              <span className="text-base font-bold text-muted-foreground">%</span>
            </div>
          </div>

          <div className="relative h-2 bg-muted dark:bg-slate-800/50 rounded-full overflow-hidden border border-border dark:border-slate-700/30">
            <div className="absolute inset-0 bg-gradient-to-r from-muted-foreground/20 dark:from-slate-700/50 to-transparent" />
            <div
              className="absolute h-full bg-gradient-to-r from-green-600 to-green-700 dark:from-green-400 dark:to-green-500 rounded-full transition-all duration-700 ease-out shadow-lg shadow-green-500/30"
              style={{ width: `${Math.min(100, rate)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}