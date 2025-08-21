"use client";
import axios from "axios";
import { SpreadsheetTable } from "./spreadsheetTable";
import { useEffect, useState } from "react";
import { unregisteredOwners } from "@/util/type";
import { FilteredPropertiesInterface, FiltersInterface } from "../newproperty/filteredProperties/page";
import FilterBar from "./FilterBar";

const Spreadsheet = () => {
  const [data, setData] = useState<unregisteredOwners[]>([]);
   const [properties, setProperties] = useState<FilteredPropertiesInterface[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalProperties, setTotalProperties] = useState(1);
    const [filters, setFilters] = useState<FiltersInterface>({
      searchType: "",
      searchValue: "",
      propertyType: "",
      place: "",
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
      // fetchProperties();
      getData();
    };

    const handleClear = () => {
      setFilters({
        searchType: "",
        searchValue: "",
        propertyType: "",
        place: "",
        rentalType: "Short Term",
        minPrice: 0,
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

  const getData = async () => {
    try {
      const response = await axios.post(`/api/unregisteredOwners/getList`,{
        filters,
      });
      console.log(response.data);
      // ✅ make sure it's always an array
      setData(
        Array.isArray(response.data.data)
          ? response.data.data
          : [response.data.data]
      );
    } catch (error) {
      console.error("Failed to fetch target:", error);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <div>
      Spreadsheet
      <div>
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          handleSubmit={handleSumit}
          handleClear={handleClear}
        />
        <SpreadsheetTable tableData={data} setTableData={setData} />
      </div>
    </div>
  );
};
export default Spreadsheet;
