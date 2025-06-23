"use client";

import axios from "axios";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useState } from "react";

import { useAuthStore } from "@/AuthStore";
import { UserInterface } from "@/util/type";
import { employeeRoles } from "@/models/employee";

import { columns } from "./columns";
import { DataTable } from "./data-table";

export default function TablePage() {
  const { token } = useAuthStore();

  const [data, setData] = useState<UserInterface[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [queryType, setQueryType] = useState("email");
  const [role, setRole] = useState<(typeof employeeRoles)[number] | "">("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalUser, setTotalUser] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(
    debounce(
      async (search: string, queryType: string, page: number, role: string) => {
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
          // console.log("all employees: ", response.data.allEmployees);
          setData(response.data.allEmployees);
          setTotalUser(response.data.totalEmployee);
          setTotalPages(Math.ceil(response.data.totalEmployee / 10));
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
    fetchData(search, queryType, page, role);
  }, [search, role, page, queryType, fetchData]);

  return (
    <div className="">
      <DataTable
        data={data}
        columns={columns}
        setPage={setPage}
        setSearch={setSearch}
        setQueryType={setQueryType}
        setRole={setRole}
        search={search}
        currentPage={page}
        totalPages={totalPages}
        queryType={queryType}
        totalUser={totalUser}
        loading={loading}
      />
    </div>
  );
}
