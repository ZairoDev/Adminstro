/** Classy minimal palette for personal reminders (light + dark). */

export const reminderTheme = {
  primary: {
    DEFAULT: "bg-indigo-600 hover:bg-indigo-700 text-white",
    soft: "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100",
    ring: "focus-visible:ring-indigo-500/40",
    border: "border-indigo-200/80 dark:border-indigo-800/60",
    muted: "text-indigo-600 dark:text-indigo-400",
  },
  surface: {
    page: "bg-[#f8f7f4] dark:bg-zinc-950",
    card: "bg-white dark:bg-zinc-900",
    cardBorder: "border-stone-200/90 dark:border-zinc-800",
    grid: "border-stone-200/80 dark:border-zinc-800",
    selectedCell: "bg-indigo-50/80 dark:bg-indigo-950/30",
    hoverCell: "hover:bg-stone-50 dark:hover:bg-zinc-900/80",
  },
  today: {
    circle: "bg-rose-500 text-white shadow-sm shadow-rose-500/25",
  },
  status: {
    scheduled:
      "bg-indigo-50 text-indigo-800 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800/50",
    overdue:
      "bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/50",
    sent: "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/50",
  },
} as const;

export type ReminderAccent = {
  chip: string;
  bar: string;
  text: string;
  icon: string;
};

/** Soft Apple Calendar–style event tints, rotated per reminder. */
export const REMINDER_ACCENTS: ReminderAccent[] = [
  {
    chip: "bg-violet-100/90 dark:bg-violet-950/50",
    bar: "bg-violet-400 dark:bg-violet-500",
    text: "text-violet-900 dark:text-violet-100",
    icon: "text-violet-600 dark:text-violet-400",
  },
  {
    chip: "bg-sky-100/90 dark:bg-sky-950/50",
    bar: "bg-sky-400 dark:bg-sky-500",
    text: "text-sky-900 dark:text-sky-100",
    icon: "text-sky-600 dark:text-sky-400",
  },
  {
    chip: "bg-teal-100/90 dark:bg-teal-950/50",
    bar: "bg-teal-400 dark:bg-teal-500",
    text: "text-teal-900 dark:text-teal-100",
    icon: "text-teal-600 dark:text-teal-400",
  },
  {
    chip: "bg-amber-100/90 dark:bg-amber-950/50",
    bar: "bg-amber-400 dark:bg-amber-500",
    text: "text-amber-900 dark:text-amber-100",
    icon: "text-amber-700 dark:text-amber-400",
  },
  {
    chip: "bg-rose-100/90 dark:bg-rose-950/50",
    bar: "bg-rose-400 dark:bg-rose-500",
    text: "text-rose-900 dark:text-rose-100",
    icon: "text-rose-600 dark:text-rose-400",
  },
];

export function getReminderAccent(id: string): ReminderAccent {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return REMINDER_ACCENTS[Math.abs(hash) % REMINDER_ACCENTS.length];
}
