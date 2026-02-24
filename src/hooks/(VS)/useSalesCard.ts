// "use client";

import {
  getSalesCardDetails,
  getGoodVisitsCount,
  getNewOwnersCount,
  getUnregisteredOwners,
  getVisitsToday,
  getWeeksVisit,
  OwnersCount,
} from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react"

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

interface SalesCardData {
  todayCount: number;
  yesterdayCount: number;
  difference: number;
  percentageChange: number;
  leads: any[];
}

const SalesCard = () => {
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  const [salesCardData, setSalesCardData] = useState<SalesCardData | null>(
    null
  );


  const fetchSalesCardData = async () => {
    setLoading(true);
    try {
      // Fetch leads created within last 7 days (with today vs yesterday comparison)
      const salesData = await getSalesCardDetails({ days: "" });
      setSalesCardData(salesData);
      setLoading(false);
    } catch (err: any) {
      setIsError(true);
      setError(err.message || "Something went wrong while fetching data");
      setLoading(false);
    }
  };

  useEffect(() => {
   fetchSalesCardData();
  }, []);

  return {
    loading,
    setLoading,
    isError,
    error,
    salesCardData, // contains todayCount, yesterdayCount, etc.
  };
};

export default SalesCard;
