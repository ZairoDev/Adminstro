"use client";

import { useRef, useState } from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Currency, Trash2Icon, TrashIcon } from "lucide-react";

const CategoryList = () => {
  const inputPropertyRef = useRef<HTMLInputElement>(null);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);

  return (
    <div className=" flex justify-between">
      <div className=" flex flex-col gap-y-2">
        {/* Category Name */}
        <div>
          <Label htmlFor="categoryName">Category Name</Label>
          <Input id="categoryName" className=" border border-neutral-700" />
        </div>

        {/* Category Description */}
        <div>
          <Label htmlFor="categoryDescription">Category Description</Label>
          <Input id="categoryDescription" className=" border border-neutral-700" />
        </div>
      </div>

      {/* Add Property Id */}
      <div>
        <div className=" border border-neutral-700 rounded-md p-2">
          {/* Property Id Input & Button */}
          <div className=" flex gap-x-2">
            <Input className="" placeholder="Enter Property Id" ref={inputPropertyRef} />
            <Button
              className=" font-semibold"
              onClick={() => {
                setPropertyIds((prev) =>
                  [inputPropertyRef?.current?.value ?? "", ...prev].filter(
                    (item) => item != ""
                  )
                );

                // inputPropertyRef.current?.value = "";
              }}
            >
              Add +
            </Button>
          </div>

          {/* Property List */}
          <div className=" h-52 overflow-y-scroll mt-2">
            {propertyIds.map((propertyId: string, index: number) => (
              <div className=" flex justify-between items-center px-2" key={index}>
                <p className="p-1 text-sm">{propertyId}</p>
                <Trash2Icon
                  size={16}
                  color="red"
                  onClick={() =>
                    setPropertyIds((prev) => prev.filter((item) => item !== propertyId))
                  }
                  className=" cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save & Cancel */}
        <div className=" flex justify-around mt-2">
          <Button>Save</Button>
          <Button variant={"destructive"}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};
export default CategoryList;
