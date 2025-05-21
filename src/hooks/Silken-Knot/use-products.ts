import axios from "axios";
import { useState } from "react";

import { ProductType } from "@/util/type";

type ProductUploadType = Omit<ProductType, "_id" | "createdAt" | "updatedAt">;

export const useProducts = () => {
  const [products, setProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/silkenknot/products/getProducts");
      setProducts(response.data.data);
      setIsLoading(false);
    } catch (error) {
      setError(error as string);
      setIsLoading(false);
    }
  };

  const addProduct = async (product: ProductUploadType) => {
    try {
      setIsLoading(true);
      const response = await axios.post("/api/silkenknot/products/addProduct", product);
      setProducts(response.data.data);
      setIsLoading(false);
    } catch (error) {
      setError(error as string);
    } finally {
      setIsLoading(false);
    }
  };

  return { products, isLoading, error, fetchProducts, addProduct };
};
