"use client";

import React from "react";
import Link from "next/link";
import { Ban, CheckCheck, CircleDot, Copy, PawPrint, Pin, Star } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import CustomTooltip from "@/components/CustomToolTip";
import { EditableCell } from "../cells/EditableCell";
import { EditableCopyCell } from "../cells/EditableCopyCell";
import { SelectableCell } from "../cells/SelectableCell";
import { AreaSelect } from "@/components/leadTableSearch/page";
import { UploadCell } from "../cells/UploadCell";
import { DownloadCell } from "../cells/DownloadCell";
import type { unregisteredOwners } from "@/util/type";
import { columnWidths } from "@/app/spreadsheet/utils/columnWidths";
import { apartmentTypes, interiorStatus, availabilityStatus, propertyTypeColors } from "@/app/spreadsheet/constants/apartmentTypes";

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

interface SelectedCell {
  rowId: string;
  field: string;
  value: string;
  rowIndex: number;
  colIndex: number;
}

interface SpreadsheetRowProps {
  item: unregisteredOwners;
  index: number;
  serialNumber: number;
  targets: TargetType[];
  selectedRow: string | null;
  selectedCell: SelectedCell | null;
  userRole: string;
  userName: string;
  cellRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onRowClick: (rowId: string) => void;
  onCellClick: (cell: SelectedCell) => void;
  onSave: (id: string, field: keyof unregisteredOwners, value: string) => void;
  onPetStatusChange: (id: string, index: number) => void;
  onVerifiedStatusChange: (id: string, index: number) => void;
  onImportantStatusChange: (id: string, index: number) => void;
  onPinnedStatusChange: (id: string, index: number) => void;
  onUploadComplete: (id: string, newUrls: string[]) => void;
}

const avail = [
  { label: "A", value: "Available" },
  { label: "NA", value: "Not Available" },
];

const getPropertyTypeColor = (propertyType: string) => {
  return propertyTypeColors[propertyType] || "bg-gray-100 dark:bg-gray-900/30";
};

