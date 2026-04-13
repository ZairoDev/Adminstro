import { AliasInterface } from "@/util/type";
import axios from "@/util/axios";
import { useState } from "react";

export const useDeleteAliases = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState<{ message?: string } | null>(null);

  const deleteAlias = async (aliasEmail: string) => {
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await axios.delete(`/api/alias/deleteAlias?aliasEmail=${aliasEmail}`);
      setData(response.data);
      setSuccess(true);
      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete alias";
      setError(message);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { deleteAlias, data, isPending, error, success };
};
