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
  const [fetchedMonthQueries, setFetchedMonthQueries] = useState<IQuery[]>([]); 
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
    return `${dd}/${mm}`;
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

  // UPDATED: This is the ONLY change - using the new monthly stats endpoint
  const fetchForMonth = async (month: string) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/sales/monthly-stats?month=${month}`
      );
      
      const data: IQuery[] = res.data?.queries || [];
      setFetchedMonthQueries(data);
      console.log("Monthly Queries:", data);
      console.log("Total monthly queries:", data.length);
    } catch (err) {
      console.error("Error fetching queries for month", err);
      setFetchedMonthQueries([]);
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

  // Separate effect to fetch monthly data when currentMonth changes
  useEffect(() => {
    if (currentMonth) {
      fetchForMonth(currentMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  useEffect(() => {
    if (selectedDate) fetchForDate(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

 

  const monthlyGroupedByCreator = useMemo(() => {
    return fetchedMonthQueries.reduce((acc: Record<string, IQuery[]>, q) => {
      const name = getCreatorName(q.createdBy);
      if (!acc[name]) acc[name] = [];
      acc[name].push(q);
      return acc;
    }, {});
  }, [fetchedMonthQueries, employees]);


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

  const evaluateEmployeeDay = (queries: IQuery[]) => {
    let score = 0;

    for (const q of queries) {
      const quality = q.leadQualityByReviewer?.toLowerCase().trim();

      if (quality === "very good") score += 4;
      else if (quality === "good") score += 1.25;
      else if (quality === "average") score += 0.75;
      else score += 0; // below average or missing
    }

    let dayStatus = "";
    let type = "";

    if (score >= 6) {
      dayStatus = "Good ";
      type = "good";
    } else if (score >= 3 && score <= 5) {
      dayStatus = "Fair ";
      type = "fair";
    } else {
      dayStatus = "Bad ";
      type = "bad";
    }

    return { score, dayStatus, type };
  };

  const evaluateEmployeeMonth = (queries: IQuery[]) => {
    let score = 0;
    let closedLeads = 0;

    for (const q of queries) {
      const quality = q.leadQualityByReviewer?.toLowerCase().trim();

      if (quality === "very good") score += 4;
      else if (quality === "good") score += 1.25;
      else if (quality === "average") score += 0.75;
      else score += 0;

       if (q.leadStatus?.toLowerCase().trim() === "closed") {
      closedLeads++;
    }
    }

    let status = "";
    let type = "";

    if (score >= 140) { 
      status = "Good Month";
      type = "good";
    } 
    else if (score >= 75 && score <= 139) {
      status = "Fair Month";
      type = "fair";
    } 
    else {
      status = "Bad Month";
      type = "bad";
    }

    return { score, totalLeads: queries.length, status, type,closedLeads };
  };


  const DayRatingBadge = ({ status, type }: { status: string; type: string }) => {
    const color =
      type === "good"
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : type === "fair"
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

    return (
      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${color}`}>
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
      <div className="print:hidden mb-4 flex justify-evenly ">
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

      {/* Monthly Summary Cards */}
      <div className="flex flex-wrap gap-4 mb-6">
        {Object.keys(monthlyGroupedByCreator).map((creator) => {
          const data = monthlyGroupedByCreator[creator];
        
          const monthly = evaluateEmployeeMonth(data);

          const color =
            monthly.type === "good"
              ? "bg-green-100 text-green-700 border-green-300"
              : monthly.type === "fair"
              ? "bg-yellow-100 text-yellow-700 border-yellow-300"
              : "bg-red-100 text-red-700 border-red-300";

          return (
            <div
              key={creator}
              className={`w-full sm:w-[35%] lg:w-[10%] p-4 border rounded-lg shadow-sm ${color}`}
            >
              <h3 className="font-semibold text-lg mb-1">{creator}</h3>

              <p className="text-sm">
                <strong>Total Leads:</strong> {monthly.totalLeads}
              </p>

              <p className="text-sm">
                <strong>Monthly Score:</strong> {monthly.score}
              </p>

              <p className="text-sm">
                <strong>Closed Leads:</strong> {monthly.closedLeads}
              </p>

              <p className="text-sm font-semibold mt-1">{monthly.status}</p>
            </div>
          );
        })}
      </div>

      {/* Report */}
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 print:border-0 rounded">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-300 dark:border-gray-700">
          <h1 className="text-lg sm:text-xl font-bold text-center text-gray-900 dark:text-gray-100">
            Lead Report
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
                const dayEvaluation = evaluateEmployeeDay(groupedByCreator[creator]);

                return (
                  <div key={creator} className="break-inside-avoid">
                    {/* Creator Header */}
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-300 dark:border-gray-700">
                      <h2 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center">
                        {creatorIndex + 1}. {creator}
                        <DayRatingBadge
                          status={dayEvaluation.dayStatus}
                          type={dayEvaluation.type}
                        />
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          Score: {dayEvaluation.score}
                        </span>
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
                        <span className="w-24 sm:w-36 flex-shrink-0">
                          Phone
                        </span>
                        <span className="w-24 sm:w-32 flex-shrink-0">
                          Location
                        </span>
                        {/* <span className="w-28 sm:w-40 flex-shrink-0">Area</span> */}
                        <span className="w-28 sm:w-36 flex-shrink-0">
                          LQ (Lead-gen)
                        </span>
                        <span className="w-28 sm:w-36 flex-shrink-0">
                          LQ (Sales)
                        </span>
                        <span className="w-40 sm:w-56 flex-shrink-0">
                          Status
                        </span>
                        <span className="w-24 sm:w-32 flex-shrink-0">
                          Response
                        </span>
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

          /* Shift everything slightly right */
          @page {
            size: A4 portrait;
            margin: 0.6cm 1cm 0.6cm 0.2cm; /* TOP RIGHT BOTTOM LEFT */
          }

          /* Optional: push container slightly right */
          .print-container {
            margin-left: 0.3cm !important;
          }

          /* Better readable size */
          * {
            font-size: 11px !important;
            line-height: 1.25 !important;
          }

          /* Slight spacing */
          .table-row {
            padding: 3px 6px !important;
          }

          .table-header {
            padding: 4px 6px !important;
          }

          /* Wider columns */
          .col {
            max-width: 120px !important;
            overflow: hidden !important;
            white-space: nowrap !important;
            text-overflow: ellipsis !important;
          }

          /* Natural breathing space */
          .space-y-4, .space-y-6 {
            row-gap: 8px !important;
          }

          /* Title spacing */
          h1, h2, h3, h4 {
            margin: 4px 0 !important;
          }

          /* Prevent splitting inside pages */
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

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