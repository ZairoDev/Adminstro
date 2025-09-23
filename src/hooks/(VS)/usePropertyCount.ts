import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

import {
  getCountryWisePropertyCount,
  getPropertyCount,
} from "@/actions/(VS)/queryActions";

interface PropertyCountInterface {
  _id: string;
  count: number;
}
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
  const [properties, setProperties] = useState<CountryRentalStats[]>();
  const [totalProperties, setTotalProperties] = useState(0);
  const [countryWiseProperties, setCountryWiseProperties] = useState<
    CountryWisePropertyCount[]
  >([]);
  const [countryWiseTotalProperties, setCountryWiseTotalProperties] =
    useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  // Fetch Leads
  const fetchLeads = async () => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response = await getPropertyCount();
      setProperties(response.propertyCount);
      setTotalProperties(response.totalPropertyCount);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCountryWiseProperties = async ({
    country,
  }: {
    country: string;
  }) => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response = await getCountryWisePropertyCount({ country });
      setCountryWiseProperties(response.countryWisePropertyCount);
      setCountryWiseTotalProperties(response.totalPropertyCount);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const refetch = () => fetchLeads();
  const reset = () => fetchLeads();

  return {
    properties,
    totalProperties,
    fetchCountryWiseProperties,
    countryWiseProperties,
    countryWiseTotalProperties,
    isLoading,
    isError,
    error,
    refetch,
    reset,
  };
};

export default usePropertyCount;
