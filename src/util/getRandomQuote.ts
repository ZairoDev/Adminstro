import { getGreetingContext } from "./getGreetingContext";
import { generalQuotes } from "./quotes/general";
import { motivationQuotes } from "./quotes/motivation";
import { salesQuotes } from "./quotes/sales";
import { funQuotes } from "./quotes/fun";
import { hinglishQuotes } from "./quotes/hinglish";
import { mondayQuotes } from "./quotes/monday";
import { monthEndQuotes } from "./quotes/monthEnd";
import { festivalQuotes } from "./quotes/festival";

type QuoteFunction = (name: string) => string;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomQuote(name: string): string {
  const context = getGreetingContext();

  // Priority order: Festivals > Month End > Monday > General Pool
  if (context.festival) {
    const festivalKey = context.festival as keyof typeof festivalQuotes;
    if (festivalQuotes[festivalKey]) {
      return pickRandom(festivalQuotes[festivalKey])(name);
    }
  }

  if (context.isMonthEnd) {
    return pickRandom(monthEndQuotes)(name);
  }

  if (context.isMonday) {
    return pickRandom(mondayQuotes)(name);
  }

  // Build general pool from all quote categories
  const pool: QuoteFunction[] = [
    ...generalQuotes,
    ...motivationQuotes,
    ...salesQuotes,
    ...funQuotes,
    ...hinglishQuotes,
  ];

  return pickRandom(pool)(name);
}
