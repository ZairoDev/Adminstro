import axios from "axios";
import { useEffect, useState } from "react";

import { SalesOfferInterface } from "@/util/type";

export const useFetchOffers = () => {
  const [offers, setOffers] = useState<SalesOfferInterface[]>([]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const getAllOffers = async (leadStatus: string) => {
    setIsPending(true);
    try {
      const response = await axios.post("/api/sales-offer/fetchSalesOffer", {
        leadStatus,
      });
      setOffers(response.data.offers);
    } catch (err) {
      console.log("error in getting aliases: ", err);
      setError(err as string);
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {}, []);

  return { offers, setOffers, getAllOffers, error, isPending };
};
