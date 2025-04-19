"use client";

import { useEffect, useState } from "react";

import { useFetchOffers } from "@/hooks/offers/useFetchOffers";
import { OfferTable } from "../components/offer-table";

const AllOffers = () => {
  const { offers, getAllOffers, totalPages, isPending } = useFetchOffers();
  const [page, setPage] = useState(1);

  useEffect(() => {
    getAllOffers("Send Offer", page);
  }, [page]);

  return (
    <div>
      All Offers
      {isPending ? (
        <p>Loading...</p>
      ) : (
        <OfferTable
          offers={offers}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};
export default AllOffers;
