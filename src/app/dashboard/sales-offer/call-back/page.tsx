"use client";

import { useEffect, useState } from "react";

import { useFetchOffers } from "@/hooks/offers/useFetchOffers";
import { OfferTable } from "../components/offer-table";
import { useOrgSelectionStore } from "../useOrgSelectionStore";

const AllOffers = () => {
  const { offers, getAllOffers, totalPages, isPending } = useFetchOffers();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const [page, setPage] = useState(1);

  useEffect(() => {
    void getAllOffers("Call Back", page, selectedOrg);
  }, [page, selectedOrg, getAllOffers]);
  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Call back</h1>
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
