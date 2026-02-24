import { getListingCounts } from "@/actions/(VS)/queryActions";
import { set } from "mongoose";
import { useEffect, useState } from "react";

const ListingCounts = ()=>{
  const [loading,setLoading] = useState(false);
  const [isError,setIsError] = useState(false);
  const [error,setError] = useState("");
  const [totalListings, setTotalListings] = useState<
    { date: string; total: number; shortTerm: number; longTerm: number }[]
  >([]);
  const [activeListings,setActiveListings] = useState(0);
  const [inactiveListings,setInactiveListings] = useState(0);

  const fetchListingCounts = async ({ days }: { days?: string }) => {
    try {
      setLoading(true);
      setIsError(false);
      setError("");
      const response = await getListingCounts({days});
      const transformedResponse = response.map(
        ({ date, total, shortTerm, longTerm }) => ({
          date,
          total: total ?? 0, // This will assign 0 if total is undefined or null
          shortTerm,
          longTerm,
        })
      );
      setTotalListings(transformedResponse);
      // listing counts transformed
      // setTotalListings(response.totalListings);
      // setActiveListings(response.activeListings);
      // setInactiveListings(response.inactiveListings);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(()=>{
    fetchListingCounts({ days: "this month" });
  },[])

  return {
    loading,
    setLoading,
    isError,
    setIsError,
    error,
    setError,
    totalListings,
    setTotalListings,
    activeListings,
    setActiveListings,
    inactiveListings,
    setInactiveListings,
    fetchListingCounts,
  };
}
export default ListingCounts;