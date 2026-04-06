"use client";

import axios from "@/util/axios";
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Phone,
  MapPin,
  Mail,
  Building2,
  ChevronLeft,
  ChevronRight,
  Users as UsersIcon,
  Loader2,
} from "lucide-react";
import debounce from "lodash.debounce";
import Image from "next/image";
import { HolidaySeraOwnerJourneyBar } from "@/components/owner-journey/HolidaySeraOwnerJourneyBar";
import type { HolidaySeraGuestListItem } from "@/types/holidaySeraGuests";

const HolidaySeraGuests = () => {
  const [users, setUsers] = useState<HolidaySeraGuestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState("");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchUsers = useCallback(
    debounce(async (searchVal: string, pageVal: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get("/api/holidaysera/guests-list", {
          params: { page: pageVal, search: searchVal },
        });
        if (res.data.success) {
          setUsers(res.data.users || []);
          setTotalPages(res.data.totalPages);
          setTotalUsers(res.data.total || 0);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    }, 400),
    []
  );

  useEffect(() => {
    fetchUsers(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-300">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              HolidaySera Owners
            </h1>
            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <UsersIcon size={16} />
              {totalUsers} total guest{totalUsers !== 1 ? "s" : ""}
            </p>
          </div>
          {/* <Link
            href="/dashboard/createnewuser"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
          >
            <UserPlus size={18} />
            Add New Guest
          </Link> */}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500">{error}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
            <UsersIcon className="mx-auto h-14 w-14 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-1">
              No HolidaySera Owners found
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
              Owners from the HolidaySera app (holidayUsers, role Owner) appear here
            </p>
            {/* <Link
              href="/dashboard/createnewuser"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:opacity-95"
            >
              <UserPlus size={18} />
              Add Owner
            </Link> */}
          </div>
        ) : (
          <>
            {/* User cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="p-5">
                    <div className="mb-4 flex items-start gap-4">
                      {user.profilePic ? (
                        <Image
                          src={user.profilePic}
                          alt={user.name}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-full border-2 border-gray-200 object-cover dark:border-gray-700"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-lg font-semibold text-white">
                          {(user.name?.charAt(0) || "?").toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                          {user.name}
                        </h3>
                        <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {user.email ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Mail size={14} className="flex-shrink-0 text-gray-400" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      ) : null}
                      {user.phone ? (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 text-left text-sm text-gray-600 hover:underline dark:text-gray-300"
                          onClick={() => navigator.clipboard.writeText(String(user.phone))}
                          title="Click to copy"
                        >
                          <Phone size={14} className="flex-shrink-0 text-gray-400" />
                          {user.phone}
                        </button>
                      ) : null}
                      {user.address ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <MapPin size={14} className="flex-shrink-0 text-gray-400" />
                          <span className="truncate">{user.address}</span>
                        </div>
                      ) : null}
                    </div>

                    {(user.vsids?.length || user.vsids2?.length) ? (
                      <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Building2 size={14} />
                          <span>
                            {(user.vsids?.length || 0) + (user.vsids2?.length || 0)}{" "}
                            {(user.vsids?.length || 0) + (user.vsids2?.length || 0) === 1
                              ? "property"
                              : "properties"}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {user.isVerified ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Verified
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {user.ownerJourney?.holidaySera ? (
                    <div className="border-t border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950/50">
                      <HolidaySeraOwnerJourneyBar
                        currentStage={user.ownerJourney.holidaySera.stage}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pb-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HolidaySeraGuests;
