"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/util/axios";

interface AreaFilterTarget {
  _id?: string;
  city?: string;
  areas?: string[];
  location?: string;
  area?: string;
  target?: number;
  [key: string]: unknown;
}

async function fetchAreaFilterTargets(): Promise<AreaFilterTarget[]> {
  const res = await axios.get<{ data: AreaFilterTarget[] }>(
    "/api/addons/target/getAreaFilterTarget",
  );
  return res.data.data ?? [];
}

export function useAreaFilterTargets(enabled = true) {
  return useQuery({
    queryKey: ["area-filter-targets"],
    queryFn: fetchAreaFilterTargets,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
