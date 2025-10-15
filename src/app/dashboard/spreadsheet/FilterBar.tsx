

import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { DateRange } from "react-day-picker";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { set } from "mongoose";

import { Area } from "../target/page";
import { AreaSelect } from "@/components/leadTableSearch/page";
import { useAuthStore } from "@/AuthStore";
import { MultiAreaSelect } from "@/components/multipleAreaSearch/page";
interface PageProps {
  filters: FiltersInterfaces;
  setFilters: React.Dispatch<React.SetStateAction<FiltersInterfaces>>;
  handleSubmit: () => void;
  handleClear: () => void;
  selectedTab: string;
}
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

 export interface FiltersInterfaces {
  searchType: string;
  searchValue: string;
  propertyType: string;
  place: string[];
  area:string[];
  zone:string;
  metroZone:string;
  // rentalType?: "Short Term" | "Long Term";
  minPrice: number | null;
  maxPrice: number | null;
    sortByPrice?: "asc" | "desc" | "";
  beds: number;
  // bedrooms: number;
  // bathroom: number;
  dateRange: DateRange | undefined;
}
const filterCount = (filters: FiltersInterfaces) => {
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
const FilterBar = ({
  filters,
  setFilters,
  handleSubmit,
  handleClear,
  selectedTab,
}: PageProps) => {
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [locationws, setLocationws] = useState<string[]>([]);
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [areas, setAreas] = useState<AreaType[]>([]);

  const token = useAuthStore((state) => state.token);
const allocations = token?.allotedArea || []; 

const parsedAllocations = typeof allocations === "string"
  ? allocations.split(",").filter(Boolean)
  : allocations;

 useEffect(() => {
  const fetchCounts = async () => {
    try {
      const endpoint = "/api/unregisteredOwners/getCounts";
      const res = await axios.post(endpoint, {
        filters: {
          ...filters,
          allocations: parsedAllocations, 
        },
        availability:
          selectedTab === "available" ? "Available" : "Not Available",
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

      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocationws([]);
      }
    };

    getAllLocations();
  }, []);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const res = await axios.get("/api/addons/target/getAreaFilterTarget");
        // const data = await res.json();
        setTargets(res.data.data);
      } catch (error) {
        console.error("Error fetching targets:", error);
      }
    };
    fetchTargets();
  }, []);

  useEffect(() => {
    const target = targets.find((t) => t.city === selectedLocation);
    if (target) {
      setAreas(target.areas);
    } else {
      setAreas([]);
    }
    setFilters((prev) => ({ ...prev, area: [] })); // Clear old area
  }, [selectedLocation, targets]);

 
const filteredTargets = useMemo(() => {
  if (!targets || targets.length === 0) return [];
  if (!parsedAllocations || parsedAllocations.length === 0) return targets;

  const lowerAlloc = parsedAllocations.map((a: string) => a.toLowerCase());
  return targets.filter((t) => lowerAlloc.includes(t.city.toLowerCase()));
}, [parsedAllocations, targets]);

useEffect(() => {
  if (!filteredTargets) return;

  const current = filters.place && filters.place.length > 0 ? filters.place[0] : "";
  const matchesCurrent =
    current &&
    filteredTargets.some((t) => t.city.toLowerCase() === current.toLowerCase());

  if (!matchesCurrent) {
    if (filteredTargets.length === 1) {
      // use the exact-cased city from targets
      setFilters((prev) => ({ ...prev, place: [filteredTargets[0].city] }));
    } else {
      // multiple allowed but current selection not valid -> clear selection
      setFilters((prev) => ({ ...prev, place: [] }));
    }
  }

}, [filteredTargets]); // eslint-disable-line react-hooks/exhaustive-deps

