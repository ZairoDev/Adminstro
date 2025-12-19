"use client";

import axios from "axios";
import { useState, useEffect, useCallback, useRef } from "react";
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
  const lastFetchRef = useRef<number>(0);

  const { socket, isConnected } = useSocket();

  const fetchLoggedInEmployees = useCallback(async (silent = false) => {
    // Prevent rapid refetches (minimum 2 seconds between fetches)
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) {
      return;
    }
    lastFetchRef.current = now;

    if (!silent) {
      setIsLoading(true);
    }
    setIsError(false);
    setError("");

    try {
      // Add cache-busting timestamp to prevent browser caching
      const timestamp = Date.now();
      const response = await axios.get(`/api/employee/getLoggedInEmployees?_t=${timestamp}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
      if (response.data.success) {
        setEmployees(response.data.employees);
        setCount(response.data.count);
      }
    } catch (err: any) {
      console.error("Error fetching logged-in employees:", err);
      setIsError(true);
      setError(err.message || "Failed to fetch logged-in employees");
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLoggedInEmployees();
  }, [fetchLoggedInEmployees]);

  // Refresh when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Refresh when user comes back to the tab
        fetchLoggedInEmployees(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchLoggedInEmployees]);

  // Refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchLoggedInEmployees(true);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchLoggedInEmployees]);

  // Listen for real-time login/logout events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleEmployeeLogin = () => {
      // When employee logs in, refetch to get accurate counts
      fetchLoggedInEmployees(true);
    };

    const handleEmployeeLogout = (data: { _id: string; email: string }) => {
      setEmployees((prev) => prev.filter((e) => e._id !== data._id));
      setCount((prev) => Math.max(0, prev - 1));
    };

    // Listen for employee data updates (warnings, PIPs, appreciations)
    const handleEmployeeDataUpdate = () => {
      // Refetch to get updated counts
      fetchLoggedInEmployees(true);
    };

    socket.on("employee-login", handleEmployeeLogin);
    socket.on("employee-logout", handleEmployeeLogout);
    socket.on("employee-data-update", handleEmployeeDataUpdate);
    socket.on("employee-warning-added", handleEmployeeDataUpdate);
    socket.on("employee-pip-added", handleEmployeeDataUpdate);
    socket.on("employee-appreciation-added", handleEmployeeDataUpdate);

    return () => {
      socket.off("employee-login", handleEmployeeLogin);
      socket.off("employee-logout", handleEmployeeLogout);
      socket.off("employee-data-update", handleEmployeeDataUpdate);
      socket.off("employee-warning-added", handleEmployeeDataUpdate);
      socket.off("employee-pip-added", handleEmployeeDataUpdate);
      socket.off("employee-appreciation-added", handleEmployeeDataUpdate);
    };
  }, [socket, isConnected, fetchLoggedInEmployees]);

  return {
    employees,
    count,
    isLoading,
    isError,
    error,
    refetch: () => fetchLoggedInEmployees(false),
  };
};
