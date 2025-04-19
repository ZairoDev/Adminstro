import axios from "axios";
import { useState } from "react";

import { SalesOfferInterface } from "@/util/type";
import { LeadStatus } from "@/app/dashboard/sales-offer/sales-offer-utils";

export const useFetchOffers = () => {
  const [offers, setOffers] = useState<SalesOfferInterface[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const getAllOffers = async (leadStatus: LeadStatus, page?: number) => {
    setIsPending(true);
    try {
      const response = await axios.post("/api/sales-offer/fetchSalesOffer", {
        leadStatus,
        page,
      });
      setOffers(response.data.offers);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.log("error in getting offers: ", err);
      setError(err as string);
    } finally {
      setIsPending(false);
    }
  };

  return { offers, setOffers, getAllOffers, totalPages, error, isPending };
};
