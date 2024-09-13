"use client";
import React, { FC, useEffect } from "react";
import { useState } from "react";

import FormItem from "../FormItem";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export interface PageAddListing1Props {}

interface Page1State {
  propertyType: string;
  placeName: string;
  rentalForm: string;
  numberOfPortions: number;
  showPortionsInput: boolean;
  rentalType: string;
}

const PageAddListing1: FC<PageAddListing1Props> = () => {
  const params = useSearchParams();
  const userId = params.get("userId");
  console.log(userId);

  const [propertyType, setPropertyType] = useState<string>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    if (!savedPage) {
      return "Hotel";
    }
    const value = JSON.parse(savedPage)["propertyType"];
    return value || "Hotel";
  });

  const [placeName, setPlaceName] = useState<string>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    if (!savedPage) {
      return "";
    }
    const value = JSON.parse(savedPage)["placeName"];
    return value || "";
  });

  const [rentalForm, setRentalForm] = useState<string>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    if (!savedPage) {
      return "Private room";
    }
    const value = JSON.parse(savedPage)["rentalForm"];
    return value || "Private room";
  });

  const [numberOfPortions, setNumberOfPortions] = useState<number>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    if (!savedPage) {
      return 1;
    }
    const value = JSON.parse(savedPage)["numberOfPortions"];
    return value ? parseInt(value, 10) : 1;
  });

  const [showPortionsInput, setShowPortionsInput] = useState<boolean>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    if (!savedPage) {
      return false;
    }
    const value = JSON.parse(savedPage)["showPortionsInput"];
    return value ? JSON.parse(value) : false;
  });

  const [rentalType, setRentalType] = useState<string>(() => {
    const savedRentalType = localStorage.getItem("page1") || "";
    if (!savedRentalType) {
      return "Short Term";
    }
    const value = JSON.parse(savedRentalType)["rentalType"];
    return value || "Short Term";
  });

  const [page1, setPage1] = useState<Page1State>({
    propertyType: propertyType,
    placeName: placeName,
    rentalForm: rentalForm,
    numberOfPortions: numberOfPortions,
    showPortionsInput: showPortionsInput,
    rentalType: rentalType,
  });

  const handlePropertyTypeChange = (value: string) => {
    console.log("Selected Property Type: ", value);
    setPropertyType(value);
  };

  const handlePlaceName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pName = e.target.value.trim();
    setPlaceName(pName);
  };

  const handleRentalFormChange = (value: string) => {
    console.log("Selected Rental Form: ", value);
    setRentalForm(value);
    if (value === "Private room by portion") {
      setNumberOfPortions(2);
      setShowPortionsInput(true);
    } else {
      setNumberOfPortions(1);
      setShowPortionsInput(false);
    }
  };

  const handleRentalTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.id);
    setRentalType(e.target.id);
  };

  const handlePortionsInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 2) {
      setNumberOfPortions(value);
    } else {
      e.target.value = "2";
    }
  };

  useEffect(() => {
    setPage1((prev) => {
      const newObj = { ...prev };
      newObj.numberOfPortions = numberOfPortions;
      return newObj;
    });
  }, [numberOfPortions]);

  useEffect(() => {
    setPage1((prev) => {
      const newObj = { ...prev };
      newObj.propertyType = propertyType;
      return newObj;
    });
  }, [propertyType]);

  useEffect(() => {
    setPage1((prev) => {
      const newObj = { ...prev };
      newObj.placeName = placeName;
      return newObj;
    });
  }, [placeName]);

  useEffect(() => {
    setPage1((prev) => {
      const newObj = { ...prev };
      newObj.rentalForm = rentalForm;
      return newObj;
    });
  }, [rentalForm]);

  useEffect(() => {
    setPage1((prev) => {
      const newObj = { ...prev };
      newObj.rentalType = rentalType;
      return newObj;
    });
  }, [rentalType]);

  useEffect(() => {
    const newPage1: Page1State = {
      propertyType: propertyType,
      placeName: placeName,
      rentalForm: rentalForm,
      numberOfPortions: numberOfPortions,
      showPortionsInput: showPortionsInput,
      rentalType: rentalType,
    };
    setPage1(newPage1);
    localStorage.setItem("page1", JSON.stringify(newPage1));
  }, [
    propertyType,
    placeName,
    rentalForm,
    numberOfPortions,
    showPortionsInput,
    rentalType,
  ]);

  return (
    <div>
      <h2 className="text-2xl font-semibold">Choosing listing categories</h2>

      <div className="space-y-8">
        <div className=" mt-4 flex justify-between">
          <div>
            <label htmlFor="Short Term" id="Short Term">
              Short Term
            </label>
            <input
              type="radio"
              name="rentalType"
              className=" mx-2 p-2 cursor-pointer"
              id="Short Term"
              defaultChecked={rentalType === "Short Term"}
              onChange={handleRentalTypeChange}
            />
          </div>
          <div>
            <label htmlFor="Long Term" id="Long Term">
              Long Term
            </label>
            <input
              type="radio"
              name="rentalType"
              className=" mx-2 p-2 cursor-pointer"
              id="Long Term"
              defaultChecked={rentalType === "Long Term"}
              onChange={handleRentalTypeChange}
            />
          </div>
          <div>
            <label htmlFor="Both" id="Both">
              Both
            </label>
            <input
              type="radio"
              name="rentalType"
              className=" mx-2 p-2 cursor-pointer"
              id="Both"
              defaultChecked={rentalType === "Both"}
              onChange={handleRentalTypeChange}
            />
          </div>
        </div>
        <FormItem
          label="Choose a property type"
          desc="Hotel: Professional hospitality businesses that usually have a unique style or theme defining their brand and decor"
        >
          <Select onValueChange={handlePropertyTypeChange} value={propertyType}>
            <SelectTrigger>
              <SelectValue placeholder="Select property type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Hotel">Hotel</SelectItem>
              <SelectItem value="Cottage">Cottage</SelectItem>
              <SelectItem value="Villa">Villa</SelectItem>
              <SelectItem value="Cabin">Cabin</SelectItem>
              <SelectItem value="Farm stay">Farm stay</SelectItem>
              <SelectItem value="Houseboat">Houseboat</SelectItem>
              <SelectItem value="Lighthouse">Lighthouse</SelectItem>
              <SelectItem value="Studio">Studio</SelectItem>
              <SelectItem value="Apartment">Apartment</SelectItem>
              <SelectItem value="Condo">Condo</SelectItem>
              <SelectItem value="Resort">Resort</SelectItem>
              <SelectItem value="House">House</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
        <FormItem
          label="Place name"
          desc="A catchy name usually includes: House name + Room name + Featured property + Tourist destination"
        >
          <Input
            placeholder="Places name"
            onChange={handlePlaceName}
            value={placeName}
          />
        </FormItem>
        <FormItem
          label="Rental form"
          desc="Entire place: Guests have the whole place to themselves—there's a private entrance and no shared spaces. A bedroom, bathroom, and kitchen are usually included."
        >
          <Select onValueChange={handleRentalFormChange} value={rentalForm}>
            <SelectTrigger>
              <SelectValue placeholder="Select rental form" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Private room">Private Area</SelectItem>
              <SelectItem value="Private room by portion">
                Private Area by portion
              </SelectItem>
              <SelectItem value="Shared Room">Shared Room</SelectItem>
              <SelectItem value="Hotel Room">Hotel Room</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
        {showPortionsInput && (
          <div className="mt-8">
            <FormItem desc="The number of portion this place have you hvae to fill it here ">
              <Input
                type="number"
                value={numberOfPortions}
                onChange={handlePortionsInputChange}
                placeholder="Number of portions"
                min={2}
                title="Number of portions can not be less than 2"
              />
            </FormItem>
          </div>
        )}
      </div>
      <div className="mt-4 ml-2 mb-4">
        <Link
          href={{
            pathname: `/dashboard/add-listing/2`,
            query: { userId: userId },
          }}
        >
          <Button>Continue</Button>
        </Link>
      </div>
    </div>
  );
};
export const useClient = true;

export default PageAddListing1;
