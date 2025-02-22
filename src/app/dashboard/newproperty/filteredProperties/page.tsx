"use client";

import axios from "axios";
import mongoose from "mongoose";
import { useEffect, useState } from "react";

import FilterBar from "./filter-bar";
import PropertyList from "./property-list";
import { Button } from "@/components/ui/button";

export interface FiltersInterface {
  searchType: string;
  searchValue: string;
  propertyType: string;
  minPrice: number;
  maxPrice: number;
  beds: number;
  bedrooms: number;
  bathroom: number;
}

export interface FilteredPropertiesInterface {
  _id: mongoose.Types.ObjectId;
  VSID: string;
  propertyCoverFileUrl: string;
  basePrice: number;
}

const FilteredProperties = () => {
  const [properties, setProperties] = useState<FilteredPropertiesInterface[]>([]);
  const [page, setPage] = useState(1);
  const [totalProperties, setTotalProperties] = useState(1);
  const [filters, setFilters] = useState<FiltersInterface>({
    searchType: "",
    searchValue: "",
    propertyType: "",
    minPrice: 0,
    maxPrice: 0,
    beds: 0,
    bedrooms: 0,
    bathroom: 0,
  });

  const fetchProperties = async () => {
    try {
      const response = await axios.post("/api/property/filteredProperties", {
        filters,
        page,
      });
      console.log("response of filtered data: ", response.data.filteredProperties);
      setProperties(response.data.filteredProperties);
      setTotalProperties(response.data.totalProperties);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const handleSumit = () => {
    console.log("clicked submit", filters);
    fetchProperties();
  };

  const handleClear = () => {
    setFilters({
      searchType: "",
      searchValue: "",
      propertyType: "",
      minPrice: 0,
      maxPrice: 0,
      beds: 0,
      bedrooms: 0,
      bathroom: 0,
    });
    fetchProperties();
  };

  useEffect(() => {
    fetchProperties();
  }, [page]);

  return (
    <div>
      <div>
        <h1 className=" text-3xl font-medium">Property Filters</h1>
      </div>
      <div className=" mt-4">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          handleSubmit={handleSumit}
          handleClear={handleClear}
        />
      </div>

      <div>
        <PropertyList properties={properties ?? []} />
      </div>

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
