"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import debounce from "lodash.debounce";
import axios from "@/util/axios";
import { UserInterface } from "@/util/type";
import Heading from "@/components/Heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListingQueuePanel } from "@/components/owner-management/ListingQueuePanel";
import { useAuthStore } from "@/AuthStore";

export default function ManageUserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuthStore();

  const tabParam = searchParams?.get("tab");
  const searchParam = searchParams?.get("search") ?? "";

  const [activeTab, setActiveTab] = useState(
    tabParam === "listing-queue" ? "listing-queue" : "all",
  );
  const [data, setData] = useState<UserInterface[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParam);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const role = String(token?.role ?? "");
  const canAccessListingQueue = role === "Advert" || role === "SuperAdmin";

  useEffect(() => {
    setActiveTab(tabParam === "listing-queue" ? "listing-queue" : "all");
  }, [tabParam]);

  useEffect(() => {
    if (searchParam) setSearch(searchParam);
  }, [searchParam]);

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
    } catch (err: unknown) {
      const e = err as { name?: string };
      if (e.name !== "CanceledError") {
        console.error(err);
        setData([]);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () =>
      debounce((s: string) => {
        setPage(1);
        fetchUsers(s, 1);
      }, 300),
    [fetchUsers],
  );

  useEffect(() => {
    if (activeTab !== "all") return;
    fetchUsers(search, page);
  }, [page, activeTab]);

  useEffect(() => {
    if (activeTab !== "all") return;
    if (search !== "") debouncedSearch(search);
    else fetchUsers("", page);
    return () => debouncedSearch.cancel();
  }, [search, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value === "listing-queue") {
      params.set("tab", "listing-queue");
    } else {
      params.delete("tab");
    }
    const qs = params.toString();
    router.replace(qs ? `/dashboard/user?${qs}` : "/dashboard/user");
  };

  return (
    <div className="space-y-6">
      <Heading
        heading="Manage User"
        subheading="Manage owner accounts. Short-term commission listings are handled in the Short-term listings tab."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All users</TabsTrigger>
          {canAccessListingQueue && (
            <TabsTrigger value="listing-queue">Short-term listings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="mt-4">
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
        </TabsContent>

        {canAccessListingQueue && (
          <TabsContent value="listing-queue" className="mt-4">
            <ListingQueuePanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
