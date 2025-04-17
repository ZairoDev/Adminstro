"use client";

import { useEffect } from "react";

import { useFetchOffers } from "@/hooks/offers/useFetchOffers";

import { OfferTable } from "../components/Offer-table";

const AllOffers = () => {
  const { offers, getAllOffers, isPending } = useFetchOffers();

  useEffect(() => {
    getAllOffers("Send Offer");
  }, []);

  return (
    <div>
      All Offers
      {isPending ? (
        <p>Loading...</p>
      ) : (
        // offers?.map((offer, index) => (
        //   <div key={index}>
        <OfferTable />
        // </div>
        // ))
      )}
    </div>
  );
};
export default AllOffers;
