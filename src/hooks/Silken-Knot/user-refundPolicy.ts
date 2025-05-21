import { useState } from "react";

export const useRefundPolicy = () => {
  const [refundPolicy, setRefundPolicy] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRefundPolicy = async () => {
    try {
      setIsLoading(true);
    } catch (error) {
      setError(error as string);
      setIsLoading(false);
    }
  };

  return { refundPolicy, isLoading, error, fetchRefundPolicy };
};
