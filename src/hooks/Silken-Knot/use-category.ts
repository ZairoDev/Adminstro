import axios from "axios";
import { useEffect, useState } from "react";

import { CategoryType } from "@/util/type";

export const useCategory = () => {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/silkenknot/categories/getCategories");
      setCategories(response.data.data);
    } catch (error) {
      setError(error as string);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return { categories, isLoading, error, fetchCategories };
};
