import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
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

import { FiltersInterface } from "./page";

interface PageProps {
  filters: FiltersInterface;
  setFilters: React.Dispatch<React.SetStateAction<FiltersInterface>>;
  handleSubmit: () => void;
  handleClear: () => void;
}

const FilterBar = ({ filters, setFilters, handleSubmit, handleClear }: PageProps) => {
  return (
    <div className="p-2 flex flex-wrap justify-between items-center gap-x-2 gap-y-2">
      {/* Search Type */}
      <div className=" flex gap-x-2">
        <Select
          onValueChange={(value) => setFilters({ ...filters, searchType: value })}
          value={filters.searchType}
        >
          <SelectTrigger className=" w-36 border border-neutral-700">
            <SelectValue placeholder="Search Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Search Type</SelectLabel>
              <SelectItem value="VSID">VSID</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Search Value */}
        <div>
          <Input
            type="text"
            placeholder="Enter Search Value"
            className=" border border-neutral-600"
            onChange={(e) => setFilters({ ...filters, searchValue: e.target.value })}
            value={filters.searchValue}
          />
        </div>
      </div>

      {/* Property Type */}
      <div>
        <Select
          onValueChange={(value) => setFilters({ ...filters, propertyType: value })}
        >
          <SelectTrigger className=" border border-neutral-700 w-52">
            <SelectValue placeholder="Select Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Property Type</SelectLabel>
              {propertyTypes.sort().map((type, index) => (
                <SelectItem key={index} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Price & Beds */}
      <div className=" w-44 flex justify-between">
        {/* Price */}
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className=" px-6 font-semibold">Price</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className=" w-56">
              <DropdownMenuLabel>Price Range</DropdownMenuLabel>
              <div className=" flex gap-x-4 p-2">
                <div>
                  <Label>Min Price</Label>
                  <Input
                    value={filters.minPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, minPrice: parseInt(e.target.value, 10) })
                    }
                  />
                </div>
                <div>
                  <Label>Max Price</Label>
                  <Input
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, maxPrice: parseInt(e.target.value, 10) })
                    }
                  />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Beds */}
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className=" px-6 font-semibold">Beds</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className=" w-72">
              <div className=" px-2">
                {["beds", "bedrooms", "bathrooms"].map((item, index) => (
                  <div className=" flex items-center justify-between my-2" key={index}>
                    <p className=" capitalize">{item}</p>
                    <div className=" flex items-center gap-x-2 w-2/3 justify-end">
                      <Button
                        className=" rounded-full p-3.5 font-semibold text-xl"
                        onClick={() =>
                          setFilters({
                            ...filters,
                            [item]: Number(filters[item as keyof typeof filters]) - 1,
                          })
                        }
                      >
                        -
                      </Button>
                      {/* <p className=" w-3">{filters[item as keyof typeof filters]}</p> */}
                      <Input
                        type="number"
                        // defaultValue={filters[item as keyof typeof filters]}
                        value={filters[item as keyof typeof filters]}
                        min={1}
                        // disabled
                        className="w-16"
                      />
                      <Button
                        className=" rounded-full p-3.5 font-semibold text-xl "
                        onClick={() =>
                          setFilters({
                            ...filters,
                            [item]: Number(filters[item as keyof typeof filters]) + 1,
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
        </div>
      </div>

      {/* Apply & Clear Filters */}
      <div className=" flex gap-x-8 justify-around border border-neutral-700 py-2 px-4 rounded-full">
        <Button
          className=" rounded-3xl px-5 font-semibold"
          onClick={() => handleSubmit()}
        >
          Apply
        </Button>
        <Button
          className=" rounded-3xl px-5 font-semibold"
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
