import {
  getNewOwnersCount,
  getUnregisteredOwners,
  getVisitsToday,
  getWeeksVisit,
  OwnersCount,
} from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface UnregisteredOwnersInterface {
  ownerName: string;
  ownerPhone: string;
  city: string;
}

interface NewOwnerItem {
  ownerPhone: string;
  ownerName: string;
  location: string;
  createdAt?: string;
}

interface CityData {
  city: string;
  registeredCount: number;
  unregisteredCount: number;
  unregisteredWithImages: number;
  unregisteredWithReferenceLink: number;
  unregisteredWithBoth: number;
  unregisteredWithNone: number;
}

interface TotalsData {
  totalRegistered: number;
  totalUnregistered: number;
  totalUnregisteredWithImages: number;
  totalUnregisteredWithReferenceLink: number;
  totalUnregisteredWithBoth: number;
  totalUnregisteredWithNone: number;
}

export interface RegistrationData {
  byCity: CityData[];
  totals: TotalsData[];
}

const emptyOwnersCount: RegistrationData = {
  byCity: [],
  totals: [
    {
      totalRegistered: 0,
      totalUnregistered: 0,
      totalUnregisteredWithImages: 0,
      totalUnregisteredWithReferenceLink: 0,
      totalUnregisteredWithBoth: 0,
      totalUnregisteredWithNone: 0,
    },
  ],
};

const useWeeksVisit = () => {
  const [visitsFilters, setVisitsFilters] = useState<{ days?: string }>({
    days: "Today",
  });
  const [visitsTodayFilters, setVisitsTodayFilters] = useState<{ days?: string }>({
    days: "Today",
  });
  const [unregisteredFilters, setUnregisteredFilters] = useState<{
    days?: string;
    location?: string;
  }>({ days: "Today", location: "All" });

  const visitsQuery = useQuery({
    queryKey: ["weeksVisit", "series", visitsFilters.days ?? "Today"],
    queryFn: async () => {
      const response = await getWeeksVisit({ days: visitsFilters.days });
      return response.visits;
    },
  });

  const visitsTodayQuery = useQuery({
    queryKey: ["weeksVisit", "today", visitsTodayFilters.days ?? "Today"],
    queryFn: async () => {
      const response = await getVisitsToday({ days: visitsTodayFilters.days });
      return response.count;
    },
  });

  const unregisteredQuery = useQuery({
    queryKey: ["weeksVisit", "owners", unregisteredFilters],
    queryFn: async () => {
      const [response, ownersCount, responseCount] = await Promise.all([
        getUnregisteredOwners(),
        getNewOwnersCount({
          days: unregisteredFilters.days,
          location: unregisteredFilters.location,
        }),
        OwnersCount(),
      ]);
      return {
        unregisteredOwners: (response.unregisteredOwners ||
          []) as UnregisteredOwnersInterface[],
        newOwnersCount: (ownersCount.newOwnersCount ?? []) as NewOwnerItem[],
        ownersCount: responseCount as RegistrationData,
      };
    },
  });

  const loading =
    visitsQuery.isLoading ||
    visitsTodayQuery.isLoading ||
    unregisteredQuery.isLoading;
  const isError =
    visitsQuery.isError ||
    visitsTodayQuery.isError ||
    unregisteredQuery.isError;
  const error =
    (visitsQuery.error instanceof Error ? visitsQuery.error.message : "") ||
    (visitsTodayQuery.error instanceof Error ? visitsTodayQuery.error.message : "") ||
    (unregisteredQuery.error instanceof Error ? unregisteredQuery.error.message : "");

  const fetchVisits = async ({ days }: { days?: string }) => {
    setVisitsFilters((prev) => ({ ...prev, days }));
  };

  const fetchVisitsToday = async ({ days }: { days?: string }) => {
    setVisitsTodayFilters((prev) => ({ ...prev, days }));
  };

  const fetchUnregisteredVisits = async ({
    days,
    location,
  }: {
    days?: string;
    location?: string;
  }) => {
    setUnregisteredFilters((prev) => ({
      ...prev,
      ...(days !== undefined ? { days } : {}),
      ...(location !== undefined ? { location } : {}),
    }));
  };

  return {
    loading,
    setloading: () => undefined,
    isError,
    error,
    visits: visitsQuery.data ?? [],
    fetchVisits,
    visitsToday: visitsTodayQuery.data ?? [],
    fetchVisitsToday,
    unregisteredOwners: unregisteredQuery.data?.unregisteredOwners ?? [],
    fetchUnregisteredVisits,
    ownersCount: unregisteredQuery.data?.ownersCount ?? emptyOwnersCount,
    newOwnersCount: unregisteredQuery.data?.newOwnersCount ?? [],
  };
};

export default useWeeksVisit;
