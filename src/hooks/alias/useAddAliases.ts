import { AliasInterface } from "@/util/type";
import axios from "@/util/axios";
import { useState } from "react";

export const useAddAliases = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState<AliasInterface | null>(null);

  const addAlias = async (doc: AliasInterface) => {
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await axios.post("/api/alias/createAlias", doc);
      const createdAlias = (response.data?.alias ?? null) as AliasInterface | null;
      setData(createdAlias);
      setSuccess(true);
      return createdAlias;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create alias";
      setError(message);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { addAlias, data, isPending, error, success };
};
