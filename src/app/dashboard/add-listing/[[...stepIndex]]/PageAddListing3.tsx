"use client";
import React, { FC } from "react";
import { useEffect, useState, useRef } from "react";
import NcInputNumber from "@/components/NcInputNumber";
import { Input } from "@/components/ui/input";
export interface PageAddListing3Props {}

interface Page3State {
  portionName: string[];
  portionSize: number[];
  guests: number[];
  bedrooms: number[];
  beds: number[];
  bathroom: number[];
  kitchen: number[];
  childrenAge: number[];
}

const PageAddListing3: FC<PageAddListing3Props> = () => {
  // TODO: declaring the type of object which is used as the value in array of input fields
  let portions = 0;
  const data = localStorage.getItem("page1") || "";
  if (data) {
    const value = JSON.parse(data)["numberOfPortions"];
    if (value) {
      portions = parseInt(value, 10);
    }
  }
  const emptyStringArrayGenerator = (size: number) => {
    const emptyStringArray = Array.from({ length: size }, () => "");
    return emptyStringArray;
  };
  const emptyNumberArrayGenerator = (size: number) => {
    const emptyNumberArray = Array.from({ length: size }, () => 0);
    return emptyNumberArray;
  };

  const [myArray, setMyArray] = useState<number[]>([]);
  const [portionName, setPortionName] = useState<string[]>(() => {
    const savedPage = localStorage.getItem("page3") || "";
    if (!savedPage) {
      return emptyStringArrayGenerator(portions);
    }
    const value = JSON.parse(savedPage)["portionName"];
    return value || emptyStringArrayGenerator(portions);
  });

  const [portionSize, setPortionSize] = useState<number[]>(() => {
    const savedPage = localStorage.getItem("page3") || "";
    if (!savedPage) {
      return emptyNumberArrayGenerator(portions);
    }
    const value = JSON.parse(savedPage)["portionSize"];
    return value || emptyNumberArrayGenerator(portions);
  });

  const [guests, setGuests] = useState<number[]>(() => {
    const savedPage = localStorage.getItem("page3") || "";
    if (!savedPage) {
      return emptyNumberArrayGenerator(portions);
    }
    const value = JSON.parse(savedPage)["guests"];
    return value || emptyNumberArrayGenerator(portions);
  });

  const [bedrooms, setBedrooms] = useState<number[]>(() => {
    const savedPage = localStorage.getItem("page3") || "";
    if (!savedPage) {
      return emptyNumberArrayGenerator(portions);
    }
    const value = JSON.parse(savedPage)["bedrooms"];
    return value || emptyNumberArrayGenerator(portions);
  });

  const [beds, setBeds] = useState<number[]>(() => {
    const savedPage = localStorage.getItem("page3") || "";
    if (!savedPage) {
      return emptyNumberArrayGenerator(portions);
    }
    const value = JSON.parse(savedPage)["beds"];
    return value || emptyNumberArrayGenerator(portions);
  });

  const [bathroom, setBathroom] = useState<number[]>(() => {
    const savedPage = localStorage.getItem("page3") || "";
    if (!savedPage) {
      return emptyNumberArrayGenerator(portions);
    }
    const value = JSON.parse(savedPage)["bathroom"];
    return value || emptyNumberArrayGenerator(portions);
  });

  const [kitchen, setKitchen] = useState<number[]>(() => {
    const savedPage = localStorage.getItem("page3") || "";
    if (!savedPage) {
      return emptyNumberArrayGenerator(portions);
    }
    const value = JSON.parse(savedPage)["kitchen"];
    return value || emptyNumberArrayGenerator(portions);
  });

  const [childrenAge, setChildrenAge] = useState<number[]>(() => {
    const savedPage = localStorage.getItem("page3") || "";
    if (!savedPage) {
      return emptyNumberArrayGenerator(portions);
    }
    const value = JSON.parse(savedPage)["childrenAge"];
    return value || emptyNumberArrayGenerator(portions);
  });

  const [page3, setPage3] = useState<Page3State>({
    portionName: portionName,
    portionSize: portionSize,
    guests: guests,
    bedrooms: bedrooms,
    beds: beds,
    bathroom: bathroom,
    kitchen: kitchen,
    childrenAge: childrenAge,
  });

  useEffect(() => {
    const newArray = Array(portions).fill(1);
    setMyArray(newArray);
  }, [portions]);

  useEffect(() => {
    const newPage3: Page3State = {
      portionName: portionName,
      portionSize: portionSize,
      guests: guests,
      bedrooms: bedrooms,
      beds: beds,
      bathroom: bathroom,
      kitchen: kitchen,
      childrenAge: childrenAge,
    };
    setPage3(newPage3);
    localStorage.setItem("page3", JSON.stringify(newPage3));
  }, [
    portionName,
    portionSize,
    guests,
    bedrooms,
    beds,
    bathroom,
    kitchen,
    childrenAge,
  ]);

  return (
    <div className=" grid  grid-cols-1 md:grid-cols-2   gap-x-4">
      {myArray.map((item, index) => (
        <div key={index} className=" border mb-4  rounded-lg sm:p-4 p-2 ">
          <h2 className="text-sm font-semibold mt-2 ml-2">
            Name of {myArray.length > 1 ? `Portion ${index + 1}` : `Property`}{" "}
          </h2>

          <Input
            required
            type="text"
            className="w-full mt-1"
            value={portionName[index]}
            onChange={(e) =>
              setPortionName((prev) => {
                const newArray = [...prev];
                newArray[index] = e.target.value.trim();
                return newArray;
              })
            }
          />

          <h2 className=" text-sm mt-2">
            Size(m<sup>2</sup>)
          </h2>

          <Input
            required
            type="text"
            value={portionSize[index]}
            className="w-full mt-2 "
            onChange={(e) =>
              setPortionSize((prev) => {
                const newArray = [...prev];
                newArray[index] = parseInt(e.target.value) || 0;
                return newArray;
              })
            }
          />

          <div className="flex flex-col mt-4 gap-y-4 mx-4">
            <NcInputNumber
              label="Guests"
              className=""
              defaultValue={guests[index]}
              onChange={(value) =>
                setGuests((prev) => {
                  const newArray = [...prev];
                  newArray[index] = value;
                  return newArray;
                })
              }
            />
            <NcInputNumber
              label="Bedroom"
              defaultValue={bedrooms[index]}
              onChange={(value) =>
                setBedrooms((prev) => {
                  const newArray = [...prev];
                  newArray[index] = value;
                  return newArray;
                })
              }
            />
            <NcInputNumber
              label="Beds"
              defaultValue={beds[index]}
              onChange={(value) =>
                setBeds((prev) => {
                  const newArray = [...prev];
                  newArray[index] = value;
                  return newArray;
                })
              }
            />
            <NcInputNumber
              label="Bathroom"
              defaultValue={bathroom[index]}
              onChange={(value) =>
                setBathroom((prev) => {
                  const newArray = [...prev];
                  newArray[index] = value;
                  return newArray;
                })
              }
            />
            <NcInputNumber
              label="Kitchen"
              defaultValue={kitchen[index]}
              onChange={(value) =>
                setKitchen((prev) => {
                  const newArray = [...prev];
                  newArray[index] = value;
                  return newArray;
                })
              }
            />
            <div className="flex items-center justify-between ">
              <h2 className="text-md font-semibold ">Children Age</h2>
              <Input
                required
                type="text"
                value={childrenAge[index]}
                className="w-1/2"
                onChange={(e) =>
                  setChildrenAge((prev) => {
                    const newArray = [...prev];
                    newArray[index] = parseInt(e.target.value) || 0;
                    return newArray;
                  })
                }
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PageAddListing3;
