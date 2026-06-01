"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { debounce } from "lodash";
import CustomTooltip from "@/components/CustomToolTip";
import { Button } from "@/components/ui/button";
import {
  Ban,
  BadgeCheck,
  CheckCheck,
  CircleDot,
  Copy,
  MapPin,
  PawPrint,
  Phone,
  Pin,
  Plus,
  Star, 

} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { EditableCell } from "./components/cells/EditableCell";
import { EditableCopyCell } from "./components/cells/EditableCopyCell";
import { SelectableCell } from "./components/cells/SelectableCell";
import axios from "@/util/axios";
import type { unregisteredOwners } from "@/util/type";
import { AreaSelect } from "@/components/leadTableSearch/page";
import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";
import { FaWhatsapp } from "react-icons/fa6";
import { UploadCell } from "./components/cells/UploadCell";
import { DownloadCell } from "./components/cells/DownloadCell";
import { ActionMenu } from "./components/table/ActionMenu";
import { SpreadsheetFormulaBar } from "./components/table/SpreadsheetFormulaBar";
import { SpreadsheetHeader } from "./components/table/SpreadsheetHeader";
import { formatPhoneNumber } from "./utils/formatters";
import { normalizeOwnerPhoneInput } from "./utils/ownerPhoneNormalize";
import { buildOwnerSheetWhatsAppUrl } from "./utils/ownerWhatsAppLink";
import {
  filterOwnerSheetTargetCities,
  parseAllotedAreaForClient,
  resolveDefaultOwnerRowLocation,
} from "@/util/ownerSheetLocationFilter";
import { Switch } from "@/components/ui/switch";
import {
  ownerPropertyFloorFromSelectValue,
  ownerPropertyFloorSelectOptions,
  ownerPropertyFloorToSelectValue,
} from "./constants/ownerSheetFields";
import {
  getOwnerRowToneClasses,
  getStickyRightOffsetPx,
  getVisibleStickyRightFields,
  isStickyRightField,
  STICKY_RIGHT_SHADOW,
  type StickyRightField,
} from "./utils/rowTone";

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

// Small screens
const smallColumnWidths = {
  serial: "w-[70px] min-w-[70px] max-w-[70px]",
  name: "w-[140px] min-w-[140px] max-w-[140px]",
  phone: "w-[90px] min-w-[90px] max-w-[90px]",
  location: "w-[100px] min-w-[100px] max-w-[100px]",
  price: "w-[95px] min-w-[95px] max-w-[95px]",
  area: "w-[110px] min-w-[110px] max-w-[110px]",
  availability: "w-[60px] min-w-[60px] max-w-[60px]",
  interiorStatus: "w-[70px] min-w-[70px] max-w-[70px]",
  petStatus: "w-[70px] min-w-[70px] max-w-[70px]",
  propertyType: "w-[130px] min-w-[130px] max-w-[130px]",
  remarks: "w-[150px] min-w-[150px] max-w-[150px]",
  refLink: "w-[120px] min-w-[120px] max-w-[120px]",
  vsLink: "w-[120px] min-w-[120px] max-w-[120px]",
  vsid: "w-[100px] min-w-[100px] max-w-[100px]",
  address: "w-[160px] min-w-[160px] max-w-[160px]",
  geoVerified: "w-[88px] min-w-[88px] max-w-[88px]",
  propertyFloor: "w-[72px] min-w-[72px] max-w-[72px]",
  distance: "w-[140px] min-w-[140px] max-w-[140px]",
  actions: "w-[50px] min-w-[50px] max-w-[50px]",
};

