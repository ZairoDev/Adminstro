import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IQuery } from "@/util/type";
import { useAuthStore } from "@/AuthStore";
import { EmployeeInterface } from "@/util/type";

interface AreaType {
  _id: string;
  city: string;
  name: string;
}
interface TargetType {
  _id: string;
  city: string;
  areas: AreaType[];
}

export default function CompareTable({
  queries,
  setQueries,
}: {
  queries: IQuery[];
  setQueries: Function;
}) {
  const searchParams = useSearchParams();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [fetchedQueries, setFetchedQueries] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [employees, setEmployees] = useState<EmployeeInterface[]>([]);

  const token = useAuthStore();

  useEffect(() => {
    if (searchParams.get("page")) {
      // Keep page-related behavior harmless for other components
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const res = await axios.get("/api/addons/target/getAreaFilterTarget");
        setTargets(res.data.data);
      } catch (error) {
        console.error("Error fetching targets:", error);
      }
    };
    fetchTargets();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get("/api/employee/getAllEmployee");
        setEmployees(res.data.allEmployees || []);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };

    fetchEmployees();
  }, []);

  const getDaysInMonth = (year: number, monthIndex: number) => {
    const date = new Date(year, monthIndex, 1);
    const days: string[] = [];
    while (date.getMonth() === monthIndex) {
      days.push(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
          date.getDate()
        ).padStart(2, "0")}`
      );
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const daysInSelectedMonth = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    return getDaysInMonth(y, m - 1);
  }, [currentMonth]);

  const formatDisplayDate = (isoDate?: string) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  const formatFullDate = (isoDate?: string) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    return d.toLocaleDateString(undefined, { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCreatorName = (email?: string) => {
    if (!email) return "Unknown";

    const emp = employees.find(
      (e) => e.email.toLowerCase() === email.toLowerCase()
    );

    return emp ? emp.name : email;
  };

  const fetchForDate = async (isoDate: string) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/sales/getquery?fromDate=${isoDate}&toDate=${isoDate}`
      );
      const data: IQuery[] = res.data?.data || [];
      setFetchedQueries(data);
      setQueries?.(data);
    } catch (err) {
      console.error("Error fetching queries for date", err);
      setFetchedQueries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDate) {
      const today = new Date();
      const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(today.getDate()).padStart(2, "0")}`;
      setSelectedDate(iso);
      fetchForDate(iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDate) fetchForDate(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleSave = async (
    _id: string,
    key: keyof IQuery,
    newValue: string
  ) => {
    const prev = [...(fetchedQueries || [])];

    setFetchedQueries((q: IQuery[]) =>
      q.map((item: IQuery) => (item._id === _id ? { ...item, [key]: newValue } : item))
    );

    try {
      await axios.put(`/api/leads/updateData/${_id}`, {
        field: key,
        value: newValue,
      });
      setQueries?.((q: IQuery[]) => q.map((it: IQuery) => (it._id === _id ? { ...it, [key]: newValue } : it)));
    } catch (error) {
      console.error("Update failed", error);
      setFetchedQueries(prev);
    }
  };

  const groupedByCreator = useMemo(() => {
    return fetchedQueries.reduce((acc: Record<string, IQuery[]>, q) => {
      const employeeName = getCreatorName(q.createdBy);
      if (!acc[employeeName]) acc[employeeName] = [];
      acc[employeeName].push(q);
      return acc;
    }, {});
  }, [fetchedQueries, employees]);

  const monthLabel = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [currentMonth]);

  const prevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  };

  const nextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  };

  const maskPhone = (phone?: string | number) => {
    if (!phone) return "-";
    const s = String(phone);
    if (s.length <= 4) return s;
    return "*".repeat(s.length - 4) + s.slice(-4);
  };

  const handlePrint = () => {
    window.print();
  };

  const getDailyPerformanceStatus = (queries: IQuery[]) => {
    const goodCount = queries.filter(
      (q) => q.leadQualityByReviewer?.toLowerCase() === "good"
    ).length;

    const averageCount = queries.filter(
      (q) => q.leadQualityByReviewer?.toLowerCase() === "average"
    ).length;

    if (goodCount >= 2 && averageCount >= 2) {
      return { status: "In Progress", type: "success" };
    }

    return { status: "Not Met", type: "danger" };
  };

  const PerformanceBadge = ({ status, type }: { status: string, type: string }) => {
    const color =
      type === "success"
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

    return (
      <span
        className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${color}`}
      >
        {status}
      </span>
    );
  };

  const getLeadQualityColor = (quality?: string) => {
    if (!quality || quality === "-")
      return "text-gray-400 dark:text-gray-500";

    const q = quality.toLowerCase().trim();

    if (q === "very good") {
      return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded font-semibold";
    }

    if (q === "good") {
      return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded font-semibold";
    }

    if (q === "average") {
      return "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded font-medium";
    }

    if (q === "below average") {
      return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded font-medium";
    }

    return "text-gray-600 dark:text-gray-400";
  };

  const getStatusColor = (status?: string) => {
    if (!status || status === "-")
      return "text-gray-400 dark:text-gray-500";

    const s = status.toLowerCase().trim();

    if (s === "fresh") {
      return "text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded";
    }

    if (s === "active") {
      return "text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded";
    }

    if (s === "rejected" || s === "declined") {
      return "text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded";
    }

    return "text-gray-700 dark:text-gray-300";
  };

  const getResponseColor = (response?: string) => {
    if (!response || response === "-") return "text-gray-400 dark:text-gray-500";
    
    const r = response.toLowerCase().trim();
    
    if (r === "nr" || r === "not replying" || r.includes("no response") || r.includes("not responding")) {
      return "text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded";
    }
    else if (r === "urgent" || r === "high" || r === "hot" || r.includes("immediate")) {
      return "text-orange-600 dark:text-orange-400 font-semibold bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded";
    }
    else if (r === "medium" || r === "normal" || r === "moderate") {
      return "text-yellow-600 dark:text-yellow-400 font-medium bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded";
    }
    else if (r === "low" || r === "cold") {
      return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded";
    }
    else if (r === "interested" || r === "engaged" || r === "responsive") {
      return "text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded";
    }
    
    return "text-gray-700 dark:text-gray-300";
  };

  const formatStatus = (status?: string, reason?: string) => {
    if (!status || status === "-") return <span className="text-gray-400 dark:text-gray-500">-</span>;
    
    const isRejected = status.toLowerCase().includes("reject");
    const colorClass = getStatusColor(status);
    
    if (isRejected && reason) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className={colorClass}>{status}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 italic">({reason})</span>
        </div>
      );
    }
    
    return <span className={colorClass}>{status}</span>;
  };

  const formatResponse = (response?: string) => {
    if (!response || response === "-") {
      return <span className="text-gray-400 dark:text-gray-500">-</span>;
    }

    const normalized = response.toLowerCase().trim();

    if (["none", "low", "high"].includes(normalized)) {
      return <span className="text-gray-400 dark:text-gray-500">-</span>;
    }

    if (normalized === "nr") {
      return <span className={getResponseColor(response)}>Not Replying</span>;
    }

    return <span className={getResponseColor(response)}>{response}</span>;
  };

  const formatLeadQuality = (quality?: string) => {
    if (!quality || quality === "-") return <span className="text-gray-400 dark:text-gray-500">-</span>
    
    return <span className={getLeadQualityColor(quality)}>{quality}</span>;
  };

  const totalQueries = fetchedQueries.length;
  
  return (
    <div className=" w-full p-2 sm:p-4">
      {/* Controls - Hidden on Print */}
      <div className="print:hidden mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            onClick={prevMonth}
          >
            Prev
          </button>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {monthLabel}
          </span>
          <button
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            onClick={nextMonth}
          >
            Next
          </button>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          Print
        </button>
      </div>

      {/* Date Selector */}
      <div className="print:hidden mb-4 grid grid-cols-4 sm:grid-cols-7 gap-1">
        {daysInSelectedMonth.map((day) => {
          const isSelected = day === selectedDate;
          return (
            <button
              key={day}
              onClick={() => setSelectedDate(day)}
              className={`py-2 px-1 text-xs border rounded ${
                isSelected
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {formatDisplayDate(day)}
            </button>
          );
        })}
      </div>

      {/* Report */}
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 print:border-0 rounded">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-300 dark:border-gray-700">
          <h1 className="text-lg sm:text-xl font-bold text-center text-gray-900 dark:text-gray-100">
            Query Report
          </h1>
          <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {formatFullDate(selectedDate ?? undefined)}
          </p>
          <p className="text-center text-xs sm:text-sm mt-1 text-gray-900 dark:text-gray-100">
            Total: {totalQueries}
          </p>
        </div>

        {/* Content */}
        <div className="p-2 sm:p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-900 dark:text-gray-100">
              Loading...
            </div>
          ) : fetchedQueries.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No queries for this date
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {Object.keys(groupedByCreator).map((creator, creatorIndex) => {
                const performance = getDailyPerformanceStatus(groupedByCreator[creator]);
                
                return (
                  <div key={creator} className="break-inside-avoid">
                    {/* Creator Header */}
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-300 dark:border-gray-700">
                      <h2 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center">
                        {creatorIndex + 1}. {creator}
                        <PerformanceBadge
                          status={performance.status}
                          type={performance.type}
                        />
                      </h2>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        ({groupedByCreator[creator].length})
                      </span>
                    </div>

                    {/* Unified Table Layout for All Devices */}
                    <div className="overflow-x-auto">
                      {/* Column Headers */}
                      <div className="flex items-center gap-2 sm:gap-4 py-2 sm:py-3 px-2 sm:px-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 font-medium text-xs sm:text-sm text-gray-700 dark:text-gray-300 min-w-max">
                        <span className="w-12 sm:w-16 flex-shrink-0">No.</span>
                        <span className="w-32 sm:w-48 flex-shrink-0">Name</span>
                        <span className="w-24 sm:w-36 flex-shrink-0">Phone</span>
                        <span className="w-24 sm:w-32 flex-shrink-0">Location</span>
                        <span className="w-28 sm:w-40 flex-shrink-0">Area</span>
                        <span className="w-28 sm:w-36 flex-shrink-0">
                          LQ (Lead-gen)
                        </span>
                        <span className="w-28 sm:w-36 flex-shrink-0">
                          LQ (Sales)
                        </span>
                        <span className="w-40 sm:w-56 flex-shrink-0">Status</span>
                        <span className="w-24 sm:w-32 flex-shrink-0">Response</span>
                      </div>

                      {/* Queries - Single Line Each */}
                      <div className="space-y-1">
                        {groupedByCreator[creator].map((q, index) => (
                          <div
                            key={q._id}
                            className="flex items-center gap-2 sm:gap-3 py-2 sm:py-3 px-2 sm:px-4 border-b border-gray-200 dark:border-gray-700 text-xs sm:text-sm break-inside-avoid hover:bg-gray-50 dark:hover:bg-gray-800 min-w-max"
                          >
                            <span className="text-gray-500 dark:text-gray-400 w-12 sm:w-16 flex-shrink-0">
                              {creatorIndex + 1}.{index + 1}
                            </span>
                            <span className="font-medium w-32 sm:w-48 flex-shrink-0 text-gray-900 dark:text-gray-100">
                              {q.name || "-"}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400 w-24 sm:w-36 flex-shrink-0">
                              {maskPhone(q.phoneNo)}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400 w-24 sm:w-32 flex-shrink-0">
                              {q.location || "-"}
                            </span>

                            {/* Area Selector - Hidden on Print */}
                            <div className="w-28 sm:w-40 flex-shrink-0 print:hidden">
                              {targets.length > 0 ? (
                                <select
                                  value={q.area || ""}
                                  onChange={(e) =>
                                    handleSave(q._id!, "area", e.target.value)
                                  }
                                  className="w-full border border-gray-300 dark:border-gray-600 px-1 sm:px-2 py-1 sm:py-1.5 rounded text-xs sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="">Area</option>
                                  {targets
                                    .find(
                                      (t) =>
                                        t.city.toLowerCase() ===
                                        q.location?.toLowerCase()
                                    )
                                    ?.areas.map((a) => (
                                      <option value={a.name} key={a._id}>
                                        {a.name}
                                      </option>
                                    ))}
                                </select>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500">
                                  {q.area || "-"}
                                </span>
                              )}
                            </div>

                            {/* Area Text for Print */}
                            <span className="hidden print:inline-block w-28 sm:w-40 flex-shrink-0 text-gray-600">
                              {q.area || "-"}
                            </span>

                            <div className="w-28 sm:w-36 flex-shrink-0">
                              {formatLeadQuality(q.leadQualityByCreator)}
                            </div>
                            <div className="w-28 sm:w-36 flex-shrink-0">
                              {formatLeadQuality(q.leadQualityByReviewer)}
                            </div>
                            <div className="w-40 sm:w-56 flex-shrink-0">
                              {formatStatus(q.leadStatus, q.reason)}
                            </div>
                            <div className="w-24 sm:w-32 flex-shrink-0">
                              {formatResponse(q.salesPriority)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && fetchedQueries.length > 0 && (
          <div className="p-3 border-t border-gray-300 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
            Generated on {new Date().toLocaleString()}
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
       @media print {
  body {
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  /* Landscape gives more width */
  @page {
    size: A4 potrait;
    margin: 0.5cm;
  }

  /* Shrink everything for print */
  * {
    font-size: 9px !important;
    line-height: 1.1 !important;
  }

  /* Remove padding & tighten layout */
  .print\\:tight, .tight {
    padding: 0 !important;
    margin: 0 !important;
  }

  /* Reduce header/footer space */
  h1, h2, h3, h4 {
    margin: 2px 0 !important;
  }

  /* Compress table spacing */
  .table-row {
    padding: 2px 4px !important;
  }
  .table-header {
    padding: 3px 4px !important;
  }

  /* Tighter column widths */
  .col {
    width: auto !important;
    max-width: 90px !important;
    overflow: hidden !important;
    white-space: nowrap !important;
    text-overflow: ellipsis !important;
  }

  /* Avoid unnecessary card margins */
  .space-y-4, .space-y-6 {
    row-gap: 4px !important;
  }

  /* Ensure no row splits between pages */
  .break-inside-avoid {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* Remove UI items */
  .print\\:hidden {
    display: none !important;
  }

  .print\\:border-0 {
    border: 0 !important;
  }
}

      `}</style>
    </div>
  );
}