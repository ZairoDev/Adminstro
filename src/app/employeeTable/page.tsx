"use client";

import { useCallback, useEffect, useState } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import debounce from "lodash.debounce";
import axios from "axios";
import { UserInterface } from "@/util/type";
import { useAuthStore } from "@/AuthStore";

export default function TablePage() {
  const { token } = useAuthStore();

  const [data, setData] = useState<UserInterface[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [queryType, setQueryType] = useState("email");
  const [totalPages, setTotalPages] = useState(1);
  const [totalUser, setTotalUser] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(
    debounce(async (search: string, queryType: string, page: number) => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/employee/getAllEmployee`, {
          params: {
            currentPage: page,
            queryType: queryType,
            userInput: search,
            role: token?.role,
          },
        });
        setData(response.data.allEmployees);
        setTotalUser(response.data.totalEmployee);
        setTotalPages(Math.ceil(response.data.totalEmployee / 10));
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }, 1000),
    []
  );

  useEffect(() => {
    fetchData(search, queryType, page);
  }, [search, page, queryType, fetchData]);

  return (
    <div className="">
      <DataTable
        data={data}
        columns={columns}
        setPage={setPage}
        setSearch={setSearch}
        setQueryType={setQueryType}
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
