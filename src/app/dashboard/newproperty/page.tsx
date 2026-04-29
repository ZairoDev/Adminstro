"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Loader2, Search } from "lucide-react";
import { PropertiesDataType } from "@/util/type";
import debounce from "lodash.debounce";
import Link from "next/link";
import { toast } from "sonner";
import { useAuthStore } from "@/AuthStore";

type ApprovalStatus = "pending" | "approved" | "rejected";
type PropertyItem = PropertiesDataType & {
  approvalStatus?: ApprovalStatus;
  effectiveApprovalStatus?: ApprovalStatus;
  origin?: string;
};

const PropertyPage: React.FC = () => {
  const [property, setProperty] = useState<PropertyItem[]>();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("email");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [approvingPropertyId, setApprovingPropertyId] = useState<string | null>(
    null
  );
  const [bulkApproving, setBulkApproving] = useState<boolean>(false);
  const limit: number = 12;
  const role = useAuthStore((state) => state.token?.role);
  const canApprove = role === "SuperAdmin" || role === "HAdmin";

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
  }, [searchTerm, page]);

  const getApprovalStatus = useCallback((item: PropertyItem) => {
    return item.approvalStatus ?? item.effectiveApprovalStatus ?? "approved";
  }, []);

  const requiresApproval = useCallback((item: PropertyItem) => {
    const source = (item.origin ?? "").toLowerCase().trim();
    return source.includes("holidaysera");
  }, []);

  const pendingIds = useMemo(() => {
    return (property ?? [])
      .filter(
        (item) => requiresApproval(item) && getApprovalStatus(item) === "pending"
      )
      .map((item) => item._id);
  }, [property, getApprovalStatus, requiresApproval]);

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
    // window.open(
    //   `https://www.vacationsaga.com/listing-stay-detail/${propertyId}`,
    //   "_blank"
    // );
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
                Properties
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Browse and manage your property listings
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
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-10">
              {property?.map((property) => {
                const isExpanded = expandedCard === property._id;
                const price =
                  property.rentalType === "Short Term"
                    ? property.basePrice
                    : property.basePriceLongTerm;
                const priceLabel =
                  property.rentalType === "Short Term" ? "night" : "month";

                const approvalStatus = getApprovalStatus(property);
                const approvalNeeded = requiresApproval(property);
                const isPending = approvalNeeded && approvalStatus === "pending";
                const isSingleApproving = approvingPropertyId === property._id;

                return (
                  <div
                    key={property._id}
                    className={`rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer group border ${
                      isPending
                        ? "bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-700"
                        : "bg-white dark:bg-gray-900 border-transparent"
                    } ${
                      isExpanded
                        ? "ring-2 ring-gray-900 dark:ring-gray-100 scale-[1.02]"
                        : "hover:scale-[1.01]"
                    }`}
                    onClick={() => handleCardClick(property._id)}
                  >
                    {/* Image */}
                    <div className="relative overflow-hidden">
                      <img
                        src={
                          property.propertyCoverFileUrl ||
                          "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=800"
                        }
                        alt={property.propertyName || "Property"}
                        className="w-full h-64 object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 px-3 py-1.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-sm">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                          {property.commonId}
                        </p>
                      </div>
                     

                        <Link
                    className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm"
                    href={`/dashboard/newproperty/${property.commonId}`}
                  >
                   <Edit className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  </Link>
                    </div>

                    {/* Card Content */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                            {property.propertyName || "Untitled Property"}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {property.city || "Location not specified"}
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
                            VSID: {property.VSID}
                          </span>
                          <span className="text-gray-400 dark:text-gray-500 truncate ml-2 max-w-[120px]">
                            {property.hostedBy || "N/A"}
                          </span>
                        </div>
                      </div>
                      {canApprove && approvalNeeded && isPending && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void approveSingle(property._id, property.commonId);
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

                      {/* Expanded Section
                      {isExpanded && (
                        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 animate-fadeIn">
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {property.bedrooms !== undefined && (
                              <div className="text-center">
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                  {property.bedrooms}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Bedrooms
                                </p>
                              </div>
                            )}
                            {property.bathroom !== undefined && (
                              <div className="text-center">
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                  {property.bathroom}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Bathrooms
                                </p>
                              </div>
                            )}
                            {property.guests !== undefined && (
                              <div className="text-center">
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                  {property.guests}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Guests
                                </p>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="w-full py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors duration-200"
                          >
                            View Details
                          </button>
                        </div>
                      )} */}
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

export default PropertyPage;
