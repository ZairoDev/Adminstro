import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  getCountryWisePropertyCount,
  getPropertyCount,
} from "@/actions/(VS)/queryActions";

interface CountryRentalStats {
  country: string;
  "Short Term": number;
  "Long Term": number;
  total: number;
}

interface CountryWisePropertyCount {
  city: string;
  "Short Term": number;
  "Long Term": number;
}

const usePropertyCount = () => {
  const [countryFilter, setCountryFilter] = useState<string | null>(null);

  const mainQuery = useQuery({
    queryKey: ["propertyCount", null, null],
    queryFn: async () => {
      const response = await getPropertyCount();
      return {
        properties: response.propertyCount as CountryRentalStats[],
        totalProperties: response.totalPropertyCount as number,
      };
    },
  });

  const countryQuery = useQuery({
    queryKey: ["propertyCount", countryFilter, null],
    queryFn: async () => {
      const response = await getCountryWisePropertyCount({
        country: countryFilter!,
      });
      return {
        countryWiseProperties: response.countryWisePropertyCount as CountryWisePropertyCount[],
        countryWiseTotalProperties: response.totalPropertyCount as number,
      };
    },
    enabled: Boolean(countryFilter && countryFilter !== "All"),
  });

  const fetchCountryWiseProperties = ({ country }: { country: string }) => {
    setCountryFilter(country);
  };

  const isLoading = mainQuery.isLoading || countryQuery.isLoading;
  const isError = mainQuery.isError || countryQuery.isError;
  const error =
    (mainQuery.error instanceof Error ? mainQuery.error.message : "") ||
    (countryQuery.error instanceof Error ? countryQuery.error.message : "");

  return {
    properties: mainQuery.data?.properties,
    totalProperties: mainQuery.data?.totalProperties ?? 0,
    fetchCountryWiseProperties,
    countryWiseProperties: countryQuery.data?.countryWiseProperties ?? [],
    countryWiseTotalProperties: countryQuery.data?.countryWiseTotalProperties ?? 0,
    isLoading,
    isError,
    error,
    refetch: () => mainQuery.refetch(),
    reset: () => mainQuery.refetch(),
  };
};

export default usePropertyCount;
