"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { debounce } from "lodash";
import CustomTooltip from "@/components/CustomToolTip";
import { Button } from "@/components/ui/button";
import {
  Ban,
  CheckCheck,
  CircleDot,
  Copy,
  PawPrint,
  Phone,
  Pin,
  Plus,
  Star, 

} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { EditableCell } from "./components/cells/EditableCell";
import { EditableCopyCell } from "./components/cells/EditableCopyCell";
import { SelectableCell } from "./components/cells/SelectableCell";
import axios from "axios";
import type { unregisteredOwners } from "@/util/type";
import { AreaSelect } from "@/components/leadTableSearch/page";
import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";
import { FaWhatsapp } from "react-icons/fa6";
import Link from "next/link";
import { UploadCell } from "./components/cells/UploadCell";
import { DownloadCell } from "./components/cells/DownloadCell";
import { ActionMenu } from "./components/table/ActionMenu";
import { SpreadsheetFormulaBar } from "./components/table/SpreadsheetFormulaBar";
import { SpreadsheetHeader } from "./components/table/SpreadsheetHeader";

export const apartmentTypes = [
  { label: "Studio", value: "Studio" },
  { label: "1 Bedroom", value: "1 Bedroom" },
  { label: "2 Bedroom", value: "2 Bedroom" },
  { label: "3 Bedroom", value: "3 Bedroom" },
  { label: "4 Bedroom", value: "4 Bedroom" },
  { label: "Villa", value: "Villa" },
  { label: "Pent House", value: "Pent House" },
  { label: "Detached House", value: "Detached House" },
  { label: "Loft", value: "Loft" },
  { label: "Shared Apartment", value: "Shared Apartment" },
  { label: "Maisotte", value: "Maisotte" },
];

const columnWidths = {
  serial: "w-[80px] min-w-[80px] max-w-[80px]",
  name: "w-[150px] min-w-[150px] max-w-[150px]",
  phone: "w-[120px] min-w-[120px] max-w-[120px]",
  location: "w-[120px] min-w-[120px] max-w-[120px]",
  price: "w-[100px] min-w-[100px] max-w-[100px]",
  area: "w-[120px] min-w-[120px] max-w-[120px]",
  availability: "w-[80px] min-w-[80px] max-w-[80px]",
  interiorStatus: "w-[100px] min-w-[100px] max-w-[100px]",
  petStatus: "w-[80px] min-w-[80px] max-w-[80px]",
  propertyType: "w-[150px] min-w-[150px] max-w-[150px]",
  remarks: "w-[180px] min-w-[180px] max-w-[180px]",
  refLink: "w-[130px] min-w-[130px] max-w-[130px]",
  vsLink: "w-[130px] min-w-[130px] max-w-[130px]",
  vsid: "w-[120px] min-w-[120px] max-w-[120px]",
  address: "w-[180px] min-w-[180px] max-w-[180px]",
  actions: "w-[80px] min-w-[80px] max-w-[80px]",
};

const propertyTypeColors: Record<string, string> = {
  Studio: "bg-blue-200 dark:bg-blue-800/30 text-blue-900 dark:text-blue-200",
  "1 Bedroom":
    "bg-green-200 dark:bg-green-800/30 text-green-900 dark:text-green-200",
  "2 Bedroom":
    "bg-orange-200 dark:bg-orange-800/30 text-orange-900 dark:text-orange-200",
  "3 Bedroom":
    "bg-yellow-200 dark:bg-yellow-800/30 text-yellow-900 dark:text-yellow-200",
  "4 Bedroom": "bg-red-200 dark:bg-red-800/30 text-red-900 dark:text-red-200",
  Villa: "bg-rose-200 dark:bg-rose-800/30 text-rose-900 dark:text-rose-200",
  "Pent House":
    "bg-purple-200 dark:bg-purple-800/30 text-purple-900 dark:text-purple-200",
  "Detached House":
    "bg-cyan-200 dark:bg-cyan-800/30 text-cyan-900 dark:text-cyan-200",
  Loft: "bg-teal-200 dark:bg-teal-800/30 text-teal-900 dark:text-teal-200",
  "Shared Apartment":
    "bg-amber-200 dark:bg-amber-800/30 text-amber-900 dark:text-amber-200",
  Maisotte: "bg-lime-200 dark:bg-lime-800/30 text-lime-900 dark:text-lime-200",
};

