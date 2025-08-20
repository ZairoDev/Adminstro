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
import { Plus } from "lucide-react";
import { EditableCell } from "./EditableCell";
import axios from "axios";
import type { unregisteredOwners } from "@/util/type";
import { SelectableCell } from "./SelectableCell";

export function SpreadsheetTable({
  tableData,
  setTableData,
}: {
  tableData: unregisteredOwners[];
  setTableData: React.Dispatch<React.SetStateAction<unregisteredOwners[]>>;
}) {
  const columns = [
    "Name",
    // "Email",
    "Phone Number",
    "Location",
    "Price",
    "Int. Status",
    "Property Type",
    // "Area",
    "Link",
    "Ref. Link",
    "Address",
    "Remarks",
  ];

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

  const handleAddRow = async () => {
    const tempRow: Omit<unregisteredOwners, "_id"> = {
      name: "-",
      phoneNumber: "-",
      location: "-",
      price: "-",
      interiorStatus: "Furnished",
      propertyType: "Studio",
      link: "-",
      area: "",
      referenceLink: "",
      address: "-",
      remarks: "-",
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Lead Management</h2>
          <p className="text-muted-foreground">
            Manage your unregistered property owners and leads
          </p>
        </div>
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
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>

        {/* Table Body */}
        <TableBody>
          {tableData.map((item: unregisteredOwners) => (
            <TableRow key={item?._id}>
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
                <EditableCell
                  value={item.phoneNumber}
                  onSave={(newValue) =>
                    handleSave(item._id, "phoneNumber", newValue)
                  }
                  maxWidth="120px"
                  // placeholder="Phone number"
                />
              </TableCell>

              {/* Location */}
              <TableCell
                className="truncate max-w-[150px]"
                title={item.location}
              >
                <EditableCell
                  maxWidth="100px"
                  value={item.location}
                  onSave={(newValue) =>
                    handleSave(item._id, "location", newValue)
                  }
                  // placeholder="Location"
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

              {/* Link */}
              <TableCell
                className="text-right truncate max-w-[60px]"
                title={item.link}
              >
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    className="text-blue-500 underline"
                    rel="noreferrer"
                  >
                    Link
                  </a>
                ) : (
                  <EditableCell
                    value={item.link}
                    onSave={(newValue) =>
                      handleSave(item._id, "link", newValue)
                    }
                    maxWidth="60px"
                    // placeholder="URL"
                  />
                )}
              </TableCell>

              {/* Ref. Link */}
              <TableCell
                className="text-right truncate max-w-[60px]"
                title={item.referenceLink}
              >
                {item.referenceLink ? (
                  <a
                    href={item.referenceLink}
                    target="_blank"
                    className="text-blue-500 underline"
                    rel="noreferrer"
                  >
                    Ref
                  </a>
                ) : ( 
                  <EditableCell
                    value={item.referenceLink}
                    onSave={(newValue) =>
                      handleSave(item._id, "referenceLink", newValue)
                    }
                    maxWidth="60px"
                    // placeholder="Ref URL"
                  />
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
