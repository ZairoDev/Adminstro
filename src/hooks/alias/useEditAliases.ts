import axios from "@/util/axios";
import { useState } from "react";

import { AliasInterface } from "@/util/type";

export const useEditAliases = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState<AliasInterface | null>(null);

  const editAlias = async (doc: AliasInterface, lookupAliasEmail?: string) => {
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await axios.patch("/api/alias/editAlias", {
        aliasEmail: lookupAliasEmail ?? doc.aliasEmail,
        body: doc,
      });
      const updatedAlias = (response.data?.alias ?? null) as AliasInterface | null;
      setData(updatedAlias);
      setSuccess(true);
      return updatedAlias;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to edit alias";
      setError(message);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { editAlias, data, isPending, error, success };
};
