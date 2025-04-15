import axios from "axios";
import { useEffect, useState } from "react";

import { AliasInterface } from "@/util/type";

export const useFetchAliases = () => {
  const [aliases, setAliases] = useState<AliasInterface[]>([]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const getAllAliases = async () => {
      setIsPending(true);
      try {
        console.log("getting aliases");
        const response = await axios.get("/api/alias/getAllAliases");
        console.log("response of aliases: ", response);
        setAliases(response.data.aliases);
      } catch (err) {
        console.log("error in getting aliases: ", err);
        setError(err as string);
      } finally {
        setIsPending(false);
      }
    };

    getAllAliases();
  }, []);

  return { aliases, setAliases, error, isPending };
};
