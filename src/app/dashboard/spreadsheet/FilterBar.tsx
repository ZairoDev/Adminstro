import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { propertyTypes } from "@/util/type";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


import { DateRange } from "react-day-picker";
import { FiltersInterface } from "../newproperty/filteredProperties/page";
import { useEffect, useState } from "react";
import axios from "axios";

interface PageProps {
  filters: FiltersInterface;
  setFilters: React.Dispatch<React.SetStateAction<FiltersInterface>>;
  handleSubmit: () => void;
  handleClear: () => void;
  selectedTab: string;
}

const filterCount = (filters: FiltersInterface) => {
  return Object.entries(filters).filter(([key, value]) => value).length;
};

const apartmentTypes = [
  // "Studio",
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "4 Bedroom",
  "Villa",
  "Pent House",
  "Detached House",
  "Loft",
  "Shared Apartment",
  "Maisotte",
  "Studio",
];
const FilterBar = ({ filters, setFilters, handleSubmit, handleClear, selectedTab }: PageProps) => { 

   const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
   const [locationws, setLocationws] = useState<string[]>([]);
  const longTermDateSelect = (value: DateRange | undefined) => {
    const from = value?.from;
    const to = value?.to;
    if (from && to) {
      const numberOfDays = Math.floor(
        (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (numberOfDays < 28 && filters.rentalType === "Long Term") {
        alert("Minimum stay for long term rentals is 28 days.");
        return;
      }
    }
    setFilters({ ...filters, dateRange: value });
  };

  // console.log("filters: ", filterCount(filters), filters);
   useEffect(() => {
    const fetchCounts = async () => {
      try {
        const endpoint = "/api/unregisteredOwners/getCounts";
        const res = await axios.post(endpoint, {
          filters,
          availability: selectedTab === "available" ? "Available" : "Not Available",
        });
        setTypeCounts(res.data.counts || {});
      } catch (err) {
        console.error("Failed to fetch counts:", err);
      }
    };
    fetchCounts();
  }, [filters, selectedTab]);

   useEffect(() => {
    const getAllLocations = async () => {
      try {
        // 1. Fetch all locations
        const res = await axios.get(`/api/addons/target/getAlLocations`);
        const fetchedCities: string[] = res.data.data.map(
          (loc: any) => loc.city
        );

        setLocationws(fetchedCities);
        console.log("fetched Locations that has been selected in get allocations", locationws);

        
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocationws([]);
      }
    };

    getAllLocations();
  }, []);


  return (
    <div className="p-2 flex flex-wrap justify-between items-center  gap-y-2">
      {/* Search Type */}
      <div className="flex flex-row gap-x-2">
        <div className=" flex gap-x-2">
          <Select
            onValueChange={(value) =>
              setFilters({ ...filters, searchType: value })
            }
            value={filters.searchType}
          >
            <SelectTrigger className=" w-36 border border-neutral-700">
              <SelectValue placeholder="Search Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Search Type</SelectLabel>
                <SelectItem value="name">Name</SelectItem>
                {/* <SelectItem value="email">Email</SelectItem> */}
                <SelectItem value="phoneNumber">Phone</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Search Value */}
          <div>
            <Input
              type="text"
              placeholder="Enter Search Value"
              className=" border border-neutral-600"
              onChange={(e) =>
                setFilters({ ...filters, searchValue: e.target.value })
              }
              value={filters.searchValue}
            />
          </div>
        </div>

        {/* Property Type */}
        <div>
          <Select
          value={filters.propertyType}
          onValueChange={(value) => setFilters({ ...filters, propertyType: value })}
        >
          <SelectTrigger className="border border-neutral-700 w-48">
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Property Type</SelectLabel>
              {apartmentTypes.sort().map((type) => (
                <SelectItem key={type} value={type}>
                  <div className="flex justify-between items-center w-full">
                    <span>{type}</span>
                    {typeCounts[type] && (
                      <span className="ml-2 text-xs bg-pink-600 text-white rounded-full px-2">
                        {typeCounts[type]}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        </div>

        {/* Location */}
        {/* <div>
          <Input
            type="text"
            placeholder="Enter location"
            onChange={(e) => setFilters({ ...filters, place: e.target.value })}
            value={filters.place}
          />
        </div> */}
        <div>
           <Select
            onValueChange={(value) =>
              setFilters({ ...filters, place: value })
            }
            value={filters.place}
          >
            <SelectTrigger className=" w-44 border border-neutral-700">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Locations</SelectLabel>
                {locationws.sort().map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    <div className="flex justify-between items-center w-full">
                      <span>{loc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>


        {/* Price & Beds */}
        <div className=" w-28 gap-x-1 flex justify-between">
          {/* Price */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className=" px-6 font-bold">P</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className=" w-56">
                <DropdownMenuLabel>Price Range</DropdownMenuLabel>
                <div className=" flex gap-x-4 p-2">
                  <div>
                    <Label>Min Price</Label>
                    <Input
                      value={filters.minPrice}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          minPrice: parseInt(e.target.value, 10),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Max Price</Label>
                    <Input
                      value={filters.maxPrice}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          maxPrice: parseInt(e.target.value, 10),
                        })
                      }
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

     
        </div>
      </div>
   
      <div className=" w-1/3 flex justify-around border border-neutral-700 p-2 mx-auto my-2 rounded-lg">
        <Button
          className=" rounded-lg font-semibold w-20 md:w-32"
          onClick={() => handleSubmit()}
        >
          Apply ({filterCount(filters)})
        </Button>
        <Button
          className=" rounded-lg font-semibold w-20 md:w-32"
          onClick={() => handleClear()}
          variant={"outline"}
        >
          Clear
        </Button>
      </div>
    </div>
  );
};
export default FilterBar;
