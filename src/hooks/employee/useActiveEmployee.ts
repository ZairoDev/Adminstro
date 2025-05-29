import axios from "axios";
import { useState } from "react";

import { EmployeeInterface } from "@/util/type";
import { employeeRoles } from "@/models/employee";

interface FilterParams {
  isActive?: boolean;
  role?: (typeof employeeRoles)[number];
}

export const useActiveEmployees = () => {
  const [employees, setEmployees] = useState<EmployeeInterface[]>([]);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getAllEmployees = async (filters: FilterParams = {}) => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/employee/getActiveEmployees", filters);
      setEmployees(response.data.activeEmployees);
    } catch (err) {
      console.log("error in getting aliases: ", err);
      setIsError(true);
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = (filters: FilterParams = {}) => getAllEmployees(filters);

  return {
    employees,
    isLoading,
    isError,
    error,
    setIsLoading,
    refetch,
  };
};
