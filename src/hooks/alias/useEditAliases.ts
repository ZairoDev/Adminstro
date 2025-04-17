import axios from "axios";
import { useState } from "react";

import { AliasInterface } from "@/util/type";

export const useEditAliases = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState(null);

  const editAlias = async (doc: AliasInterface) => {
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await axios.patch("/api/alias/editAlias", {
        aliasEmail: doc.aliasEmail,
        body: doc,
      });
      setData(response.data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return { editAlias, data, isPending, error, success };
};