// Large screens  
const largeColumnWidths = {
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
  geoVerified: "w-[100px] min-w-[100px] max-w-[100px]",
  propertyFloor: "w-[88px] min-w-[88px] max-w-[88px]",
  distance: "w-[150px] min-w-[150px] max-w-[150px]",
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

function getStickyCellProps(
  field: string,
  rowTone: string,
  isLargeScreen: boolean,
  visibleStickyFields: readonly StickyRightField[],
): { className: string; style?: React.CSSProperties } {
  const offset = getStickyRightOffsetPx(
    field,
    isLargeScreen,
    visibleStickyFields,
  );
  if (offset === null || !isStickyRightField(field)) {
    return { className: rowTone };
  }
  return {
    className: `${rowTone} sticky z-10 ${STICKY_RIGHT_SHADOW}`,
    style: { right: offset },
  };
}

export function SpreadsheetTable({
  tableData,
  setTableData,
  serialOffset,
  hiddenColumns = [],
  focusRowId = null,
  onAvailabilityChange,
  extraColumnLabel,
  extraColumnRender,
  filterPlace = [],
}: {
  tableData: unregisteredOwners[];
  setTableData: React.Dispatch<React.SetStateAction<unregisteredOwners[]>>;
  serialOffset: number;
  hiddenColumns?: string[];
  focusRowId?: string | null;
  onAvailabilityChange?: () => void;
  extraColumnLabel?: string;
  extraColumnRender?: (owner: unregisteredOwners) => React.ReactNode;
  /** Active city filter from FilterBar — used as default location for new rows. */
  filterPlace?: string[];
}): ReactElement {

  const [isLargeScreen, setIsLargeScreen] = useState(true);

useEffect(() => {
  const handleResize = () => {
    // ✅ Treat 1440px and below (MacBook Air or smaller) as "small"
    setIsLargeScreen(window.innerWidth > 1629);
  };

  handleResize(); // Run once on mount
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

const columnWidths = isLargeScreen ? largeColumnWidths : smallColumnWidths;

useEffect(() => {
  if (!focusRowId) return;
  setSelectedRow(focusRowId);
  const root = tableBodyRef.current;
  if (!root) return;
  const rowEl = root.querySelector(`[data-owner-row-id="${focusRowId}"]`) as HTMLElement | null;
  if (rowEl) {
    rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}, [focusRowId, tableData]);


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
      label: (
        <span
          className="inline-flex items-center gap-0.5"
          title="Address verified against geolocation"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Geo</span>
          <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
        </span>
      ),
      field: "geoAddressVerified",
      sortable: false,
      width: columnWidths.geoVerified,
    },
    {
      label: "Floor",
      field: "propertyFloor",
      sortable: false,
      width: columnWidths.propertyFloor,
    },
    ...(extraColumnLabel && extraColumnRender
      ? [
          {
            label: extraColumnLabel,
            field: "distance",
            sortable: false,
            width: columnWidths.distance,
          },
        ]
      : []),
    {
      label: "Actions",
      field: "upload",
      sortable: false,
      width: columnWidths.actions,
    },
  ].filter((column) => !hiddenColumns.includes(column.field));

  const visibleStickyFields = getVisibleStickyRightFields(
    columns.map((column) => column.field),
  );

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
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [unavailableUntilDate, setUnavailableUntilDate] = useState("");
  const [pendingAvailabilityChange, setPendingAvailabilityChange] = useState<{
    id: string;
    key: keyof unregisteredOwners;
    value: string;
  } | null>(null);

  const { toast } = useToast();

  const token = useAuthStore((state: any) => state.token);

  const openOwnerInWhatsApp = (
    e: React.MouseEvent,
    owner: unregisteredOwners,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const url = buildOwnerSheetWhatsAppUrl({
      phoneNumber: owner.phoneNumber,
      name: owner.name,
      location: owner.location,
    });
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

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

  const canToggleGeoVerified =
    token?.role === "Advert" || token?.role === "SuperAdmin";

  const handleGeoAddressVerified = async (id: string) => {
    if (!canToggleGeoVerified) return;
    const currentStatus =
      tableData.find((row) => row._id === id)?.geoAddressVerified ?? "None";
    const newStatus = currentStatus === "Verified" ? "None" : "Verified";

    setTableData((prev) =>
      prev.map((row) =>
        row._id === id ? { ...row, geoAddressVerified: newStatus } : row,
      ),
    );

    try {
      await axios.put(`/api/unregisteredOwners/updateData/${id}`, {
        field: "geoAddressVerified",
        value: newStatus,
      });

      toast({
        title: "Geo verification updated",
        description:
          newStatus === "Verified"
            ? "Marked as verified against geolocation."
            : "Geo verification cleared.",
        variant: "default",
      });
    } catch (error) {
      console.error("Geo verification update failed", error);

      setTableData((prev) =>
        prev.map((row) =>
          row._id === id ? { ...row, geoAddressVerified: currentStatus } : row,
        ),
      );

      toast({
        title: "Failed to update geo verification",
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

  const locationOptions = React.useMemo(
    () =>
      filterOwnerSheetTargetCities(
        targets,
        token?.allotedArea,
        token?.role ?? "",
      ).map((t) => t.city),
    [targets, token?.allotedArea, token?.role],
  );

  const handleAddRow = async () => {
    const defaultLocation = resolveDefaultOwnerRowLocation({
      role: token?.role ?? "",
      tokenAllotedArea: token?.allotedArea,
      filterPlace,
      targets,
    });

    if (!defaultLocation) {
      toast({
        title: "No allotted location",
        description:
          "Your account has no assigned cities. Contact an admin, or pick a location in the filter bar first.",
        variant: "destructive",
      });
      return;
    }

    const tempRow: Omit<unregisteredOwners, "_id"> = {
      VSID: "",
      name: "",
      phoneNumber: "",
      location: defaultLocation,
      price: "",
      interiorStatus: "Fully Furnished",
      petStatus: "None",
      propertyType: "Unknown",
      link: "",
      area: "",
      referenceLink: "",
      address: "",
      remarks: "",
      availability: "Available",
      unavailableUntil: null,
      date: new Date(),
      imageUrls: [],
      isVerified: "None",
      isImportant: "None",
      isPinned: "None",
      geoAddressVerified: "None",
      propertyFloor: "",
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

  const performSave = async (
    _id: string,
    key: keyof unregisteredOwners,
    newValue: string,
    unavailableUntilPayload?: string | null
  ) => {
    const valueToSave =
      key === "phoneNumber" ? normalizeOwnerPhoneInput(newValue) : newValue;

    const prev = tableData;
    const updatedData = tableData.map((item) =>
      item._id === _id
        ? {
            ...item,
            [key]: valueToSave,
            ...(key === "availability"
              ? { unavailableUntil: unavailableUntilPayload ?? item.unavailableUntil }
              : {}),
          }
        : item
    );
    setTableData(updatedData);

    try {
      await axios.put(`/api/unregisteredOwners/updateData/${_id}`, {
        field: key,
        value: valueToSave,
        unavailableUntil: unavailableUntilPayload,
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

  const handleSave = async (
    _id: string,
    key: keyof unregisteredOwners,
    newValue: string
  ) => {
    if (key === "availability" && newValue === "Not Available") {
      setPendingAvailabilityChange({ id: _id, key, value: newValue });
      setUnavailableUntilDate("");
      setAvailabilityDialogOpen(true);
      return;
    }

    const unavailableUntilPayload =
      key === "availability" && newValue === "Available" ? null : undefined;
    await performSave(_id, key, newValue, unavailableUntilPayload);
  };

  const handleConfirmUnavailableDate = async () => {
    if (!pendingAvailabilityChange) return;
    if (!unavailableUntilDate) {
      toast({
        title: "Date required",
        description: "Please select an unavailable-until date.",
        variant: "destructive",
      });
      return;
    }
    const parsedDate = new Date(unavailableUntilDate);
    if (Number.isNaN(parsedDate.getTime())) {
      toast({
        title: "Invalid date",
        description: "Please enter a valid date.",
        variant: "destructive",
      });
      return;
    }

    await performSave(
      pendingAvailabilityChange.id,
      pendingAvailabilityChange.key,
      pendingAvailabilityChange.value,
      parsedDate.toISOString(),
    );
    setAvailabilityDialogOpen(false);
    setPendingAvailabilityChange(null);
    setUnavailableUntilDate("");
  };

  const editableFields = [
    "name", "phoneNumber", "location", "price", "area", "availability",
    "interiorStatus", "petStatus", "propertyType", "remarks", 
    "referenceLink", "link", "VSID", "address", "geoAddressVerified", "propertyFloor",
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
          const rowData = `${row.name}\t${row.phoneNumber}\t${row.location}\t${row.price}\t${row.area}\t${row.availability}\t${row.interiorStatus}\t${row.petStatus}\t${row.propertyType}\t${row.remarks}\t${row.referenceLink}\t${row.link}\t${row.VSID}\t${row.address}\t${row.geoAddressVerified ?? "None"}\t${row.propertyFloor ?? ""}`;
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
      "Geo": "geoAddressVerified",
      "Floor": "propertyFloor",
      "Ref Link": "referenceLink",
      "VS Link": "link",
      "VSID": "VSID",
      "Remarks": "remarks"
    };

    const fieldKey = fieldMap[selectedCell.field];
    if (
      fieldKey === "geoAddressVerified" &&
      !(token?.role === "Advert" || token?.role === "SuperAdmin")
    ) {
      return;
    }
    if (fieldKey === "geoAddressVerified") {
      const normalized =
        newValue.trim().toLowerCase() === "verified" ? "Verified" : "None";
      await handleSave(selectedCell.rowId, fieldKey, normalized);
      setSelectedCell({ ...selectedCell, value: normalized });
      return;
    }
    if (fieldKey) {
      await handleSave(selectedCell.rowId, fieldKey, newValue);
      setSelectedCell({ ...selectedCell, value: newValue });
    }
  };

  return (
    <div className="space-y-4">
      <Dialog
        open={availabilityDialogOpen}
        onOpenChange={(open) => {
          setAvailabilityDialogOpen(open);
          if (!open) {
            setPendingAvailabilityChange(null);
            setUnavailableUntilDate("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set unavailable until</DialogTitle>
            <DialogDescription>
              Select the date when this lead should become available again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="date"
              value={unavailableUntilDate}
              onChange={(e) => setUnavailableUntilDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAvailabilityDialogOpen(false);
                setPendingAvailabilityChange(null);
                setUnavailableUntilDate("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmUnavailableDate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <div className="border-l border-r overflow-hidden flex flex-col h-[calc(100vh-200px)] bg-background">
        <SpreadsheetFormulaBar
          selectedCell={selectedCell}
          onAddRow={handleAddRow}
          onCellValueChange={handleFormulaBarChange}

        />

        <div className="overflow-auto flex-1 relative" ref={tableBodyRef}>
          <div className="w-max min-w-full">
            <SpreadsheetHeader
              columns={columns}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              isLargeScreen={isLargeScreen}
              visibleStickyFields={visibleStickyFields}
            />
            {applyFilter(sortedData).map(
              (item: unregisteredOwners, index: number) => {
                const rowTone = getOwnerRowToneClasses(item, selectedRow);
                const actionsSticky = getStickyCellProps(
                  "upload",
                  rowTone,
                  isLargeScreen,
                  visibleStickyFields,
                );

                return (
                <div
                  key={item?._id}
                  data-owner-row-id={item._id}
                  onClick={() => setSelectedRow(item._id)}
                  className={`flex w-max min-w-full cursor-pointer hover:bg-accent/50 border-b border-border ${rowTone}`}
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
                      token?.role === "sales-intern" ||
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
                      token?.role === "sales-intern" ||
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
                      allowOnlyNumbers={true}
                     
                    />

                    {item?.phoneNumber ? (
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center justify-center rounded p-0.5 hover:bg-muted/80"
                        title="Open in WhatsApp (owner)"
                        aria-label={`Open WhatsApp chat with ${item.name || "owner"}`}
                        onClick={(e) => openOwnerInWhatsApp(e, item)}
                      >
                        <FaWhatsapp className="cursor-pointer text-green-500" size={22} />
                      </button>
                    ) : null}
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
                      data={
                        locationOptions.length > 0
                          ? locationOptions
                          : targets.map((target) => target.city)
                      }
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
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-14`, el);
                    }}
                    className={`${
                      columnWidths.geoVerified
                    } px-2 py-2 h-10 border-r border-border flex items-center justify-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 14
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Geo",
                        value:
                          item.geoAddressVerified === "Verified"
                            ? "Verified"
                            : "None",
                        rowIndex: index,
                        colIndex: 14,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-full"
                      onClick={(e) => e.stopPropagation()}
                      title={
                        (token?.role === "Advert" || token?.role === "SuperAdmin")
                          ? "Toggle: address verified vs geolocation"
                          : item.geoAddressVerified === "Verified"
                            ? "Address verified (geo)"
                            : "Not verified"
                      }
                    >
                      <Switch
                        checked={item.geoAddressVerified === "Verified"}
                        disabled={!(token?.role === "Advert" || token?.role === "SuperAdmin")}
                        onCheckedChange={() => {
                          if (!(token?.role === "Advert" || token?.role === "SuperAdmin")) return;
                          void handleGeoAddressVerified(item._id);
                        }}
                        className="scale-90 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-input"
                      />
                    </div>
                  </div>

                  <div
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${item._id}-15`, el);
                    }}
                    className={`${
                      columnWidths.propertyFloor
                    } px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
                      selectedCell?.rowId === item._id &&
                      selectedCell?.colIndex === 15
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    }`}
                    title="Property floor"
                    onClick={() => {
                      setSelectedCell({
                        rowId: item._id,
                        field: "Floor",
                        value: item.propertyFloor ?? "",
                        rowIndex: index,
                        colIndex: 15,
                      });
                      setSelectedRow(item._id);
                    }}
                  >
                    <SelectableCell
                      maxWidth="80px"
                      data={ownerPropertyFloorSelectOptions}
                      value={ownerPropertyFloorToSelectValue(item.propertyFloor)}
                      save={(v) =>
                        handleSave(
                          item._id,
                          "propertyFloor",
                          ownerPropertyFloorFromSelectValue(v),
                        )
                      }
                    />
                  </div>

                  {extraColumnLabel && extraColumnRender && (
                    <div
                      className={`${columnWidths.distance} px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 text-xs text-muted-foreground`}
                    >
                      <span className="truncate">{extraColumnRender(item)}</span>
                    </div>
                  )}

                  <div
                    style={actionsSticky.style}
                    className={`${columnWidths.actions} px-3 py-2 h-10 whitespace-nowrap flex items-center flex-shrink-0 ${actionsSticky.className}`}
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
                );
              },
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
