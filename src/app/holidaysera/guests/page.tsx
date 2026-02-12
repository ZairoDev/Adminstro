"use client";

import axios from "axios";
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
  UserPlus,
} from "lucide-react";
import debounce from "lodash.debounce";
import Link from "next/link";
import Image from "next/image";
import { UserInterface } from "@/util/type";

const HolidaySeraGuests = () => {
  const [users, setUsers] = useState<UserInterface[]>([]);
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
        const res = await axios.get("/api/user/getallusers", {
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
              HolidaySera Guests
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
              No HolidaySera guests found
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
              Users with origin &quot;holidaysera&quot; will appear here
            </p>
            {/* <Link
              href="/dashboard/createnewuser"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:opacity-95"
            >
              <UserPlus size={18} />
              Add Guest
            </Link> */}
          </div>
        ) : (
          <>
            {/* User cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
              {users.map((user) => (
                <Link
                  key={user._id}
                  href={`/dashboard/userdetails/${user._id}`}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-all duration-200 group"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {user.profilePic ? (
                      <Image
                        src={user.profilePic}
                        alt={user.name}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-semibold text-lg">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {user.name}
                      </h3>
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {user.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Mail size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Phone size={14} className="text-gray-400 flex-shrink-0" />
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            navigator.clipboard.writeText(String(user.phone));
                          }}
                          title="Click to copy"
                        >
                          {user.phone}
                        </span>
                      </div>
                    )}
                    {user.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{user.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Property count */}
                  {(user.vsids?.length || user.vsids2?.length) ? (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Building2 size={14} />
                        <span>
                          {(user.vsids?.length || 0) + (user.vsids2?.length || 0)}{" "}
                          {((user.vsids?.length || 0) + (user.vsids2?.length || 0)) === 1
                            ? "property"
                            : "properties"}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Status badges */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {user.isVerified && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Verified
                      </span>
                    )}
                    {user.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Active
                      </span>
                    )}
                  </div>
                </Link>
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
