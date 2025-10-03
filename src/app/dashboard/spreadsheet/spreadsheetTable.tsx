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
import {
  Ban,
  Calendar,
  Check,
  CheckCheck,
  CircleDot,
  Copy,
  Download,
  ImageUp,
  Mail,
  MailCheck,
  PawPrint,
  Phone,
  Plus,
  Upload,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { EditableCell } from "./EditableCell";
import axios from "axios";
import type { unregisteredOwners } from "@/util/type";
import { SelectableCell } from "./SelectableCell";
import { useCallback, useEffect, useRef, useState } from "react";
import { CopyCell } from "@/components/Copy";
import { EditableCopyCell } from "./EditableCopyCell";
import { get } from "http";
import toast from "react-hot-toast";
import CustomTooltip from "@/components/CustomToolTip";
import { table } from "console";


import debounce from "lodash.debounce";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { AreaSelect } from "@/components/leadTableSearch/page";
import { useAuthStore } from "@/AuthStore";
import { CiTextAlignCenter } from "react-icons/ci";

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
export function SpreadsheetTable({
  tableData,
  setTableData,
}: {
  tableData: unregisteredOwners[];
  setTableData: React.Dispatch<React.SetStateAction<unregisteredOwners[]>>;
}) {
  const columns = [
    { label: "S.No", field: "serial", sortable: false },
    { label: "Name", field: "name", sortable: true },
    { label: <Phone size={16} />, field: "phoneNumber", sortable: false },
    { label: "Location", field: "location", sortable: true },
    { label: "Price", field: "price", sortable: true },
    { label: "Area", field: "area", sortable: false },
    { label: "Avail.", field: "availability", sortable: true },
    { label: "Int. Status", field: "intStatus", sortable: false },
    { label: "Pet. Status", field: "petStatus", sortable: false },
    { label: "Property Type", field: "propertyType", sortable: false },
    { label: "Address", field: "address", sortable: false },
    { label: "Ref. Link", field: "refLink", sortable: false },
    { label: "VsLink", field: "link", sortable: false },
    { label: "VSID", field: "vsid", sortable: false },
    { label: "Remarks", field: "remarks", sortable: false },
    { label: "Date", field: "date", sortable: true },
    { label: "Up/Down", field: "upload", sortable: false },
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

  const [targets, setTargets] = useState<TargetType[]>([]);

  const [areas, setAreas] = useState<AreaType[]>([]);
  const [sortedData, setSortedData] = useState<unregisteredOwners[]>([]);
  const [sortBy, setSortBy] = useState<keyof unregisteredOwners | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [locationws, setLocationws] = useState<string[]>([]);
  const [cityAreas, setCityAreas] = useState<Record<string, string[]>>({});
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [petStatus, setPetStatus] = useState<
    ("Allowed" | "Not Allowed" | "None")[]
  >(Array.from({ length: tableData?.length }, () => "None"));
  const [filterMode, setFilterMode] = useState<0 | 1 | 2>(0);
  // 0 = default, 1 = refLink/images, 2 = missing everything

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

  const token = useAuthStore((state: any) => state.token);
  console.log("token: ", token);

  const handleResponseStatus = async (id: string, index: number) => {
    const newStatus =
      tableData[index].isVerified === "Verified" ? "None" : "Verified";

    // Optimistic UI update
    const updatedData = [...tableData];
    updatedData[index].isVerified = newStatus;
    setTableData(updatedData);

    try {
      await axios.put(`/api/unregisteredOwners/updateData/${id}`, {
        field: "responseStatus",
        value: newStatus,
      });
    } catch (error) {
      console.error("Response status update failed", error);
      // Rollback if error
      updatedData[index].isVerified = tableData[index].isVerified;
      setTableData(updatedData);
    }
  };

  const applyFilter = (data: unregisteredOwners[]) => {
    if (filterMode === 1) {
      return data.filter(
        (item) =>
          ((item.referenceLink && item.referenceLink.trim() !== "") ||
          (item.imageUrls && item.imageUrls.length > 0)) && (
            !item.VSID ||item.VSID.trim() === "" &&
            !item.link || item.link.trim() === ""
          )
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

    return data; // filterMode === 0 → default
  };
  

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
        console.log(
          "fetched Locations that has been selected in get allocations",
          locationws
        );

        // make city → area mapping (just area names)
        const cityAreaMap: Record<string, string[]> = {};
        res.data.data.forEach((loc: any) => {
          cityAreaMap[loc.city] = (loc.area || []).map(
            (a: any) => a.name // extract only name
          );
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
        // const data = await res.json();
        setTargets(res.data.data);
        console.log("targets: ", res.data.data);
      } catch (error) {
        console.error("Error fetching targets:", error);
      }
    };
    fetchTargets();

    // getAllLocations();
  }, []);

  //     useEffect(() => {
  //   const target = targets.find((t) => t.city === unregisteredOwners.location);
  //   if (target) {
  //     setAreas(target.areas);
  //   } else {
  //     setAreas([]);
  //   }
  //   setFilters((prev) => ({ ...prev, area: "" })); // Clear old area
  // }, [selectedLocation, targets]);

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

      // console.log("Backend response:", savedRow);
      // console.log("Temp ID to replace:", tempId);

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
      // console.log("Rolling back optimistic update for tempId:", tempId);
      setTableData((prev) => {
        const rolledBack = prev.filter((row) => row._id !== tempId);
        // console.log("Rollback complete, remaining rows:", rolledBack.length);
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
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Delete" && selectedRow) {
        setTableData((prev) => prev.filter((row) => row._id !== selectedRow));
        setSelectedRow(null);
        console.log("Deleted row with ID:", selectedRow);
        const res = await axios.delete(
          `/api/unregisteredOwners/updateData/${selectedRow}`
        );
        if (res.status === 200) {
          toast(
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Lead deleted successfully
            </div>
          );
        } else {
          toast(
            <div className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Error deleting lead
            </div>
          );
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRow]);

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

  const changePetStatus = useCallback(
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

  interface dateCellProps {
    item: unregisteredOwners;
    handleSave: (
      id: string,
      field: keyof unregisteredOwners,
      value: string
    ) => void;
  }
  function DateCell({ item, handleSave }: dateCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const date = new Date(item.date);
    const isValidDate = !isNaN(date.getTime());

    return (
      <>
        {isEditing || isValidDate ? (
          <EditableCell
            maxWidth="80px"
            value={isValidDate ? date.toLocaleDateString("en-US") : ""}
            onSave={(newValue) => {
              handleSave(item._id, "date", newValue);
              setIsEditing(false);
            }}
            type="date"
          />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="p-0"
            onClick={() => setIsEditing(true)}
          >
            <Calendar className="h-5 w-5 text-gray-500" />
          </Button>
        )}
      </>
    );
  }

  interface UploadCellProps {
    item: unregisteredOwners;
  }

  interface RemarksDropdownProps {
    item: unregisteredOwners;
    onSave: (
      id: string,
      field: keyof unregisteredOwners,
      value: string
    ) => void;
  }

  function UploadCell({ item }: UploadCellProps) {
    const { uploadFiles, loading } = useBunnyUpload();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploaded, setUploaded] = useState(
      !!(item.imageUrls && item.imageUrls.length > 0)
    );

    const handleFileChange = async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const files = event.target.files;
      if (!files) return;

      const fileArray = Array.from(files);
      const { imageUrls, error } = await uploadFiles(fileArray, "Uploads");

      if (error) {
        alert(error);
        return;
      }

      // Save uploaded URLs to your table row (uploadLink or any field)

      if (imageUrls.length > 0) {
        try {
          await axios.put(`/api/unregisteredOwners/updateData/${item._id}`, {
            field: "imageUrls",
            value: imageUrls,
          });

          setUploaded(true);
        } catch (err) {
          console.error("Failed to update images:", err);
        }
      }
      // Reset input so selecting same file works next time
      event.target.value = "";
    };
    const hasImages = item.imageUrls && item.imageUrls.length > 0;

    return (
      <>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
        />
        <Button
          variant="ghost"
          size="icon"
          className="p-0"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageUp
            className={`h-5 w-5 ${
              uploaded ? "text-green-500" : "text-gray-500"
            }`}
          />
        </Button>
      </>
    );
  }

  function DownloadCell({ item }: { item: unregisteredOwners }) {
    const handleDownloadZip = async () => {
      if (!item.imageUrls || item.imageUrls.length === 0) {
        alert("No images to download");
        return;
      }

      const zip = new JSZip();

      // Fetch and add each image to the zip
      for (let i = 0; i < item.imageUrls.length; i++) {
        const url = item.imageUrls[i];
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const filename = url.split("/").pop() || `image-${i + 1}.jpg`;
          zip.file(filename, blob);
        } catch (err) {
          console.error(`Failed to fetch ${url}`, err);
        }
      }

      // Generate and trigger download
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${item.name || "images"}.zip`);
    };

    return (
      <Button
        variant="ghost"
        size="icon"
        className="p-0"
        onClick={handleDownloadZip}
      >
        <Download className="h-5 w-5 text-gray-500" />
      </Button>
    );
  }

  function RemarksDropdown({ item, onSave }: RemarksDropdownProps) {
    // Ensure remarks is always an array
    const initialRemarks = item.remarks ? item.remarks.split("\n") : [];

    const [remarks, setRemarks] = useState<string[]>(initialRemarks);
    const [newRemark, setNewRemark] = useState("");

    const handleAddRemark = () => {
      if (!newRemark.trim()) return;
      const updatedRemarks = [...remarks, newRemark];
      setRemarks(updatedRemarks);
      onSave(item._id, "remarks", updatedRemarks.join("\n"));
      setNewRemark("");
    };

    const handleDeleteRemark = (index: number) => {
      const updatedRemarks = remarks.filter((_, i) => i !== index);
      setRemarks(updatedRemarks);
      onSave(item._id, "remarks", updatedRemarks.join("\n"));
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="truncate max-w-[120px] text-xs"
            title={remarks.join(", ")}
          >
            {/* {remarks.length > 0
              ? `${remarks[remarks.length - 1]}`
              : "Add Remark"} */}
            <CiTextAlignCenter />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-74 p-3 space-y-3">
          <div className="space-y-2 max-h-54 overflow-y-auto">
            <p className="text-sm font-medium">Previous Remarks:</p>
            {remarks.length > 0 ? (
              remarks.map((remark, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm bg-gray-800 p-2 rounded-md"
                >
                  <span className="break-words">{remark}</span>
                  <button
                    className="ml-2 text-red-500 hover:text-red-700"
                    onClick={() => handleDeleteRemark(index)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No remarks yet</p>
            )}
          </div>

          <Separator />

          <div className="flex gap-2">
            <Input
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              placeholder="Add a remark"
              className="text-sm"
            />
            <Button size="sm" onClick={handleAddRemark}>
              Save
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

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
        <Button
          variant="outline"
          onClick={() =>
            setFilterMode((prevMode) => ((prevMode + 1) % 3) as 0 | 1 | 2)
          }
        >
          {filterMode === 0 && "Show Filter Options"}
          {filterMode === 1 && "Show Missing Everything"}
          {filterMode === 2 && "Show All"}
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
          {applyFilter(sortedData).map(
            (item: unregisteredOwners, index: number) => (
              <TableRow
                key={item?._id}
                onClick={() => setSelectedRow(item._id)}
                className={`cursor-pointer ${
                  selectedRow === item._id ? "bg-gray-900" : ""
                } ${
                  (!item.VSID || item.VSID.trim() === "") &&
                  (!item.link || item.link.trim() === "") &&
                  (!item.referenceLink || item.referenceLink.trim() === "") &&
                  (!item.imageUrls || item.imageUrls.length === 0)
                    ? "bg-red-900 opacity-80" // red if all three are missing
                    : (!item.VSID || item.VSID.trim() === "") &&
                      (!item.link || item.link.trim() === "")
                    ? "bg-blue-800 opacity-90" // blue if VSID & link missing
                    : ""
                }`}
              >
                <TableCell className="font-medium flex items-center gap-2">
                  {index + 1}

                  {(token?.role === "Sales" ||
                    token?.role === "Sales-TeamLead" ||
                    token?.role === "SuperAdmin" ||
                    token?.role === "Advert") && (
                    <span
                      className="cursor-pointer"
                      onClick={() => handleResponseStatus(item?._id, index)}
                    >
                      {item?.isVerified === "Verified" ? (
                        <CustomTooltip
                          icon={<CheckCheck color="green" />}
                          desc="Verified"
                        />
                      ) : (
                        <CustomTooltip
                          icon={<CircleDot color="gray" />}
                          desc="None"
                        />
                      )}
                    </span>
                  )}
                </TableCell>

                {/*VSID*/}

                {/* Name */}
                <TableCell className="font-medium truncate max-w-[150px]">
                  <EditableCell
                    value={item.name}
                    onSave={(newValue) =>
                      handleSave(item?._id, "name", newValue)
                    }
                    maxWidth="150px"
                    // placeholder="Enter name"
                  />
                </TableCell>

                {/* Phone Number */}
                <TableCell>
                  <EditableCopyCell
                    value={item?.phoneNumber?.toString()}
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
                    data={targets.map((target) => target.city)}
                    save={(newValue: string) =>
                      handleSave(item._id, "location", newValue)
                    }
                  />
                </TableCell>

                {/* Price */}

                <TableCell>
                  <EditableCell
                    maxWidth="70px"
                    value={item.price}
                    onSave={(newValue) =>
                      handleSave(item._id, "price", newValue)
                    }
                    // placeholder="Price"
                  />
                </TableCell>

                <TableCell>
                  <AreaSelect
                    maxWidth="100px"
                    data={(
                      targets.find((t) => t.city === item.location)?.areas || []
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
                </TableCell>

                <TableCell>
                  <SelectableCell
                    maxWidth="100px"
                    data={avail}
                    value={item.availability}
                    save={(newValue: string) =>
                      handleSave(item._id, "availability", newValue)
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

                <TableCell
                  className=" cursor-pointer relative "
                  onClick={() => handlePetStatus(item?._id, index)}
                >
                  {/* {query?.reminder === null && (
                    <div className=" h-[70px] w-4 absolute top-0 left-0 bg-gradient-to-t from-[#0f2027] via-[#203a43] to-[#2c5364]">
                    <p className=" rotate-90 text-xs font-semibold mt-1">
                    Reminder
                    </p>
                    </div>
                    )} */}
                  {item.petStatus === "Allowed" ? (
                    <CustomTooltip
                      icon={<PawPrint color="green" />}
                      desc="First Message"
                    />
                  ) : item.petStatus === "Not Allowed" ? (
                    <CustomTooltip
                      icon={<Ban color="yellow" />}
                      desc="Second Message"
                    />
                  ) : (
                    <CustomTooltip
                      icon={<CircleDot fill="" color="gray" />}
                      desc="No Status"
                    />
                  )}
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
                {/* Link */}
                <TableCell
                  className="text-right truncate max-w-[60px]"
                  title={item.link}
                >
                  <div className="flex items-center gap-1">
                    {["Advert", "SuperAdmin"].includes(token?.role) ? (
                      <EditableCell
                        value={item.link}
                        onSave={(newValue) =>
                          handleSave(item._id, "link", newValue)
                        }
                        maxWidth="60px"
                      />
                    ) : (
                      <span className="truncate block max-w-[60px]">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-1 text-xs"
                          onClick={() =>
                            navigator.clipboard.writeText(item.link)
                          }
                        >
                          <Copy />
                        </Button>
                      </span>
                    )}
                  </div>

                  {/* 🔗 Open link button (for all roles) */}
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

                {/* VSID */}
                <TableCell className="font-medium truncate max-w-[150px]">
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
                </TableCell>
                {/* Remarks */}
                <TableCell
                  className="text-right truncate max-w-[120px]"
                  title={item.remarks}
                >
                  {/* <EditableCell
                  value={item.remarks}
                  onSave={(newValue) =>
                    handleSave(item._id, "remarks", newValue)
                  }
                  maxWidth="120px"
                  // placeholder="Remarks"
                /> */}
                  <RemarksDropdown item={item} onSave={handleSave} />
                </TableCell>
                {/*Date*/}
                <TableCell>
                  <DateCell item={item} handleSave={handleSave} />
                </TableCell>

                {/*Download*/}
                <TableCell>
                  <UploadCell item={item} />
                  <DownloadCell item={item} />
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </div>
  );
}
