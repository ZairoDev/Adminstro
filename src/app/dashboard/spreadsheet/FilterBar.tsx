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

interface PageProps {
  filters: FiltersInterface;
  setFilters: React.Dispatch<React.SetStateAction<FiltersInterface>>;
  handleSubmit: () => void;
  handleClear: () => void;
}

const filterCount = (filters: FiltersInterface) => {
  return Object.entries(filters).filter(([key, value]) => value).length;
};

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
const FilterBar = ({ filters, setFilters, handleSubmit, handleClear }: PageProps) => {
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
            onValueChange={(value) =>
              setFilters({ ...filters, propertyType: value })
            }
          >
            <SelectTrigger className=" border border-neutral-700 w-36">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Property Type</SelectLabel>
                {apartmentTypes.sort().map((type, index) => (
                  <SelectItem key={index} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Rental Type */}
        {/* <div className=" flex flex-col items-center gap-y-1">
        <Switch
          id="airplane-mode"
          checked={filters.rentalType === "Long Term"}
          onCheckedChange={(checked) =>
            setFilters({ ...filters, rentalType: checked ? "Long Term" : "Short Term" })
          }
        />
        <Label htmlFor="airplane-mode">{filters.rentalType}</Label>
      </div> */}

        {/* Availability */}
        {/* <div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "justify-start text-left font-normal gap-x-2",
                !filters.dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon />
              {filters.dateRange?.from ? (
                filters.dateRange.to ? (
                  <>
                    {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                    {format(filters.dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(filters.dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange?.from}
              selected={filters.dateRange}
              // onSelect={(value) => setFilters({ ...filters, dateRange: value })}
              onSelect={(value) => longTermDateSelect(value)}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div> */}

        {/* Location */}
        <div>
          <Input
            type="text"
            placeholder="Enter location"
            onChange={(e) => setFilters({ ...filters, place: e.target.value })}
            value={filters.place}
          />
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

          {/* Beds */}
          {/* <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className=" px-6 font-bold">B</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className=" w-72">
              <div className=" px-2">
                {["beds", "bedrooms", "bathroom"].map((item, index) => (
                  <div
                    className=" flex items-center justify-between my-2"
                    key={index}
                  >
                    <p className=" capitalize">{item}</p>
                    <div className=" flex items-center gap-x-2 w-2/3 justify-end">
                      <Button
                        className=" rounded-full p-3.5 font-semibold text-xl"
                        onClick={() =>
                          setFilters({
                            ...filters,
                            [item]:
                              Number(filters[item as keyof typeof filters]) - 1,
                          })
                        }
                      >
                        -
                      </Button>
                      <p className=" w-3">
                        {Number(filters[item as keyof typeof filters])}
                      </p>
                      <Button
                        className=" rounded-full p-3.5 font-semibold text-xl "
                        onClick={() =>
                          setFilters({
                            ...filters,
                            [item]:
                              Number(filters[item as keyof typeof filters]) + 1,
                          })
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div> */}
        </div>
      </div>
      {/* Apply & Clear Filters */}
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
