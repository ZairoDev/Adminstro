"use client";

import axios from "@/util/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
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

interface LoggedInEmployeesResponse {
  success: boolean;
  employees: LoggedInEmployee[];
  count: number;
}

async function fetchLoggedInEmployees(): Promise<LoggedInEmployeesResponse> {
  const response = await axios.get<LoggedInEmployeesResponse>(
    "/api/employee/getLoggedInEmployees",
  );
  return response.data;
}

export const useLoggedInEmployees = () => {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["loggedInEmployees"],
    queryFn: fetchLoggedInEmployees,
    staleTime: 30 * 1000,
    select: (response) => ({
      employees: response.success ? response.employees : [],
      count: response.success ? response.count : 0,
    }),
  });

  const silentRefetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["loggedInEmployees"] });
  }, [queryClient]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleEmployeeLogin = () => {
      void silentRefetch();
    };

    const handleEmployeeLogout = (payload: { _id: string; email: string }) => {
      queryClient.setQueryData<LoggedInEmployeesResponse>(
        ["loggedInEmployees"],
        (prev) => {
          if (!prev?.success) return prev;
          const employees = prev.employees.filter((e) => e._id !== payload._id);
          return {
            ...prev,
            employees,
            count: Math.max(0, prev.count - 1),
          };
        },
      );
    };

    const handleEmployeeDataUpdate = () => {
      void silentRefetch();
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
  }, [socket, isConnected, silentRefetch, queryClient]);

  return {
    employees: data?.employees ?? [],
    count: data?.count ?? 0,
    isLoading,
    isError,
    error: error instanceof Error ? error.message : "",
    refetch: () => refetch(),
  };
};
