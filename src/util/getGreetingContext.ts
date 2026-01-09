import { getTodayFestival } from "./festivals";

export interface GreetingContext {
  timeOfDay: "morning" | "afternoon" | "evening";
  isMonday: boolean;
  isMonthEnd: boolean;
  festival: string | null;
}

export function getGreetingContext(): GreetingContext {
  const now = new Date();
  const hour = now.getHours();

  const timeOfDay: GreetingContext["timeOfDay"] =
    hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const isMonday = now.getDay() === 1;

  // Check if we're within 3 days of month end
  const isMonthEnd = (() => {
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysUntilEnd = (lastDayOfMonth.getTime() - now.getTime()) / 86400000;
    return daysUntilEnd < 3;
  })();

  return {
    timeOfDay,
    isMonday,
    isMonthEnd,
    festival: getTodayFestival(),
  };
}
