"use client";

import type React from "react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check, Phone, Plus, X } from "lucide-react";
import { EditableCell } from "./EditableCell";
import axios from "axios";
import type { unregisteredOwners } from "@/util/type";
import { SelectableCell } from "./SelectableCell";
import { useEffect, useState } from "react";
import { CopyCell } from "@/components/Copy";
import { EditableCopyCell } from "./EditableCopyCell";
import { get } from "http";
import toast from "react-hot-toast";

export function SpreadsheetTable({
  tableData,
  setTableData,
}: {
  tableData: unregisteredOwners[];
  setTableData: React.Dispatch<React.SetStateAction<unregisteredOwners[]>>;
}) {
  const columns = [
    { label: "Name", field: "name", sortable: true },
    { label: <Phone size={16} />, field: "phoneNumber", sortable: false },
    { label: "Location", field: "location", sortable: true },
    { label: "Price", field: "price", sortable: true },
    { label: "Area", field: "area", sortable: false },
    { label: "Int. Status", field: "intStatus", sortable: false },
    { label: "Property Type", field: "propertyType", sortable: false },
    { label: "Date", field: "date", sortable: true },
    { label: "Link", field: "link", sortable: false },
    { label: "Ref. Link", field: "refLink", sortable: false },
    { label: "Address", field: "address", sortable: false },
    { label: "Remarks", field: "remarks", sortable: false },
  ];

  const [sortedData, setSortedData] = useState<unregisteredOwners[]>([]);
  const [sortBy, setSortBy] = useState<keyof unregisteredOwners | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [locationws, setLocationws] = useState<string[]>([]);
  const [cityAreas, setCityAreas] = useState<Record<string, string[]>>({});
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  const apartmentTypes = [
    "Studio",
    "Apartment",
    "Villa",
    "Pent House",
    "Detached House",
    "Loft",
    "Shared Apartment",
    "Maisotte",
    "Studio / 1 bedroom",
  ];

  const interiorStatus = [
    "Fully Furnished",
    "Partially Furnished",
    "Unfurnished",
  ];


  useEffect(() => {
    if (sortBy) {
      applySort(sortBy, sortOrder);
    } else {
      setSortedData(tableData); // no sort applied
    }
  }, [tableData]);

  useEffect(() => {
    const getAllLocations = async () => {
      try {
        // 1. Fetch all locations
        const res = await axios.get(`/api/addons/target/getAlLocations`);
        const fetchedCities: string[] = res.data.data.map(
          (loc: any) => loc.city
        );

        setLocationws(fetchedCities);
        // make city → area mapping
        const cityAreaMap: Record<string, string[]> = {};
        res.data.data.forEach((loc: any) => {
          cityAreaMap[loc.city] = loc.area || [];
        });
        setCityAreas(cityAreaMap);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocationws([]);
      }
    };
    console.log("Fetching locations...",cityAreas);
    getAllLocations();
  }, []);
  

  const handleAddRow = async () => {
    const tempRow: Omit<unregisteredOwners, "_id"> = {
      name: "",
      phoneNumber: "",
      location: "",
      price: "",
      interiorStatus: "Furnished",
      propertyType: "Studio",
      link: "",
      area: "",
      referenceLink: "",
      address: "",
      remarks: "",
      date: new Date(),
    };
    const tempId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const optimisticRow = { ...tempRow, _id: tempId };

    // Add optimistic row to the beginning of the array
    setTableData((prev) => [optimisticRow, ...prev]);

    try {
      const res = await axios.post(`/api/unregisteredOwners/addUser`, tempRow);
      const savedRow = res.data.data;

      console.log("Backend response:", savedRow);
      console.log("Temp ID to replace:", tempId);

      // Ensure the saved row has an _id field
      if (!savedRow || !savedRow._id) {
        throw new Error("Backend response missing _id field");
      }

      setTableData((prev) => {
        const updatedData = prev.map((item) => {
          if (item._id === tempId) {
            console.log("Replacing temp row with real row:", savedRow);
            return { ...savedRow };
          }
          return item;
        });

        // Verify the replacement actually happened
        const hasTemp = updatedData.some((item) => item._id === tempId);
        const hasReal = updatedData.some((item) => item._id === savedRow._id);

        if (hasTemp) {
          console.warn("Temp row still exists after replacement!");
        }
        if (!hasReal) {
          console.warn("Real row not found after replacement!");
        }

        return updatedData;
      });
    } catch (error) {
      console.error("Row creation failed", error);
      console.log("Rolling back optimistic update for tempId:", tempId);
      setTableData((prev) => {
        const rolledBack = prev.filter((row) => row._id !== tempId);
        console.log("Rollback complete, remaining rows:", rolledBack.length);
        return rolledBack;
      });

      alert("Failed to add new lead. Please try again.");
    }
  };

  const applySort = (
    field: keyof unregisteredOwners,
    order: "asc" | "desc"
  ) => {
    const sorted = [...tableData].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (aVal === undefined || bVal === undefined) return 0;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return order === "asc" ? aVal - bVal : bVal - aVal;
      }

      return order === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    setSortedData(sorted);
  };

  const handleSort = (field: keyof unregisteredOwners) => {
    let newOrder: "asc" | "desc" = "asc";
    if (sortBy === field) {
      newOrder = sortOrder === "asc" ? "desc" : "asc"; // toggle
    }
    setSortBy(field);
    setSortOrder(newOrder);
    applySort(field, newOrder);
  };

  const handleSave = async (
    _id: string,
    key: keyof unregisteredOwners,
    newValue: string
  ) => {
    // optimistic UI update
    
    const prev = tableData;
    const updatedData = tableData.map((item) =>
      item._id === _id ? { ...item, [key]: newValue } : item
    );
    setTableData(updatedData);

    try {
      await axios.put(`/api/unregisteredOwners/updateData/${_id}`, {
        field: key,
        value: newValue,
      });
    } catch (error) {
      console.error("Update failed", error);
      // rollback if API fails
      setTableData(prev);
    }
  };

  // const currentArea = localStorage.getItem("token");
  // const parsedArea = JSON.parse(currentArea ?? "{}").allotedArea;

  // console.log("currentArea: ", currentArea);
  useEffect(() => {
    const handleKeyDown = async(e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedRow) {
        setTableData((prev) => prev.filter((row) => row._id !== selectedRow));
        setSelectedRow(null);
        console.log("Deleted row with ID:", selectedRow);
        const res = await axios.delete(`/api/unregisteredOwners/updateData/${selectedRow}`);
        if(res.status === 200){
          toast(
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Lead deleted successfully
            </div>
          )
        }
        else{
          toast(
            <div className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Error deleting lead
            </div>
          )
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRow]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {/* <div>
          <h2 className="text-2xl font-bold">Lead Management</h2>
          <p className="text-muted-foreground">
            Manage your unregistered property owners and leads
          </p>
        </div> */}
        <Button onClick={handleAddRow} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Lead
        </Button>
      </div>

      <Table>
        <TableCaption>A list of your unregistered owners.</TableCaption>

        {/* Table Header */}
        <TableHeader>
          <TableRow>
            {/* {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
              
            ))} */}
            {columns.map((col) => (
              <TableHead
                key={col.field}
                onClick={
                  col.sortable
                    ? () => handleSort(col.field as keyof unregisteredOwners)
                    : undefined
                }
                className={col.sortable ? "cursor-pointer select-none" : ""}
              >
                {col.label}{" "}
                {col.sortable && sortBy === col.field
                  ? sortOrder === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        {/* Table Body */}
        <TableBody>
          {sortedData.map((item: unregisteredOwners) => (
            <TableRow
              key={item?._id}
              onClick={() => setSelectedRow(item._id)}
              className={`cursor-pointer ${
                selectedRow === item._id ? " bg-gray-900" : ""
              }`}
            >
              {/* Name */}
              <TableCell className="font-medium truncate max-w-[150px]">
                <EditableCell
                  value={item.name}
                  onSave={(newValue) => handleSave(item?._id, "name", newValue)}
                  maxWidth="150px"
                  // placeholder="Enter name"
                />
              </TableCell>

              {/* Phone Number */}
              <TableCell>
                <EditableCopyCell
                  value={item.phoneNumber.toString()}
                  onSave={(newValue) =>
                    handleSave(item._id, "phoneNumber", newValue)
                  }
                />
              </TableCell>

              {/* Location */}
              <TableCell
                className="truncate max-w-[150px]"
                title={item.location}
              >
                <SelectableCell
                  maxWidth="100px"
                  value={item.location}
                  data={locationws}
                  save={(newValue: string) =>
                    handleSave(item._id, "location", newValue)
                  }
                />
              </TableCell>

              {/* Price */}

              <TableCell>
                <EditableCell
                  maxWidth="80px"
                  value={item.price}
                  onSave={(newValue) => handleSave(item._id, "price", newValue)}
                  // placeholder="Price"
                />
              </TableCell>

              <TableCell>
                <SelectableCell
                  maxWidth="200px"
                  data={cityAreas[item.location] || []}
                  value={item.area}
                  save={(newValue: string) =>
                    handleSave(item._id, "area", newValue)
                  }
                />
              </TableCell>
              {/* Int. Status */}
              <TableCell>
                <SelectableCell
                  maxWidth="200px"
                  data={interiorStatus}
                  value={item.interiorStatus}
                  save={(newValue: string) =>
                    handleSave(item._id, "interiorStatus", newValue)
                  }
                />
              </TableCell>

              {/* Property Type */}
              <TableCell>
                <SelectableCell
                  maxWidth="200px"
                  data={apartmentTypes}
                  value={item.propertyType}
                  save={(newValue: string) =>
                    handleSave(item?._id, "propertyType", newValue)
                  }
                />
              </TableCell>
              <TableCell>
                <EditableCell
                  maxWidth="80px"
                  value={
                    new Date(item.date).toLocaleDateString("en-US", {}) ||
                    item.date.toString()
                  }
                  onSave={(newValue) => handleSave(item._id, "date", newValue)}
                  type="date"
                />
              </TableCell>
              {/* Link */}
              <TableCell
                className="text-right truncate max-w-[60px]"
                title={item.link}
              >
                <div className="flex items-center gap-1">
                  <EditableCell
                    value={item.link}
                    onSave={(newValue) =>
                      handleSave(item._id, "link", newValue)
                    }
                    maxWidth="60px"
                    // placeholder="URL"
                  />
                </div>
                {item.link && item.link !== "-" && (
                  <a
                    href={
                      item.link.startsWith("http")
                        ? item.link
                        : `https://${item.link}`
                    }
                    target="_blank"
                    className="text-blue-500 hover:text-blue-700 ml-1"
                    rel="noreferrer"
                    title="Open link in new tab"
                  >
                    🔗
                  </a>
                )}
              </TableCell>

              {/* Ref. Link */}
              <TableCell
                className="text-right truncate max-w-[60px]"
                title={item.referenceLink}
              >
                <div className="flex items-center gap-1">
                  <EditableCell
                    value={item.referenceLink}
                    onSave={(newValue) =>
                      handleSave(item._id, "referenceLink", newValue)
                    }
                    maxWidth="60px"
                    // placeholder="Ref URL"
                  />
                </div>
                {item.referenceLink && item.referenceLink !== "-" && (
                  <a
                    href={
                      item.referenceLink.startsWith("http")
                        ? item.referenceLink
                        : `https://${item.referenceLink}`
                    }
                    target="_blank"
                    className="text-blue-500 hover:text-blue-700 ml-1"
                    rel="noreferrer"
                    title="Open reference link in new tab"
                  >
                    🔗
                  </a>
                )}
              </TableCell>

              {/* Address */}
              <TableCell
                className="truncate max-w-[150px]"
                title={item.address}
              >
                <EditableCell
                  maxWidth="200px"
                  value={item.address}
                  onSave={(newValue) =>
                    handleSave(item._id, "address", newValue)
                  }
                  // placeholder="Address"
                />
              </TableCell>

              {/* Remarks */}
              <TableCell
                className="text-right truncate max-w-[120px]"
                title={item.remarks}
              >
                <EditableCell
                  value={item.remarks}
                  onSave={(newValue) =>
                    handleSave(item._id, "remarks", newValue)
                  }
                  maxWidth="120px"
                  // placeholder="Remarks"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