useEffect(() => {
  const place = filters.place && filters.place.length > 0 ? filters.place[0] : "";

  if (!place) {
    setAreas([]);
    setSelectedLocation("");
    if (filters.area) setFilters((prev) => ({ ...prev, area: [] }));
    return;
  }

  const match = targets.find(
    (t) => t.city.toLowerCase() === place.toLowerCase()
  );

  if (match) {
    setAreas(match.areas || []);
    setSelectedLocation(match.city); // canonical casing
  } else {
    // selected place not found in targets — keep empty areas
    setAreas([]);
    setSelectedLocation(place);
  }

  // reset area only if it was non-empty
  if (filters.area) setFilters((prev) => ({ ...prev, area: [] }));
}, [filters.place, targets]); // eslint-disable-line react-hooks/exhaustive-deps

  


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

        <div>
          <Select
            value={filters.propertyType}
            onValueChange={(value) =>
              setFilters({ ...filters, propertyType: value })
            }
          >
            <SelectTrigger className="border border-neutral-700 w-48">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Property Type</SelectLabel>
                {apartmentTypes.sort().map((type) => {
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex justify-between items-center w-full">
                        <span>{type}</span>
                        {typeCounts[type] && (
                          <span className="ml-2 text-xs bg-pink-600 text-white rounded-full px-2">
                            {typeCounts[type] ?? 0}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            onValueChange={(value) => {
              setFilters({ ...filters, place: value ? [value] : [] });
            }}
            value={filters.place.length > 0 ? filters.place[0] : ""}
          >
            <SelectTrigger className="w-44 border border-neutral-700">
              <SelectValue
                placeholder={
                  parsedAllocations.length === 0
                    ? "Select location"
                    : parsedAllocations.length === 1 &&
                      filteredTargets.length === 1
                    ? filteredTargets[0].city
                    : "Select location"
                }
              />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>
                  {parsedAllocations.length === 0
                    ? "Locations"
                    : "Allotted Locations"}
                </SelectLabel>

                {filteredTargets.map((loc) => (
                  <SelectItem key={loc.city} value={loc.city}>
                    {loc.city}
                  </SelectItem>
                ))}

                {filteredTargets.length === 0 &&
                  parsedAllocations.length > 0 &&
                  parsedAllocations.map((city: string) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          {/* <AreaSelect
            key={filters.place.join(",")}
            maxWidth="100%"
            data={[...areas] // ✅ copy array
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((loc: Area) => ({
                label: loc.name,
                value: loc.name,
              }))}
            value={filters.area || ""}
            save={(newValue: string) => {
              setFilters({ ...filters, area: newValue });
            }}
            tooltipText="Select an area"
          /> */}
          <MultiAreaSelect
            maxWidth="100%"
            data={[...areas]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((loc: AreaType) => ({
                label: loc.name,
                value: loc.name,
              }))}
            values={Array.isArray(filters.area) ? filters.area : []}
            save={(newValues: string[]) =>
              setFilters({ ...filters, area: newValues })
            }
            tooltipText="Select one or more areas"
          />
        </div>

        <div>
          <Select
            onValueChange={(value) => setFilters({ ...filters, zone: value })}
            value={filters.zone}
          >
            <SelectTrigger className=" w-44 border border-neutral-700">
              <SelectValue placeholder="Select Zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Zones</SelectLabel>

                <SelectItem value="North">North</SelectItem>
                <SelectItem value="South">South</SelectItem>
                <SelectItem value="East">East</SelectItem>
                <SelectItem value="West">West</SelectItem>
                <SelectItem value="Central">Centre</SelectItem>
                <SelectItem value="North-East">North-East</SelectItem>
                <SelectItem value="North-West">North-West</SelectItem>
                <SelectItem value="South-East">South-East</SelectItem>
                <SelectItem value="South-West">South-West</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            onValueChange={(value) =>
              setFilters({ ...filters, metroZone: value })
            }
            value={filters.metroZone}
          >
            <SelectTrigger className=" w-44 border border-neutral-700">
              <SelectValue placeholder="Select Metro Line" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Metro Line</SelectLabel>

                <SelectItem value="Red Line">Red Line</SelectItem>
                <SelectItem value="Blue Line">Blue Line</SelectItem>
                <SelectItem value="Green Line">Green Line</SelectItem>
                <SelectItem value="Yellow Line">Yellow Line</SelectItem>
                <SelectItem value="Purple Line">Purple Line</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Price & Beds */}
        <div className="flex gap-x-2">
  {/* Price Range Filter */}
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="bg-white text-black">
        Price Range
      </Button>
    </PopoverTrigger>

    <PopoverContent className="w-56 p-2" align="start">
      <div className="flex gap-x-4">
        <div>
          <Label htmlFor="minPrice">Min Price</Label>
          <Input
            id="minPrice"
            value={filters.minPrice === null ? "" : filters.minPrice}
            onChange={(e) => {
              const value = e.target.value;
              setFilters({
                ...filters,
                minPrice: value === "" ? null : parseInt(value, 10),
              });
            }}
            type="number"
            placeholder="0"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="maxPrice">Max Price</Label>
          <Input
            id="maxPrice"
            value={filters.maxPrice === null ? "" : filters.maxPrice}
            onChange={(e) => {
              const value = e.target.value;
              setFilters({
                ...filters,
                maxPrice: value === "" ? null : parseInt(value, 10),
              });
            }}
            type="number"
            placeholder="0"
          />
        </div>
      </div>
    </PopoverContent>
  </Popover>

  {/* Sort by Price Button */}
  <Button
    variant="outline"
    className="bg-white text-black"
    onClick={() => {
      // toggle sort order between 'asc' and 'desc'
      setFilters({
        ...filters,
        sortByPrice:
          filters.sortByPrice === "asc"
            ? "desc"
            : filters.sortByPrice === "desc"
            ? ""
            : "asc",
      });
    }}
  >
    {filters.sortByPrice === "asc"
      ? "↑ Increasing"
      : filters.sortByPrice === "desc"
      ? "↓ Decreasing"
      : "Sort by Price"}
  </Button>
</div>

      </div>

      <div className="  flex justify-around border border-neutral-700 p-2 mx-auto my-2 rounded-lg">
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