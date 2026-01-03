"use client";
import React, { FC, useEffect, useState } from "react";
import NcInputNumber from "@/components/NcInputNumber";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import Heading from "@/components/Heading";

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
  const params = useSearchParams();
  const userId = params.get("userId");

  let portions = 0;
  const data = localStorage.getItem("page1") || "";
  if (data) {
    try {
      const value = JSON.parse(data)["numberOfPortions"];
      portions = parseInt(value, 10) || 0;
    } catch {
      portions = 0;
    }
  }

  const emptyStringArrayGenerator = (size: number) =>
    Array.from({ length: size }, () => "");

  const emptyNumberArrayGenerator = (size: number) =>
    Array.from({ length: size }, () => 0);

  const loadPage3Array = <T,>(
    key: keyof Page3State,
    generator: (size: number) => T[]
  ): T[] => {
    const savedPage = localStorage.getItem("page3") || "";
    if (!savedPage) return generator(portions);
    try {
      const value = JSON.parse(savedPage)[key];
      return value && Array.isArray(value) ? value : generator(portions);
    } catch {
      return generator(portions);
    }
  };

  const [myArray, setMyArray] = useState<number[]>([]);
  const [portionName, setPortionName] = useState<string[]>(() =>
    loadPage3Array("portionName", emptyStringArrayGenerator)
  );
  const [portionSize, setPortionSize] = useState<number[]>(() =>
    loadPage3Array("portionSize", emptyNumberArrayGenerator)
  );
  const [guests, setGuests] = useState<number[]>(() =>
    loadPage3Array("guests", emptyNumberArrayGenerator)
  );
  const [bedrooms, setBedrooms] = useState<number[]>(() =>
    loadPage3Array("bedrooms", emptyNumberArrayGenerator)
  );
  const [beds, setBeds] = useState<number[]>(() =>
    loadPage3Array("beds", emptyNumberArrayGenerator)
  );
  const [bathroom, setBathroom] = useState<number[]>(() =>
    loadPage3Array("bathroom", emptyNumberArrayGenerator)
  );
  const [kitchen, setKitchen] = useState<number[]>(() =>
    loadPage3Array("kitchen", emptyNumberArrayGenerator)
  );
  const [childrenAge, setChildrenAge] = useState<number[]>(() =>
    loadPage3Array("childrenAge", emptyNumberArrayGenerator)
  );

  const [page3, setPage3] = useState<Page3State>({
    portionName,
    portionSize,
    guests,
    bedrooms,
    beds,
    bathroom,
    kitchen,
    childrenAge,
  });

  useEffect(() => {
    setMyArray(Array(portions).fill(1));
  }, [portions]);

  useEffect(() => {
    const newPage3: Page3State = {
      portionName,
      portionSize,
      guests,
      bedrooms,
      beds,
      bathroom,
      kitchen,
      childrenAge,
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

  const isFormValid = () =>
    [
      portionName,
      portionSize,
      guests,
      bedrooms,
      beds,
      bathroom,
      childrenAge,
    ].every((arr) => arr.every((val) => val !== "" && val !== 0));

  const [isValidForm, setIsValidForm] = useState<boolean>(false);

  useEffect(() => {
    setIsValidForm(isFormValid());
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
    <>
      <Heading
        heading="Choose available options"
        subheading="Choose the best options that suit your needs"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 mt-3 gap-x-8 gap-y-8">
        {myArray.map((_, index) => (
          <div
            key={index}
            className="border mb-4 relative rounded-lg sm:p-4 p-2"
          >
            <h2 className="text-sm font-semibold mt-2 ml-2">
              Name of {myArray.length > 1 ? `Portion ${index + 1}` : `Property`}
            </h2>
            <div className="bg-primary text-foreground h-8 w-8 z-10 rounded-lg absolute -top-5 -left-5 flex items-center justify-center">
              <p>{myArray.length > 1 ? `${index + 1}` : "1"}</p>
            </div>
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

            <h2 className="text-sm mt-2">
              Size(m<sup>2</sup>)
            </h2>
            <Input
              required
              type="text"
              value={portionSize[index]}
              className="w-full mt-2"
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
              <div className="flex items-center justify-between">
                <h2 className="text-md font-semibold">Children Age</h2>
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

      <div className="mt-4 flex gap-x-4 ml-2 mb-4">
        <Link
          href={{
            pathname: `/dashboard/add-listing/2/`,
            query: { userId: userId },
          }}
        >
          <Button>Go back</Button>
        </Link>
        <Link
          href={{
            pathname: `/dashboard/add-listing/4/`,
            query: { userId: userId },
          }}
        >
          <Button disabled={!isValidForm}>Continue</Button>
        </Link>
      </div>
    </>
  );
};

export default PageAddListing3;
