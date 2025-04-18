"use client";

import { useEffect } from "react";

import { useFetchOffers } from "@/hooks/offers/useFetchOffers";
// import { OfferTable } from "../components/offer-table";

const AllOffers = () => {
  const { offers, getAllOffers, isPending } = useFetchOffers();

  useEffect(() => {
    getAllOffers("Send Offer");
  }, []);

  return (
    <div>
      All Offers
      {/* {isPending ? <p>Loading...</p> : <OfferTable />} */}
    </div>
  );
};
export default AllOffers;
