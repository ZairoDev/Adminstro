import { AliasInterface } from "@/util/type";
import axios from "axios";
import { useState } from "react";

export const useDeleteAliases = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState(null);

  const deleteAlias = async (aliasEmail: string) => {
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await axios.delete(
        `/api/alias/deleteAlias?aliasEmail=${aliasEmail}`
      );
      setData(response.data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return { deleteAlias, data, isPending, error, success };
};
