"use client";

import axios from "axios";
import mongoose from "mongoose";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { LucideLoader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import FilterBar from "./filter-bar";
import PropertyList from "./property-list";

export interface FiltersInterface {
  searchType: string;
  searchValue: string;
  propertyType: string;
  place: string;
  area:string;
  zone:string;
  metroZone:string;
  rentalType: "Short Term" | "Long Term";
  minPrice: number ;
  maxPrice: number ;
  sortByPrice?: "asc" | "desc" | "";
  beds: number;
  bedrooms: number;
  bathroom: number;
  dateRange: DateRange | undefined;
}

export interface FilteredPropertiesInterface {
  _id: mongoose.Types.ObjectId;
  VSID: string;
  propertyCoverFileUrl: string;
  basePrice: number;
  basePriceLongTerm: number;
  userId:string;
  rentalType: "Short Term" | "Long Term";
  email: string;
  city: string;
  state: string;
  country: string;
}

const FilteredProperties = () => {
  const [properties, setProperties] = useState<FilteredPropertiesInterface[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalProperties, setTotalProperties] = useState(1);
  const [filters, setFilters] = useState<FiltersInterface>({
    searchType: "",
    searchValue: "",
    propertyType: "",
    place: "",
    area: "",
    zone: "",
    metroZone: "",
    rentalType: "Short Term",
    minPrice: 0,
    maxPrice: 0,
    beds: 0,
    bedrooms: 0,
    bathroom: 0,
    dateRange: undefined,
  });

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/property/filteredProperties", {
        filters,
        page,
      });
      // console.log("response of filtered data: ", response.data.filteredProperties);
      setProperties(response.data.filteredProperties);
      setTotalProperties(response.data.totalProperties);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSumit = () => {
    // console.log("clicked submit", filters);
    fetchProperties();
  };

  const handleClear = () => {
    setFilters({
      searchType: "",
      searchValue: "",
      propertyType: "",
      place: "",
      area: "",
      zone: "",
      metroZone: "",
      rentalType: "Short Term",
      minPrice: 0 ,
      maxPrice: 0,
      beds: 0,
      bedrooms: 0,
      bathroom: 0,
      dateRange: undefined,
    });
    fetchProperties();
  };

  useEffect(() => {
    fetchProperties();
  }, [page]);

  return (
    <div className=" w-full mx-auto">
      <h1 className=" text-3xl font-medium">Property Filters</h1>

      {/* filter bar */}
      <div className="max-w-7xl mx-auto">
        <FilterBar
        filters={filters}
        setFilters={setFilters}
        handleSubmit={handleSumit}
        handleClear={handleClear}
      />
      </div>
      

      {/* property list */}
      {isLoading ? (
        <LucideLoader2 className=" animate-spin mx-auto" size={44} />
      ) : (
        <PropertyList
          isSearchTerm={
            filters.searchValue.trim().length > 0 && filters.searchType !== ""
          }
          properties={properties}
        />
      )}

      {/* pagination */}
      <div className=" flex justify-between mt-2 ">
        <div className=" border border-neutral-700 rounded-xl p-2">
          Page {page} out of {Math.ceil(totalProperties / 20)}, ({totalProperties}){" "}
          properties
        </div>
        <div className=" flex gap-x-2">
          <Button
            className=" font-bold"
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
          >
            PREV
          </Button>
          <Button
            className=" font-bold"
            disabled={page === Math.ceil(totalProperties / 20)}
            onClick={() => setPage((prev) => prev + 1)}
          >
            NEXT
          </Button>
        </div>
      </div>
    </div>
  );
};
export default FilteredProperties;
