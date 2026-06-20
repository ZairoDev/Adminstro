import { useQuery } from "@tanstack/react-query";

export interface CelebrationPerson {
  employeeId: string;
  firstName: string;
  fullName: string;
  eventType: "birthday" | "anniversary";
  years?: number;
}

export interface CelebrationsData {
  birthdays: CelebrationPerson[];
  anniversaries: CelebrationPerson[];
  hasEvents: boolean;
  totalCount: number;
}

const emptyCelebrations: CelebrationsData = {
  birthdays: [],
  anniversaries: [],
  hasEvents: false,
  totalCount: 0,
};

async function fetchCelebrations(): Promise<CelebrationsData> {
  const response = await fetch("/api/celebrations/today");
  if (!response.ok) {
    throw new Error("Failed to fetch celebrations");
  }
  return response.json();
}

export function useCelebrations(enabled: boolean) {
  return useQuery({
    queryKey: ["celebrations", "today"],
    queryFn: fetchCelebrations,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export { emptyCelebrations };
