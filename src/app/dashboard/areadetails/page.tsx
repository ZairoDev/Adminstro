"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import LeadsFilter, { FilterState } from "@/components/lead-component/NewLeadFilter";


const locationOptions = [
 "Athens", "Rome", "Milan", "Chania","thessaloniki"
];

const defaultFilters: FilterState = {
  searchType: "phoneNo",
  searchTerm: "",
  dateFilter: "all",
  customDays: "0",
  fromDate: undefined,
  toDate: undefined,
  sortBy: "None",
  status: "None",
  guest: "0",
  noOfBeds: "0",
  propertyType: "",
  billStatus: "",
  budgetFrom: "",
  budgetTo: "",
  leadQuality: "",
  allotedArea: "",
  typeOfProperty: "",
};



const AreaDetailsPage = () => {
  const [location, setLocation] = useState(locationOptions[0]);
  const [loading, setLoading] = useState(false);
  const [areaStats, setAreaStats] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAreaStats = async (selectedLocation: string) => {
    setLoading(true);
    try {
      const res = await axios.post("/api/areaStats", { location: selectedLocation });
      setAreaStats(res.data);
    } catch (err) {
      setAreaStats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreaStats(location);
  }, [location]);


  // Table headings with sortable property
  const headings = [
    { key: "area", label: "Area", sortable: true },
    { key: "oneBedroom", label: "1 Bedroom", sortable: true },
    { key: "twoBedroom", label: "2 Bedroom", sortable: true },
    { key: "threeBedroom", label: "3 Bedroom", sortable: true },
    { key: "fourBedroom", label: "4 Bedroom", sortable: true },
    { key: "studio", label: "Studio", sortable: true },
  ];

  const [sortKey, setSortKey] = useState<string>("area");
  const [sortOrder, setSortOrder] = useState<"asc"|"desc">("asc");

  // Filter and sort areaStats
  const filteredStats = (searchTerm.trim()
    ? areaStats.filter((row) => {
        const areaName = (row.area ?? "").toString().toLowerCase().trim();
        return areaName.includes(searchTerm.toLowerCase().trim());
      })
    : areaStats
  ).slice().sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  return (
    <div className="w-full min-h-screen  bg-gray-200 dark:bg-stone-950 font-sans">
      <div className="w-full mx-auto p-6 bg-white dark:bg-stone-950 rounded-2xl shadow-xl border border-gray-100 dark:border-stone-900">
        <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-stone-100 tracking-tight">
          Area Details
        </h2>
        <p className="mb-6 text-gray-500 dark:text-stone-400 text-sm">
          View area-wise bedroom and studio counts for each location. Use the search and sort features for quick access.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="font-semibold text-gray-700 dark:text-stone-300">
              Location:
            </label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-[180px] bg-gray-50 dark:bg-stone-900 border-gray-200 dark:border-stone-800">
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent className="dark:bg-stone-900 dark:text-stone-100">
                {locationOptions.map((loc) => (
                  <SelectItem key={loc} value={loc} className="dark:bg-stone-900 dark:text-stone-100">
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            className="w-full sm:w-[220px] bg-gray-50 dark:bg-stone-900 border-gray-200 dark:border-stone-800 focus:ring-2 focus:ring-blue-400 dark:text-stone-100"
            placeholder="Search area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-full bg-white dark:bg-stone-950 rounded-lg shadow-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-blue-50 dark:bg-stone-900 text-gray-700 dark:text-stone-200">
                {headings.map((heading) => (
                  <th
                    key={heading.key}
                    className={`px-4 py-3 border-b border-gray-200 dark:border-stone-800 text-sm font-semibold cursor-pointer select-none transition-colors duration-150 ${
                      heading.sortable
                        ? "hover:bg-blue-100 dark:hover:bg-stone-800"
                        : "opacity-60"
                    }`}
                    onClick={() => {
                      if (!heading.sortable) return;
                      if (sortKey === heading.key) {
                        setSortOrder((prev) =>
                          prev === "asc" ? "desc" : "asc"
                        );
                      } else {
                        setSortKey(heading.key);
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <span className="flex items-center justify-center">
                      {heading.label}
                      {heading.sortable && sortKey === heading.key && (
                        <span className="ml-1 text-xs">
                          {sortOrder === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStats.length === 0 ? (
                <tr>
                  <td
                    colSpan={headings.length}
                    className="text-center py-8 text-gray-400 dark:text-stone-500 text-base"
                  >
                    No data found for this location.
                  </td>
                </tr>
              ) : (
                filteredStats.map((row, idx) => (
                  <tr
                    key={idx}
                    className={
                      idx % 2 === 0
                        ? "bg-white dark:bg-stone-950"
                        : "bg-gray-50 dark:bg-stone-900"
                    }
                  >
                    {headings.map((heading,index) => (
                      <td
                        key={index}
                        className={`px-4 py-3 border-b border-gray-100 dark:border-stone-900 text-center${
                          heading.key === "area"
                            ? " font-semibold text-left"
                            : ""
                        } dark:text-stone-100`}
                      >
                        {row[heading.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AreaDetailsPage;