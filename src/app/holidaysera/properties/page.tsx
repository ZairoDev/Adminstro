"use client";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Edit, Loader2, Search } from "lucide-react";
import { PropertiesDataType } from "@/util/type";
import debounce from "lodash.debounce";
import Link from "next/link";
import Image from "next/image";
import { ToggleButton } from "@/components/toggle_button";
import { useAuthStore } from "@/AuthStore";
import { toast } from "sonner";

type ApprovalStatus = "pending" | "approved" | "rejected";
type PropertyItem = PropertiesDataType & {
  approvalStatus?: ApprovalStatus;
  effectiveApprovalStatus?: ApprovalStatus;
  origin?: string;
};

const HolidaySeraPropertyPage: React.FC = () => {
  const [property, setProperty] = useState<PropertyItem[]>();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("email");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showHolidaySeraOnly, setShowHolidaySeraOnly] = useState<boolean>(false);
  const [approvingPropertyId, setApprovingPropertyId] = useState<string | null>(
    null
  );
  const [bulkApproving, setBulkApproving] = useState<boolean>(false);
  const limit: number = 12;
  const role = useAuthStore((state) => state.token?.role);
  const canApprove = role === "SuperAdmin" || role === "HAdmin";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchProperties = useCallback(
    debounce(async (searchTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/property/getAllProperty?page=${page}&limit=${limit}&searchTerm=${searchTerm}&searchType=${searchType}`
        );
        const data = await response.json();

        if (response.ok) {
          setProperties(data.data);
          setProperty(data.data);
          setTotalPages(data.totalPages);
        } else {
          throw new Error("Failed to fetch properties");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 500),
    [page, searchType, limit]
  );

  useEffect(() => {
    fetchProperties(searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, page]);

  const getApprovalStatus = useCallback((item: PropertyItem) => {
    return item.approvalStatus ?? item.effectiveApprovalStatus ?? "approved";
  }, []);

  const requiresApproval = useCallback((item: PropertyItem) => {
    const source = (item.origin ?? "").toLowerCase().trim();
    return source.includes("holidaysera") || source.includes("housingsaga");
  }, []);

  const filteredProperties = useMemo(() => {
    if (!property) return [];

    if (showHolidaySeraOnly) {
      return property.filter((prop) => {
        const source = (prop.origin ?? "").toLowerCase().trim();
        return source.includes("holidaysera");
      });
    }

    return property;
  }, [property, showHolidaySeraOnly]);

  const pendingIds = useMemo(() => {
    return filteredProperties
      .filter(
        (item) => requiresApproval(item) && getApprovalStatus(item) === "pending"
      )
      .map((item) => item._id);
  }, [filteredProperties, getApprovalStatus, requiresApproval]);

  const updateLocalApprovalStatus = useCallback(
    (ids: string[]) => {
      setProperty((prev) =>
        prev?.map((item) =>
          ids.includes(item._id)
            ? {
                ...item,
                approvalStatus: "approved",
                effectiveApprovalStatus: "approved",
              }
            : item
        )
      );
      setProperties((prev) =>
        prev.map((item) =>
          ids.includes(item._id)
            ? {
                ...item,
                approvalStatus: "approved",
                effectiveApprovalStatus: "approved",
              }
            : item
        )
      );
    },
    []
  );

  const approveSingle = useCallback(
    async (propertyId: string, commonId?: string) => {
      const rollback = property?.map((item) => ({ ...item })) ?? [];
      setApprovingPropertyId(propertyId);
      updateLocalApprovalStatus([propertyId]);
      try {
        const response = await fetch("/api/holidaysera/properties/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId, commonId }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || "Failed to approve property");
        }
        toast.success("Property approved");
      } catch (error: any) {
        setProperty(rollback);
        setProperties(rollback);
        toast.error(error.message || "Approval failed");
      } finally {
        setApprovingPropertyId(null);
      }
    },
    [property, updateLocalApprovalStatus]
  );

  const approveAllPending = useCallback(async () => {
    if (pendingIds.length === 0) return;
    const rollback = property?.map((item) => ({ ...item })) ?? [];
    setBulkApproving(true);
    updateLocalApprovalStatus(pendingIds);
    try {
      const response = await fetch("/api/holidaysera/properties/approve-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerm, searchType }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to approve pending properties");
      }
      toast.success(`Approved ${data.modifiedCount ?? pendingIds.length} properties`);
    } catch (error: any) {
      setProperty(rollback);
      setProperties(rollback);
      toast.error(error.message || "Bulk approval failed");
    } finally {
      setBulkApproving(false);
    }
  }, [pendingIds, property, searchTerm, searchType, updateLocalApprovalStatus]);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      items.push(
        <button key="start-ellipsis" className="px-3 py-1.5 text-sm text-gray-500" disabled>
          ...
        </button>
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <button
          key={i}
          onClick={() => setPage(i)}
          className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            page === i
              ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      items.push(
        <button key="end-ellipsis" className="px-3 py-1.5 text-sm text-gray-500" disabled>
          ...
        </button>
      );
    }

    return items;
  };

  const handleCardClick = (propertyId: string) => {
    setExpandedCard(expandedCard === propertyId ? null : propertyId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-300">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                HolidaySera Properties
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Browse and manage HolidaySera property listings
              </p>
            </div>
            {canApprove && (
              <button
                onClick={approveAllPending}
                disabled={bulkApproving || pendingIds.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkApproving && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve All Pending ({pendingIds.length})
              </button>
            )}
          </div>
          {showHolidaySeraOnly && filteredProperties && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Showing {filteredProperties.length} HolidaySera {filteredProperties.length === 1 ? 'property' : 'properties'}
              </span>
            </div>
          )}
        </div>

        {/* Search Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-48">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-background border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all duration-200"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="VSID">VSID</option>
            </select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-background border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-background border border-gray-200 dark:border-gray-700 rounded-xl">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
              HolidaySera Only
            </span>
            <ToggleButton
              value={showHolidaySeraOnly}
              onChange={setShowHolidaySeraOnly}
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {showHolidaySeraOnly ? "No HolidaySera properties found" : "No properties found"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {showHolidaySeraOnly
                ? "Try turning off the HolidaySera filter to see all properties"
                : "Try adjusting your search criteria"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-10">
              {filteredProperties?.map((prop) => {
                const isExpanded = expandedCard === prop._id;
                const price =
                  prop.rentalType === "Short Term"
                    ? prop.basePrice
                    : prop.basePriceLongTerm;
                const priceLabel =
                  prop.rentalType === "Short Term" ? "night" : "month";
                
                // Determine if property is from HolidaySera or VacationSaga
                const isHolidaySera = prop.origin?.toLowerCase().trim() === "holidaysera";
                const approvalStatus = getApprovalStatus(prop);
                const approvalNeeded = requiresApproval(prop);
                const isPending = approvalNeeded && approvalStatus === "pending";
                const isSingleApproving = approvingPropertyId === prop._id;

                return (
                  <div
                    key={prop._id}
                    className={`rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer group border ${
                      isPending
                        ? "bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-700"
                        : "bg-white dark:bg-gray-900 border-transparent"
                    } ${
                      isExpanded
                        ? "ring-2 ring-gray-900 dark:ring-gray-100 scale-[1.02]"
                        : "hover:scale-[1.01]"
                    }`}
                    onClick={() => handleCardClick(prop._id)}
                  >
                    {/* Image */}
                    <div className="relative overflow-hidden h-64">
                      <Image
                        src={
                          prop.propertyCoverFileUrl ||
                          "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=800"
                        }
                        alt={prop.propertyName || "Property"}
                        fill
                        className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <div className="px-3 py-1.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-sm">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                            {prop.commonId}
                          </p>
                        </div>
                        <div
                          className={`px-2.5 py-1.5 backdrop-blur-sm rounded-lg shadow-sm font-bold text-xs ${
                            isHolidaySera
                              ? "bg-emerald-500/90 text-white"
                              : "bg-blue-500/90 text-white"
                          }`}
                        >
                          {isHolidaySera ? "HS" : "VS"}
                        </div>
                      </div>

                      <Link
                        className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm"
                        href={`/dashboard/newproperty/${prop.commonId}`}
                      >
                        <Edit className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </Link>
                    </div>

                    {/* Card Content */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                            {prop.propertyName || "Untitled Property"}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {prop.city || "Location not specified"}
                          </p>
                        </div>
                        {approvalNeeded && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              approvalStatus === "approved"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : approvalStatus === "rejected"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            }`}
                          >
                            {approvalStatus.charAt(0).toUpperCase() +
                              approvalStatus.slice(1)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                          €{price || "N/A"}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          /{priceLabel}
                        </span>
                      </div>

                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">
                            VSID: {prop.VSID}
                          </span>
                          {/* <span className="text-gray-400 dark:text-gray-500 truncate ml-2 max-w-[120px]">
                            {prop.hostedBy || "N/A"}
                          </span> */}
                        </div>
                      </div>
                      {canApprove && approvalNeeded && isPending && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void approveSingle(prop._id, prop.commonId);
                          }}
                          disabled={isSingleApproving || bulkApproving}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSingleApproving && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {properties.length > 0 && totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pb-8">
                {renderPaginationItems()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HolidaySeraPropertyPage;