export function SpreadsheetTable({
  tableData,
  setTableData,
  serialOffset,
  onAvailabilityChange,
}: {
  tableData: unregisteredOwners[];
  setTableData: React.Dispatch<React.SetStateAction<unregisteredOwners[]>>;
  serialOffset: number;
  onAvailabilityChange?: () => void;
}): ReactElement {
  const columns = [
    {
      label: "S.No",
      field: "serial",
      sortable: false,
      width: columnWidths.serial,
    },
    { label: "Name", field: "name", sortable: true, width: columnWidths.name },
    {
      label: <Phone size={16} />,
      field: "phoneNumber",
      sortable: false,
      width: columnWidths.phone,
    },
    {
      label: "Location",
      field: "location",
      sortable: true,
      width: columnWidths.location,
    },
    {
      label: "Price",
      field: "price",
      sortable: true,
      width: columnWidths.price,
    },
    { label: "Area", field: "area", sortable: false, width: columnWidths.area },
    {
      label: "Avail.",
      field: "availability",
      sortable: true,
      width: columnWidths.availability,
    },
    {
      label: "Int. Status",
      field: "intStatus",
      sortable: false,
      width: columnWidths.interiorStatus,
    },
    {
      label: "Pet. Status",
      field: "petStatus",
      sortable: false,
      width: columnWidths.petStatus,
    },
    {
      label: "Property Type",
      field: "propertyType",
      sortable: false,
      width: columnWidths.propertyType,
    },
    {
      label: "Remarks",
      field: "remarks",
      sortable: false,
      width: columnWidths.remarks,
    },
    
    {
      label: "Ref. Link",
      field: "refLink",
      sortable: false,
      width: columnWidths.refLink,
    },
    {
      label: "VsLink",
      field: "link",
      sortable: false,
      width: columnWidths.vsLink,
    },
    { label: "VSID", field: "vsid", sortable: false, width: columnWidths.vsid },
    {
      label: "Address",
      field: "address",
      sortable: false,
      width: columnWidths.address,
    },
    {
      label: "Actions",
      field: "upload",
      sortable: false,
      width: columnWidths.actions,
    },
  ];

  interface TargetType {
    _id: string;
    city: string;
    areas: AreaType[];
  }
  interface AreaType {
    _id: string;
    city: string;
    name: string;
  }

   const interiorStatus = [
    { label: "F", value: "Fully Furnished" },
    { label: "S F", value: "SemiFurnished" },
    { label: "Un", value: "Unfurnished" },
  ];

  const avail = [
    {
      label: "A",
      value: "Available",
    },
    {
      label: "NA",
      value: "Not Available",
    },
  ];

  //state declarations
  const [targets, setTargets] = React.useState<TargetType[]>([]);
  const [areas, setAreas] = React.useState<AreaType[]>([]);
  const [sortedData, setSortedData] = React.useState<unregisteredOwners[]>([]);
  const [sortBy, setSortBy] = React.useState<keyof unregisteredOwners | null>(null);
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [locationws, setLocationws] = React.useState<string[]>([]);
  const [cityAreas, setCityAreas] = React.useState<Record<string, string[]>>({});
  const [selectedRow, setSelectedRow] = React.useState<string | null>(null);
  const [selectedCell, setSelectedCell] = React.useState<{
    rowId: string;
    field: string;
    value: string;
    rowIndex: number;
    colIndex: number;
  } | null>(null);

 //refs
 const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
 const tableBodyRef = useRef<HTMLDivElement>(null);
 const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);
 const isScrollingRef = useRef(false);

  const [petStatus, setPetStatus] = useState<
    ("Allowed" | "Not Allowed" | "None")[]
  >(Array.from({ length: tableData?.length }, () => "None"));
  const [filterMode, setFilterMode] = useState<0 | 1 | 2>(0);

  const { toast } = useToast();

  const token = useAuthStore((state: any) => state.token);

  const handleResponseStatus = async (id: string, index: number) => {
    const currentStatus = tableData[index].isVerified;
    const newStatus = currentStatus === "Verified" ? "None" : "Verified";

    const updatedData = tableData.map((item, i) =>
      i === index ? { ...item, isVerified: newStatus } : item
    );
    setTableData(updatedData);

    try {
      await axios.put(`/api/unregisteredOwners/updateData/${id}`, {
        field: "isVerified",
        value: newStatus,
      });

      toast({
        title: "Response status updated",
        description: "Owner verified successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Response status update failed", error);

      const rollbackData = tableData.map((item, i) =>
        i === index ? { ...item, isVerified: currentStatus } : item
      );
      setTableData(rollbackData);

      toast({
        title: "Failed to update the Owner status",
        variant: "destructive",
      });
    }
  };

  const handleImportantStatus = async (id: string, index: number) => {
    const currentStatus = tableData[index].isImportant;
    const newStatus = currentStatus === "Important" ? "None" : "Important";

    const updatedData = tableData.map((item, i) =>
      i === index ? { ...item, isImportant: newStatus } : item
    );
    setTableData(updatedData);

    try {
      await axios.put(`/api/unregisteredOwners/updateData/${id}`, {
        field: "isImportant",
        value: newStatus,
      });

      toast({
        title: "Response status updated",
        description: "Important set successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Response status update failed", error);

      const rollbackData = tableData.map((item, i) =>
        i === index ? { ...item, isImportant: currentStatus } : item
      );
      setTableData(rollbackData);

      toast({
        title: "Failed to update the Owner status",
        variant: "destructive",
      });
    }
  };

  const handlePinnedStatus = async (id: string, index: number) => {
    const currentStatus = tableData[index].isPinned;
    const newStatus = currentStatus === "Pinned" ? "None" : "Pinned";

    const updatedData = tableData.map((item, i) =>
      i === index ? { ...item, isPinned: newStatus } : item
    );
    setTableData(updatedData);

    try {
      await axios.put(`/api/unregisteredOwners/updateData/${id}`, {
        field: "isPinned",
        value: newStatus,
      });

      toast({
        title: "Response status updated",
        description: "Pin set successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Response status update failed", error);

      const rollbackData = tableData.map((item, i) =>
        i === index ? { ...item, isPinned: currentStatus } : item
      );
      setTableData(rollbackData);

      toast({
        title: "Failed to update the Owner status",
        variant: "destructive",
      });
    }
  };

  const applyFilter = (data: unregisteredOwners[]) => {
    if (filterMode === 1) {
      return data.filter(
        (item) =>
          ((item.referenceLink && item.referenceLink.trim() !== "") ||
            (item.imageUrls && item.imageUrls.length > 0)) &&
          (!item.VSID ||
            (item.VSID.trim() === "" && !item.link) ||
            item.link.trim() === "")
      );
    }

    if (filterMode === 2) {
      return data.filter(
        (item) =>
          (!item.VSID || item.VSID.trim() === "") &&
          (!item.link || item.link.trim() === "") &&
          (!item.referenceLink || item.referenceLink.trim() === "") &&
          (!item.imageUrls || item.imageUrls.length === 0)
      );
    }

    return data;
  };

  useEffect(() => {
    if (sortBy) {
      applySort(sortBy, sortOrder);
    } else {
      setSortedData(tableData);
    }
  }, [tableData]);

  useEffect(() => {
    const getAllLocations = async () => {
      try {
        const res = await axios.get(`/api/addons/target/getAlLocations`);
        const fetchedCities: string[] = res.data.data.map(
          (loc: any) => loc.city
        );

        setLocationws(fetchedCities);

        const cityAreaMap: Record<string, string[]> = {};
        res.data.data.forEach((loc: any) => {
          cityAreaMap[loc.city] = (loc.area || []).map((a: any) => a.name);
        });

        setCityAreas(cityAreaMap);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocationws([]);
      }
    };

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

  const handleAddRow = async () => {
    const tempRow: Omit<unregisteredOwners, "_id"> = {
      VSID: "",
      name: "",
      phoneNumber: "",
      location: "",
      price: "",
      interiorStatus: "Fully Furnished",
      petStatus: "None",
      propertyType: "studio",
      link: "",
      area: "",
      referenceLink: "",
      address: "",
      remarks: "",
      availability: "Available",
      date: new Date(),
      imageUrls: [],
      isVerified: "None",
      isImportant: "None",
      isPinned: "None",
    };
    const tempId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const optimisticRow = { ...tempRow, _id: tempId };

    setTableData((prev) => [optimisticRow, ...prev]);

    try {
      const res = await axios.post(`/api/unregisteredOwners/addUser`, tempRow);
      const savedRow = res.data.data;

      if (!savedRow || !savedRow._id) {
        throw new Error("Backend response missing _id field");
      }

      setTableData((prev) => {
        const updatedData = prev.map((item) => {
          if (item._id === tempId) {
            return { ...savedRow };
          }
          return item;
        });

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
      setTableData((prev) => {
        const rolledBack = prev.filter((row) => row._id !== tempId);
        return rolledBack;
      });

      alert("Failed to add new lead. Please try again.");
    }
  };

  const getPropertyTypeColor = (propertyType: string) => {
    return (
      propertyTypeColors[propertyType] || "bg-gray-100 dark:bg-gray-900/30"
    );
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
      newOrder = sortOrder === "asc" ? "desc" : "asc";
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
      toast({
        title: "Response status updated",
        description: "Lead verified successfully.",
        variant: "default",
      });

      if (key === "availability" && onAvailabilityChange) {
        onAvailabilityChange();
      }
    } catch (error) {
      console.error("Update failed", error);
      toast({
        title: "Error deleting lead",
        variant: "destructive",
      });
      setTableData(prev);
    }
  };

  const editableFields = [
    "name", "phoneNumber", "location", "price", "area", "availability",
    "interiorStatus", "petStatus", "propertyType", "remarks", 
    "referenceLink", "link", "VSID", "address"
  ];

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Delete row with Ctrl+Delete
      if (e.ctrlKey && e.key === "Delete" && selectedRow) {
        setTableData((prev) => prev.filter((row) => row._id !== selectedRow));
        setSelectedRow(null);

        const res = await axios.delete(
          `/api/unregisteredOwners/updateData/${selectedRow}`
        );
        if (res.status === 200) {
          toast({
            title: "Response status updated",
            description: "Owner Deleted successfully.",
            variant: "default",
          });
        } else {
          toast({
            title: "Error deleting Owner",
            variant: "destructive",
          });
        }
        return;
      }

      // Copy row data with Ctrl+C when row is selected
      if (e.ctrlKey && e.key === "c" && selectedRow && !selectedCell) {
        const row = tableData.find((r) => r._id === selectedRow);
        if (row) {
          const rowData = `${row.name}\t${row.phoneNumber}\t${row.location}\t${row.price}\t${row.area}\t${row.availability}\t${row.interiorStatus}\t${row.petStatus}\t${row.propertyType}\t${row.remarks}\t${row.referenceLink}\t${row.link}\t${row.VSID}\t${row.address}`;
          navigator.clipboard.writeText(rowData);
          toast({
            title: "Row copied",
            description: "Row data copied to clipboard",
            variant: "default",
          });
        }
        return;
      }

      // Copy individual cell value with Ctrl+C when cell is selected
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedCell) {
        e.preventDefault();
        const cellValue = selectedCell.value || "";
        navigator.clipboard.writeText(cellValue);
        toast({
          title: "Cell copied",
          description: `"${cellValue.substring(0, 30)}${
            cellValue.length > 30 ? "..." : ""
          }" copied`,
          variant: "default",
        });
        return;
      }

      // Arrow key navigation for cells
      if (
        selectedCell &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();

        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        const filteredData = applyFilter(sortedData);
        let newRowIndex = selectedCell.rowIndex;
        let newColIndex = selectedCell.colIndex;

        if (e.key === "ArrowUp" && newRowIndex > 0) {
          newRowIndex--;
        } else if (
          e.key === "ArrowDown" &&
          newRowIndex < filteredData.length - 1
        ) {
          newRowIndex++;
        } else if (e.key === "ArrowLeft" && newColIndex > 0) {
          newColIndex--;
        } else if (
          e.key === "ArrowRight" &&
          newColIndex < editableFields.length - 1
        ) {
          newColIndex++;
        }

        const newRow = filteredData[newRowIndex];
        const newFieldKey = editableFields[newColIndex];
        const fieldValue =
          newRow[newFieldKey as keyof unregisteredOwners] || "";

        setSelectedCell({
          rowId: newRow._id,
          field: columns[newColIndex + 1]?.label?.toString() || newFieldKey,
          value: String(fieldValue),
          rowIndex: newRowIndex,
          colIndex: newColIndex,
        });
        setSelectedRow(newRow._id);
      }
    };

   


    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRow, selectedCell, tableData, sortedData]);

 useEffect(() => {
  if (selectedCell) {
    const cellKey = `${selectedCell.rowId}-${selectedCell.colIndex}`;
    const cellElement = cellRefs.current.get(cellKey);
    
    if (cellElement) {
      cellElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }
}, [selectedCell]);

  const handlePetStatus = (petId: string | undefined, index: number) => {
    if (!petId) return;

    const newPetStatus = [...petStatus];
    const newMessage = newPetStatus[index];

    if (newPetStatus[index] === "None") {
      newPetStatus[index] = "Allowed";
      tableData[index].petStatus = "Allowed";
    } else if (newPetStatus[index] === "Allowed") {
      newPetStatus[index] = "Not Allowed";
      tableData[index].petStatus = "Not Allowed";
    } else {
      newPetStatus[index] = "None";
      tableData[index].petStatus = "None";
    }

    setPetStatus(newPetStatus);
    changePetStatus(petId, newPetStatus[index]);
  };

  const changePetStatus = React.useCallback(
    debounce(async (petId: string, status: string) => {
      const response = await axios.post(
        "/api/unregisteredOwners/updatePetStatus",
        {
          petId,
          changedStatus: status,
        }
      );
    }, 1000),
    []
  );





  


  const handleFormulaBarChange = async (newValue: string) => {
    if (!selectedCell) return;

  
    const item = tableData.find(row => row._id === selectedCell.rowId);
    if (!item) return;

    const fieldMap: Record<string, keyof unregisteredOwners> = {
      "Name": "name",
      "Phone": "phoneNumber",
      "Location": "location",
      "Price": "price",
      "Area": "area",
      "Availability": "availability",
      "Interior Status": "interiorStatus",
      "Pet Status": "petStatus",
      "Property Type": "propertyType",
      "Address": "address",
      "Ref Link": "referenceLink",
      "VS Link": "link",
      "VSID": "VSID",
      "Remarks": "remarks"
    };

    const fieldKey = fieldMap[selectedCell.field];
    if (fieldKey) {
      await handleSave(selectedCell.rowId, fieldKey, newValue);
      setSelectedCell({ ...selectedCell, value: newValue });
    }
  };

  return (
    <div className="space-y-4">
      {/* <Button
          variant="outline"
          onClick={() =>
            setFilterMode((prevMode) => ((prevMode + 1) % 3) as 0 | 1 | 2)
          }
        >
          {filterMode === 0 && "Show Filter Options"}
          {filterMode === 1 && "Show Missing Everything"}
          {filterMode === 2 && "Show All"}
        </Button> */}

      <div className="border-l border-r  overflow-hidden flex flex-col h-[calc(100vh-200px)] bg-background">
        <SpreadsheetFormulaBar
          selectedCell={selectedCell}
          onAddRow={handleAddRow}
          onCellValueChange={handleFormulaBarChange}

        />

          <SpreadsheetHeader
          columns={columns}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />

        <div className="overflow-auto flex-1 relative">
          <div className="min-w-full">
            {applyFilter(sortedData).map(
              (item: unregisteredOwners, index: number) => (
                <div
                  key={item?._id}
                  onClick={() => setSelectedRow(item._id)}
                  className={`flex cursor-pointer hover:bg-accent/50 border-b border-border ${
                    selectedRow === item._id ? "bg-accent" : ""
                  } ${
                    (!item.VSID || item.VSID.trim() === "") &&
                    (!item.link || item.link.trim() === "") &&
                    (!item.referenceLink || item.referenceLink.trim() === "") &&
                    (!item.imageUrls || item.imageUrls.length === 0)
                      ? "bg-red-100 dark:bg-red-700/30"
                      : (!item.VSID || item.VSID.trim() === "") &&
                        (!item.link || item.link.trim() === "")
                      ? "bg-blue-100 dark:bg-blue-700/30"
                      : ""
                  }`}
                >
                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-2`, el);
                    }}
                    className={`${
                      columnWidths.serial
                    } font-medium flex items-center gap-1 px-3 py-2 h-10 whitespace-nowrap border-r border-border flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === -1
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "S.No",
                        value: String(serialOffset + index + 1),
                        rowIndex: index,
                        colIndex: -1,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    {serialOffset + index + 1}

                    {token?.role === "Advert" && (
                      <span
                        className="cursor-pointer"
                        onClick={() => handleResponseStatus(item?._id, index)}
                      >
                        {item?.isVerified === "Verified" ? (
                          <CustomTooltip
                            icon={<CheckCheck color="green" size={14} />}
                            desc="Verified"
                          />
                        ) : (
                          <CustomTooltip
                            icon={
                              <CircleDot
                                className="text-muted-foreground"
                                size={14}
                              />
                            }
                            desc="None"
                          />
                        )}
                      </span>
                    )}

                    {(token?.role === "Sales" ||
                      token?.role === "Sales-TeamLead" ||
                      token?.role === "SuperAdmin") && (
                      <span
                        className="cursor-pointer"
                        onClick={() => handleImportantStatus(item?._id, index)}
                      >
                        {item?.isImportant === "Important" ? (
                          <CustomTooltip
                            icon={
                              <Star color="yellow" fill="yellow" size={14} />
                            }
                            desc="Important"
                          />
                        ) : (
                          <CustomTooltip
                            icon={
                              <CircleDot
                                className="text-muted-foreground"
                                size={14}
                              />
                            }
                            desc="None"
                          />
                        )}
                      </span>
                    )}

                    {(token?.role === "Sales" ||
                      token?.role === "Sales-TeamLead" ||
                      token?.role === "SuperAdmin") && (
                      <span
                        className="cursor-pointer"
                        onClick={() => handlePinnedStatus(item?._id, index)}
                      >
                        {item?.isPinned === "Pinned" ? (
                          <CustomTooltip
                            icon={<Pin color="red" fill="red" size={14} />}
                            desc="Pinned"
                          />
                        ) : (
                          <CustomTooltip
                            icon={
                              <CircleDot
                                className="text-muted-foreground"
                                size={14}
                              />
                            }
                            desc="None"
                          />
                        )}
                      </span>
                    )}
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-0`, el);
                    }}
                    className={`${
                      columnWidths.name
                    } font-medium px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 0
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Name",
                        value: item.name,
                        rowIndex: index,
                        colIndex: 0,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <div className="truncate">
                      <EditableCell
                        value={item.name}
                        onSave={(newValue) =>
                          handleSave(item?._id, "name", newValue)
                        }
                        disableDigits={true}
                        maxWidth="150px"
                      />
                    </div>
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-1`, el);
                    }}
                    className={`${
                      columnWidths.phone
                    } px-3 py-2 h-10 whitespace-nowrap border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 1
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Phone",
                        value: item?.phoneNumber?.toString() || "",
                        rowIndex: index,
                        colIndex: 1,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <EditableCopyCell
                      value={item?.phoneNumber?.toString()}
                      onSave={(newValue) =>
                        handleSave(item._id, "phoneNumber", newValue)
                      }
                    />

                    <Link
                    href={`https://wa.me/${item?.phoneNumber}?text=Hi%20${item?.name}%2C%20my%20name%20is%20${token?.name}%2C%20and%20how%20are%20you%20doing%3F`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {(item?.phoneNumber &&<FaWhatsapp
                      className=" cursor-pointer  text-green-500"
                      size={22}
                      onClick={() => {
                        // if (query.isViewed === false) {
                        //   IsView(query?._id, index);
                        // }
                      }}
                    />)}
                  </Link>
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-2`, el);
                    }}
                    className={`${
                      columnWidths.location
                    } px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 2
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    title={item.location}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Location",
                        value: item.location,
                        rowIndex: index,
                        colIndex: 2,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <SelectableCell
                      maxWidth="100px"
                      value={item.location}
                      data={targets.map((target) => target.city)}
                      save={(newValue: string) =>
                        handleSave(item._id, "location", newValue)
                      }
                    />
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-3`, el);
                    }}
                    className={`${
                      columnWidths.price
                    } px-3 py-2 h-10 whitespace-nowrap border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 3
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Price",
                        value: item.price,
                        rowIndex: index,
                        colIndex: 3,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <EditableCell
                      maxWidth="70px"
                      value={item.price}
                      onSave={(newValue) =>
                        handleSave(item._id, "price", newValue)
                      }
                    />
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-4`, el);
                    }}
                    className={`${
                      columnWidths.area
                    } px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 4
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Area",
                        value: item.area || "",
                        rowIndex: index,
                        colIndex: 4,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <AreaSelect
                      maxWidth="100px"
                      data={(
                        targets.find((t) => t.city === item.location)?.areas ||
                        []
                      )
                        .map((a) => ({
                          label: a.name,
                          value: a.name,
                        }))
                        .sort((a, b) => a.label.localeCompare(b.label))}
                      value={item.area || ""}
                      save={(newValue: string) =>
                        handleSave(item._id, "area", newValue)
                      }
                      tooltipText="Select an area"
                    />
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-5`, el);
                    }}
                    className={`${
                      columnWidths.availability
                    } px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 5
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Availability",
                        value: item.availability,
                        rowIndex: index,
                        colIndex: 5,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <SelectableCell
                      maxWidth="100px"
                      data={avail}
                      value={item.availability}
                      save={(newValue: string) =>
                        handleSave(item._id, "availability", newValue)
                      }
                    />
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-6`, el);
                    }}
                    className={`${
                      columnWidths.interiorStatus
                    } px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 6
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Interior Status",
                        value: item.interiorStatus,
                        rowIndex: index,
                        colIndex: 6,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <SelectableCell
                      maxWidth="200px"
                      data={interiorStatus}
                      value={item.interiorStatus}
                      save={(newValue: string) =>
                        handleSave(item._id, "interiorStatus", newValue)
                      }
                    />
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-7`, el);
                    }}
                    className={`${
                      columnWidths.petStatus
                    } cursor-pointer px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 7
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    onClick={(e) => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Pet Status",
                        value: item.petStatus || "None",
                        rowIndex: index,
                        colIndex: 7,
                      });
                      setSelectedRow(item._id);
                      handlePetStatus(item?._id, index);
                    }}
                  >
                    {item.petStatus === "Allowed" ? (
                      <CustomTooltip
                        icon={<PawPrint color="green" size={14} />}
                        desc="First Message"
                      />
                    ) : item.petStatus === "Not Allowed" ? (
                      <CustomTooltip
                        icon={<Ban color="yellow" size={14} />}
                        desc="Second Message"
                      />
                    ) : (
                      <CustomTooltip
                        icon={<CircleDot fill="" color="gray" size={14} />}
                        desc="No Status"
                      />
                    )}
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-8`, el);
                    }}
                    className={`${
                      columnWidths.propertyType
                    } px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 8
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Property Type",
                        value: item.propertyType,
                        rowIndex: index,
                        colIndex: 8,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <div
                      className={`rounded-md  w-full ${getPropertyTypeColor(
                        item.propertyType
                      )}`}
                    >
                      <SelectableCell
                        maxWidth="200px"
                        data={apartmentTypes}
                        value={item.propertyType}
                        save={(newValue: string) =>
                          handleSave(item._id, "propertyType", newValue)
                        }
                      />
                    </div>
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-9`, el);
                    }}
                    className={`${
                      columnWidths.remarks
                    } px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 9
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    title={item.remarks}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Remarks",
                        value: item.remarks,
                        rowIndex: index,
                        colIndex: 9,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    {/* <RemarksDropdown item={item} onSave={handleSave} /> */}
                    <EditableCell
                      value={item.remarks}
                      onSave={(newValue) =>
                        handleSave(item._id, "remarks", newValue)
                      }
                      maxWidth="160px"
                    />
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-10`, el);
                    }}
                    className={`${
                      columnWidths.refLink
                    } px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 10
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    title={item.referenceLink}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Ref Link",
                        value: item.referenceLink,
                        rowIndex: index,
                        colIndex: 10,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <div className="flex items-center gap-1 w-full">
                      <EditableCell
                        value={item.referenceLink}
                        onSave={(newValue) =>
                          handleSave(item._id, "referenceLink", newValue)
                        }
                        maxWidth="60px"
                      />
                      {item.referenceLink && item.referenceLink !== "-" && (
                        <a
                          href={
                            item.referenceLink.startsWith("http")
                              ? item.referenceLink
                              : `https://${item.referenceLink}`
                          }
                          target="_blank"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          rel="noreferrer"
                          title="Open reference link in new tab"
                        >
                          🔗
                        </a>
                      )}
                    </div>
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-11`, el);
                    }}
                    className={`${
                      columnWidths.vsLink
                    } px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 11
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    title={item.link}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "VS Link",
                        value: item.link,
                        rowIndex: index,
                        colIndex: 11,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <div className="flex items-center gap-1 w-full">
                      {["Advert", "SuperAdmin"].includes(token?.role) ? (
                        <EditableCell
                          value={item.link}
                          onSave={(newValue) =>
                            handleSave(item._id, "link", newValue)
                          }
                          maxWidth="60px"
                        />
                      ) : (
                        <span className="truncate block">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-6 p-0"
                            onClick={() =>
                              navigator.clipboard.writeText(item.link)
                            }
                          >
                            <Copy size={14} />
                          </Button>
                        </span>
                      )}
                      {item.link && item.link !== "-" && (
                        <a
                          href={
                            item.link.startsWith("http")
                              ? item.link
                              : `https://${item.link}`
                          }
                          target="_blank"
                          className="text-blue-500 hover:text-blue-700"
                          rel="noreferrer"
                          title="Open link in new tab"
                        >
                          🔗
                        </a>
                      )}
                    </div>
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-12`, el);
                    }}
                    className={`${
                      columnWidths.vsid
                    } font-medium px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 12
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "VSID",
                        value: item.VSID,
                        rowIndex: index,
                        colIndex: 12,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    {["Advert", "SuperAdmin"].includes(token?.role) ? (
                      <EditableCell
                        value={item.VSID}
                        onSave={(newValue) =>
                          handleSave(item?._id, "VSID", newValue)
                        }
                        maxWidth="150px"
                      />
                    ) : (
                      <span className="truncate block max-w-[150px]">
                        {item.VSID}
                      </span>
                    )}
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-13`, el);
                    }}
                    className={`${
                      columnWidths.address
                    } px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 13
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    title={item.address}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Address",
                        value: item.address,
                        rowIndex: index,
                        colIndex: 13,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <EditableCell
                      maxWidth="200px"
                      value={item.address}
                      onSave={(newValue) =>
                        handleSave(item._id, "address", newValue)
                      }
                    />
                  </div>

                  <div
                    className={`${columnWidths.actions} px-3 py-2 h-10 whitespace-nowrap flex items-center flex-shrink-0`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ActionMenu
                      item={item}
                      onUploadComplete={(id, newUrls) => {
                        setTableData((prev) =>
                          prev.map((row) =>
                            row._id === id
                              ? { ...row, imageUrls: newUrls }
                              : row
                          )
                        );
                      }}
                    />
                  </div>
                </div>
              )
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
