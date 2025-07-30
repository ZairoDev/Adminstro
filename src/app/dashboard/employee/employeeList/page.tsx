"use client";

import axios from "axios";
import debounce from "lodash.debounce";
import { LucideLoader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAuthStore } from "@/AuthStore";
import { UserInterface } from "@/util/type";

import EmployeeListTable from "./employee-list-table";

export default function TablePage() {
  const { token } = useAuthStore();

  const [data, setData] = useState<UserInterface[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(
    debounce(
      async (
        search: string,
        queryType: string,
        page: number,
        role?: string
      ) => {
        setLoading(true);
        try {
          const response = await axios.get(`/api/employee/getAllEmployee`, {
            params: {
              currentPage: page,
              queryType: queryType,
              userInput: search,
              role: role ?? token?.role,
            },
          });
          setData(response.data.allEmployees);
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false);
        }
      },
      1000
    ),
    []
  );

  useEffect(() => {
    fetchData("", "email", 1, "");
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LucideLoader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="">
      {data && (
        <EmployeeListTable employees={data} role={token?.role ?? "HR"} />
      )}
    </div>
  );
}
