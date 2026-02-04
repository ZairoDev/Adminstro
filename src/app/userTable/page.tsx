"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import debounce from "lodash.debounce";
import axios from "axios";
import { UserInterface } from "@/util/type";

export default function TablePage() {
  const [data, setData] = useState<UserInterface[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchUsers = useCallback(async (searchVal: string, pageNum: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const { data: res } = await axios.get("/api/user/getallusers", {
        params: { page: pageNum, search: searchVal },
        signal: controller.signal,
      });
      if (res.success) {
        setData(res.users ?? []);
        setTotalUsers(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
      }
    } catch (err: any) {
      if (err.name !== "CanceledError") {
        console.error(err);
        setData([]);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((s: string) => { setPage(1); fetchUsers(s, 1); }, 300),
    [fetchUsers]
  );

  useEffect(() => {
    fetchUsers(search, page);
  }, [page]);

  useEffect(() => {
    if (search !== "") debouncedSearch(search);
    else fetchUsers("", page);
    return () => debouncedSearch.cancel();
  }, [search]);

  return (
    <DataTable
      data={data}
      columns={columns(setData)}
      search={search}
      setSearch={setSearch}
      currentPage={page}
      setPage={setPage}
      totalPages={totalPages}
      totalUsers={totalUsers}
      loading={loading}
    />
  );
}
