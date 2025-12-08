"use client";

import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";

interface LoggedInEmployee {
  _id: string;
  name: string;
  email: string;
  role: string;
  profilePic?: string;
  lastLogin: string;
  allotedArea?: string[];
  warningsCount?: number;
  pipsCount?: number;
  appreciationsCount?: number;
}

interface UseLoggedInEmployeesReturn {
  employees: LoggedInEmployee[];
  count: number;
  isLoading: boolean;
  isError: boolean;
  error: string;
  refetch: () => Promise<void>;
}

export const useLoggedInEmployees = (): UseLoggedInEmployeesReturn => {
  const [employees, setEmployees] = useState<LoggedInEmployee[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  const { socket, isConnected } = useSocket();

  const fetchLoggedInEmployees = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError("");

    try {
      const response = await axios.get("/api/employee/getLoggedInEmployees");
      if (response.data.success) {
        setEmployees(response.data.employees);
        setCount(response.data.count);
      }
    } catch (err: any) {
      console.error("Error fetching logged-in employees:", err);
      setIsError(true);
      setError(err.message || "Failed to fetch logged-in employees");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLoggedInEmployees();
  }, [fetchLoggedInEmployees]);

  // Listen for real-time login/logout events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleEmployeeLogin = (employee: LoggedInEmployee) => {
      setEmployees((prev) => {
        // Check if employee already exists
        const exists = prev.some((e) => e._id === employee._id);
        if (exists) {
          // Update existing employee's lastLogin
          return prev.map((e) =>
            e._id === employee._id ? { ...e, lastLogin: employee.lastLogin } : e
          );
        }
        // Add new employee to the list
        return [employee, ...prev];
      });
      setCount((prev) => prev + 1);
    };

    const handleEmployeeLogout = (data: { _id: string; email: string }) => {
      setEmployees((prev) => prev.filter((e) => e._id !== data._id));
      setCount((prev) => Math.max(0, prev - 1));
    };

    socket.on("employee-login", handleEmployeeLogin);
    socket.on("employee-logout", handleEmployeeLogout);

    return () => {
      socket.off("employee-login", handleEmployeeLogin);
      socket.off("employee-logout", handleEmployeeLogout);
    };
  }, [socket, isConnected]);

  return {
    employees,
    count,
    isLoading,
    isError,
    error,
    refetch: fetchLoggedInEmployees,
  };
};
