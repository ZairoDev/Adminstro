import { Dispatch, SetStateAction } from "react";

import { FilterInterface } from "@/util/type";

import { Input } from "../ui/input";
import { CustomSelect } from "../reusable-components/CustomSelect";

const LeadFilter = ({
  filters,
  setFilters,
}: {
  filters: any;
  setFilters: Dispatch<SetStateAction<FilterInterface>>;
}) => {
  const handleOnChange = (key: keyof FilterInterface, value: string | number) => {
    const newObj: FilterInterface = { ...filters };
    (newObj[key] as string | number) = value;
    setFilters(newObj);
  };

  return (
    <div className=" text-sm">
      <div className=" grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Guest Filter */}
        <div>
          <p>Guest Filter</p>
          <Input
            type="number"
            min={0}
            defaultValue={0}
            onChange={(e) => handleOnChange("guest", parseInt(e.target.value, 10) || 0)}
          />
        </div>

        {/* Beds Filter */}
        <div>
          <p>Beds Filter</p>
          <Input
            type="number"
            min={0}
            defaultValue={0}
            onChange={(e) =>
              handleOnChange("noOfBeds", parseInt(e.target.value, 10) || 0)
            }
          />
        </div>

        {/* Furnished Filter */}
        <div>
          <p>Furnished Filter</p>
          <CustomSelect
            itemList={["Furnished", "Semi-furnished", "Un - furnished"]}
            labelHeader="Select Furnished Status"
            triggerText="Property Type"
            onValueChange={(value) => handleOnChange("propertyType", value)}
          />
        </div>

        {/* Billing Filter */}
        <div>
          <p>Bill Filter</p>
          <CustomSelect
            itemList={["With Bill", "Without Bill"]}
            labelHeader="Select Bill Status"
            triggerText="Bill"
            onValueChange={(value) => handleOnChange("billStatus", value)}
          />
        </div>

        {/* Budget Filter */}
        <div>
          <p>Budget Filter</p>
          <div className=" flex gap-x-1">
            <Input type="number" placeholder="From" />
            <Input type="number" placeholder="To" />
          </div>
        </div>

        {/* Lead Quality Filter */}
        <div>
          <p>Lead Quality </p>
          <CustomSelect
            itemList={["Good", "Very Good", "Average", "Below Average"]}
            labelHeader="Lead Quality"
            triggerText="Lead Quality"
            onValueChange={(value) => handleOnChange("leadQualityByCreator", value)}
          />
        </div>
      </div>
    </div>
  );
};
export default LeadFilter;
