"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Info, X } from "lucide-react";

export default function InfoCard() {
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [areaModalType, setAreaModalType] = useState<"details" | "price">(
    "details"
  );

  return (
    <>
      {/* --- Info Button Dropdown --- */}
      <div className="flex justify-end mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="mt-1" variant="outline" size="icon">
              <Info size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                setAreaModalType("details");
                setAreaModalOpen(true);
              }}
            >
              Area Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setAreaModalType("price");
                setAreaModalOpen(true);
              }}
            >
              Area Price Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* --- Custom Modal --- */}
      {areaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setAreaModalOpen(false)} // click outside closes modal
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-[90vw] max-w-4xl h-[80vh] relative p-4"
            onClick={(e) => e.stopPropagation()} // prevent outside close when clicking inside
          >
            {/* Close Button */}
            <button
              onClick={() => setAreaModalOpen(false)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              <X size={20} />
            </button>

            {/* Title */}
            <h2 className="text-xl font-semibold mb-4">
              {areaModalType === "details"
                ? "Area Details"
                : "Area Price Details"}
            </h2>

            {/* Iframe */}
            <div className="w-full h-[90%]">
              {areaModalType === "details" && (
                <iframe
                  key="details"
                  src="/dashboard/areadetails"
                  title="Area Details"
                  className="w-full h-full border rounded"
                />
              )}
              {areaModalType === "price" && (
                <iframe
                  key="price"
                  src="/dashboard/areapriceinfo"
                  title="Area Price Details"
                  className="w-full h-full border rounded"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