export function SpreadsheetRow({
  item,
  index,
  serialNumber,
  targets,
  selectedRow,
  selectedCell,
  userRole,
  userName,
  cellRefs,
  onRowClick,
  onCellClick,
  onSave,
  onPetStatusChange,
  onVerifiedStatusChange,
  onImportantStatusChange,
  onPinnedStatusChange,
  onUploadComplete,
}: SpreadsheetRowProps) {
  const isRowSelected = selectedRow === item._id;

  // Helper function to check if cell is selected
  const isCellSelected = (colIndex: number) => {
    return selectedCell?.rowId === item._id && selectedCell?.colIndex === colIndex;
  };

  // Determine row background color based on data completeness
  const getRowBackgroundClass = () => {
    const hasNoVSID = !item.VSID || item.VSID.trim() === "";
    const hasNoLink = !item.link || item.link.trim() === "";
    const hasNoRefLink = !item.referenceLink || item.referenceLink.trim() === "";
    const hasNoImages = !item.imageUrls || item.imageUrls.length === 0;

    if (hasNoVSID && hasNoLink && hasNoRefLink && hasNoImages) {
      return "bg-red-100 dark:bg-red-900/30";
    }
    if (hasNoVSID && hasNoLink) {
      return "bg-blue-100 dark:bg-blue-900/30";
    }
    return "";
  };

  return (
    <div
      onClick={() => onRowClick(item._id)}
      className={`flex cursor-pointer hover:bg-accent/50 border-b border-border ${
        isRowSelected ? "bg-accent" : ""
      } ${getRowBackgroundClass()}`}
    >
      {/* Serial Number Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}--1`, el);
        }}
        className={`${columnWidths.serial} font-medium flex items-center gap-1 px-3 py-2 h-10 whitespace-nowrap border-r border-border flex-shrink-0 ${
          isCellSelected(-1) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "S.No",
            value: String(serialNumber),
            rowIndex: index,
            colIndex: -1,
          });
        }}
      >
        {serialNumber}

        {/* Status Icons */}
        {userRole === "Advert" && (
          <span
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onVerifiedStatusChange(item._id, index);
            }}
          >
            {item.isVerified === "Verified" ? (
              <CustomTooltip icon={<CheckCheck color="green" size={14} />} desc="Verified" />
            ) : (
              <CustomTooltip
                icon={<CircleDot className="text-muted-foreground" size={14} />}
                desc="None"
              />
            )}
          </span>
        )}

        {(userRole === "Sales" || userRole === "Sales-TeamLead" || userRole === "SuperAdmin") && (
          <span
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onImportantStatusChange(item._id, index);
            }}
          >
            {item.isImportant === "Important" ? (
              <CustomTooltip
                icon={<Star color="yellow" fill="yellow" size={14} />}
                desc="Important"
              />
            ) : (
              <CustomTooltip
                icon={<CircleDot className="text-muted-foreground" size={14} />}
                desc="None"
              />
            )}
          </span>
        )}

        {(userRole === "Sales" || userRole === "Sales-TeamLead" || userRole === "SuperAdmin") && (
          <span
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onPinnedStatusChange(item._id, index);
            }}
          >
            {item.isPinned === "Pinned" ? (
              <CustomTooltip icon={<Pin color="red" fill="red" size={14} />} desc="Pinned" />
            ) : (
              <CustomTooltip
                icon={<CircleDot className="text-muted-foreground" size={14} />}
                desc="None"
              />
            )}
          </span>
        )}
      </div>

      {/* Name Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-0`, el);
        }}
        className={`${columnWidths.name} font-medium px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(0) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Name",
            value: item.name,
            rowIndex: index,
            colIndex: 0,
          });
        }}
      >
        <div className="truncate">
          <EditableCell
            value={item.name}
            onSave={(newValue) => onSave(item._id, "name", newValue)}
            disableDigits={true}
            maxWidth="150px"
          />
        </div>
      </div>

      {/* Phone Number Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-1`, el);
        }}
        className={`${columnWidths.phone} px-3 py-2 h-10 whitespace-nowrap border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(1) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Phone",
            value: item.phoneNumber?.toString() || "",
            rowIndex: index,
            colIndex: 1,
          });
        }}
      >
        <EditableCopyCell
          value={item.phoneNumber?.toString()}
          onSave={(newValue) => onSave(item._id, "phoneNumber", newValue)}
        />

        {item.phoneNumber && (
          <Link
            href={`https://wa.me/${item.phoneNumber}?text=Hi%20${item.name}%2C%20my%20name%20is%20${userName}%2C%20and%20how%20are%20you%20doing%3F`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <FaWhatsapp className="cursor-pointer text-green-500" size={22} />
          </Link>
        )}
      </div>

      {/* Location Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-2`, el);
        }}
        className={`${columnWidths.location} px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(2) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        title={item.location}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Location",
            value: item.location,
            rowIndex: index,
            colIndex: 2,
          });
        }}
      >
        <SelectableCell
          maxWidth="100px"
          value={item.location}
          data={targets.map((target) => target.city)}
          save={(newValue: string) => onSave(item._id, "location", newValue)}
        />
      </div>

      {/* Price Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-3`, el);
        }}
        className={`${columnWidths.price} px-3 py-2 h-10 whitespace-nowrap border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(3) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Price",
            value: item.price,
            rowIndex: index,
            colIndex: 3,
          });
        }}
      >
        <EditableCell
          maxWidth="70px"
          value={item.price}
          onSave={(newValue) => onSave(item._id, "price", newValue)}
        />
      </div>

      {/* Area Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-4`, el);
        }}
        className={`${columnWidths.area} px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(4) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Area",
            value: item.area || "",
            rowIndex: index,
            colIndex: 4,
          });
        }}
      >
        <AreaSelect
          maxWidth="100px"
          data={(targets.find((t) => t.city === item.location)?.areas || [])
            .map((a) => ({ label: a.name, value: a.name }))
            .sort((a, b) => a.label.localeCompare(b.label))}
          value={item.area || ""}
          save={(newValue: string) => onSave(item._id, "area", newValue)}
          tooltipText="Select an area"
        />
      </div>

      {/* Availability Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-5`, el);
        }}
        className={`${columnWidths.availability} px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(5) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Availability",
            value: item.availability,
            rowIndex: index,
            colIndex: 5,
          });
        }}
      >
        <SelectableCell
          maxWidth="100px"
          data={avail}
          value={item.availability}
          save={(newValue: string) => onSave(item._id, "availability", newValue)}
        />
      </div>

      {/* Interior Status Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-6`, el);
        }}
        className={`${columnWidths.interiorStatus} px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(6) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Interior Status",
            value: item.interiorStatus,
            rowIndex: index,
            colIndex: 6,
          });
        }}
      >
        <SelectableCell
          maxWidth="200px"
          data={interiorStatus}
          value={item.interiorStatus}
          save={(newValue: string) => onSave(item._id, "interiorStatus", newValue)}
        />
      </div>

      {/* Pet Status Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-7`, el);
        }}
        className={`${columnWidths.petStatus} cursor-pointer px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(7) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Pet Status",
            value: item.petStatus || "None",
            rowIndex: index,
            colIndex: 7,
          });
          onPetStatusChange(item._id, index);
        }}
      >
        {item.petStatus === "Allowed" ? (
          <CustomTooltip icon={<PawPrint color="green" size={14} />} desc="Allowed" />
        ) : item.petStatus === "Not Allowed" ? (
          <CustomTooltip icon={<Ban color="yellow" size={14} />} desc="Not Allowed" />
        ) : (
          <CustomTooltip icon={<CircleDot fill="" color="gray" size={14} />} desc="No Status" />
        )}
      </div>

      {/* Property Type Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-8`, el);
        }}
        className={`${columnWidths.propertyType} px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(8) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Property Type",
            value: item.propertyType,
            rowIndex: index,
            colIndex: 8,
          });
        }}
      >
        <div className={`rounded-md w-full ${getPropertyTypeColor(item.propertyType)}`}>
          <SelectableCell
            maxWidth="200px"
            data={apartmentTypes}
            value={item.propertyType}
            save={(newValue: string) => onSave(item._id, "propertyType", newValue)}
          />
        </div>
      </div>

      {/* Remarks Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-9`, el);
        }}
        className={`${columnWidths.remarks} px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(9) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        title={item.remarks}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Remarks",
            value: item.remarks,
            rowIndex: index,
            colIndex: 9,
          });
        }}
      >
        <EditableCell
          value={item.remarks}
          onSave={(newValue) => onSave(item._id, "remarks", newValue)}
          maxWidth="160px"
        />
      </div>

      {/* Reference Link Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-10`, el);
        }}
        className={`${columnWidths.refLink} px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(10) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        title={item.referenceLink}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Ref Link",
            value: item.referenceLink,
            rowIndex: index,
            colIndex: 10,
          });
        }}
      >
        <div className="flex items-center gap-1 w-full">
          <EditableCell
            value={item.referenceLink}
            onSave={(newValue) => onSave(item._id, "referenceLink", newValue)}
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
              onClick={(e) => e.stopPropagation()}
            >
              🔗
            </a>
          )}
        </div>
      </div>

      {/* VS Link Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-11`, el);
        }}
        className={`${columnWidths.vsLink} px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(11) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        title={item.link}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "VS Link",
            value: item.link,
            rowIndex: index,
            colIndex: 11,
          });
        }}
      >
        <div className="flex items-center gap-1 w-full">
          {["Advert", "SuperAdmin"].includes(userRole) ? (
            <EditableCell
              value={item.link}
              onSave={(newValue) => onSave(item._id, "link", newValue)}
              maxWidth="60px"
            />
          ) : (
            <span className="truncate block">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(item.link);
                }}
              >
                <Copy size={14} />
              </Button>
            </span>
          )}
          {item.link && item.link !== "-" && (
            <a
              href={item.link.startsWith("http") ? item.link : `https://${item.link}`}
              target="_blank"
              className="text-blue-500 hover:text-blue-700"
              rel="noreferrer"
              title="Open link in new tab"
              onClick={(e) => e.stopPropagation()}
            >
              🔗
            </a>
          )}
        </div>
      </div>

      {/* VSID Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-12`, el);
        }}
        className={`${columnWidths.vsid} font-medium px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(12) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "VSID",
            value: item.VSID,
            rowIndex: index,
            colIndex: 12,
          });
        }}
      >
        {["Advert", "SuperAdmin"].includes(userRole) ? (
          <EditableCell
            value={item.VSID}
            onSave={(newValue) => onSave(item._id, "VSID", newValue)}
            maxWidth="150px"
          />
        ) : (
          <span className="truncate block max-w-[150px]">{item.VSID}</span>
        )}
      </div>

      {/* Address Column */}
      <div
        ref={(el) => {
          if (el) cellRefs.current.set(`${item._id}-13`, el);
        }}
        className={`${columnWidths.address} px-3 py-2 h-10 border-r border-border flex items-center flex-shrink-0 ${
          isCellSelected(13) ? "ring-2 ring-primary ring-inset" : ""
        }`}
        title={item.address}
        onClick={(e) => {
          e.stopPropagation();
          onCellClick({
            rowId: item._id,
            field: "Address",
            value: item.address,
            rowIndex: index,
            colIndex: 13,
          });
        }}
      >
        <EditableCell
          maxWidth="200px"
          value={item.address}
          onSave={(newValue) => onSave(item._id, "address", newValue)}
        />
      </div>

      {/* Actions Column */}
      <div
        className={`${columnWidths.actions} px-3 py-2 h-10 whitespace-nowrap flex items-center flex-shrink-0 gap-1`}
        onClick={(e) => e.stopPropagation()}
      >
        <UploadCell item={item} onUploadComplete={onUploadComplete} />
        <DownloadCell item={item} />
      </div>
    </div>
  );
}