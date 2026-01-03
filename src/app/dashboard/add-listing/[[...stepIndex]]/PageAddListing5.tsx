"use client";
import React, { FC, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Heading from "@/components/Heading";

export interface PageAddListing5Props {}

interface Page5State {
  smoking: string;
  pet: string;
  party: string;
  cooking: string;
  additionalRules: string[];
}

const PageAddListing5: FC<PageAddListing5Props> = () => {
  const params = useSearchParams();
  const userId = params.get("userId");

  const handleRadioChange = (name: string, value: string) => {
    setPage5((prevState) => {
      return {
        ...prevState,
        [name]: value,
      };
    });
  };

  const handleRulesAdd = () => {
    if (rulesInput) {
      setAdditionalRules((prev) => [...prev, rulesInput]);
      setRulesInput("");
    }
    setPage5((prev) => {
      return {
        ...prev,
        additionalRules: [...prev.additionalRules, rulesInput],
      };
    });
  };

  const [additionalRules, setAdditionalRules] = useState<string[]>(() => {
    const savedPage = localStorage.getItem("page5") || "";
    if (!savedPage) {
      return [
        "No smoking in common areas",
        "Do not wear shoes/shoes in the house",
        "No cooking in the bedroom",
      ];
    }
    const value = JSON.parse(savedPage)["additionalRules"];
    return (
      value || [
        "No smoking in common areas",
        "Do not wear shoes/shoes in the house",
        "No cooking in the bedroom",
      ]
    );
  });

  const [rulesInput, setRulesInput] = useState<string>("");

  const [page5, setPage5] = useState<Page5State>(() => {
    const savedPage = localStorage.getItem("page5");
    return savedPage
      ? JSON.parse(savedPage)
      : {
          smoking: "Do not allow",
          pet: "Allow",
          party: "Allow",
          cooking: "Allow",
          additionalRules: additionalRules,
        };
  });

  useEffect(() => {
    const newPage5: Page5State = {
      smoking: page5.smoking,
      pet: page5.pet,
      party: page5.party,
      cooking: page5.cooking,
      additionalRules: additionalRules,
    };
    // setPage5(newPage5);
    localStorage.setItem("page5", JSON.stringify(newPage5));
  }, [page5, additionalRules]);

  const renderRadio = (
    name: keyof Page5State,
    value: string,
    label: string,
    defaultChecked?: boolean
  ) => {
    return (
      <div className="flex items-center">
        <Input
          id={`${name}-${value}`}
          name={name}
          type="radio"
          className=" h-6 w-6 rounded-full cursor-pointer text-background "
          checked={page5[name] === value}
          onChange={() => handleRadioChange(name, value)}
        />
        <label htmlFor={`${name}-${value}`} className="ml-3 block text-sm ">
          {label}
        </label>
      </div>
    );
  };

  return (
    <>
      <div className="mb-4">
        <Heading
          heading="Additional Rules"
          subheading="Add additional rules for comming guests"
        />
      </div>

      {/* FORM */}
      <div className="space-y-8">
        {/* ITEM */}
        <div>
          <label className="text-lg font-semibold" htmlFor="">
            Smoking
          </label>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {renderRadio("smoking", "Do not allow", "Do not allow", true)}
            {renderRadio("smoking", "Allow", "Allow")}
            {renderRadio("smoking", "Charge", "Charge")}
          </div>
        </div>

        {/* ITEM */}
        <div>
          <label className="text-lg font-semibold" htmlFor="">
            Pet
          </label>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {renderRadio("pet", "Do not allow", "Do not allow")}
            {renderRadio("pet", "Allow", "Allow", true)}
            {renderRadio("pet", "Charge", "Charge")}
          </div>
        </div>

        {/* ITEM */}
        <div>
          <label className="text-lg font-semibold" htmlFor="">
            Party organizing
          </label>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {renderRadio("party", "Do not allow", "Do not allow")}
            {renderRadio("party", "Allow", "Allow", true)}
            {renderRadio("party", "Charge", "Charge")}
          </div>
        </div>

        {/* ITEM */}
        <div>
          <label className="text-lg font-semibold" htmlFor="">
            Cooking
          </label>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {renderRadio("cooking", "Do not allow", "Do not allow")}
            {renderRadio("cooking", "Allow", "Allow", true)}
            {renderRadio("cooking", "Charge", "Charge")}
          </div>
        </div>

        {/* ----------- */}
        <div className=" bodrer border-b"></div>
        <span className="block text-lg font-semibold">Additional rules</span>
        <div className="flow-root">
          <div className="-my-3  ">
            {additionalRules.map((item, index) => (
              <div
                className="py-3 flex items-center  justify-between"
                key={index}
              >
                <div className="flex border-primary items-center">
                  <span className="ml-3 ">{item}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAdditionalRules((prev) => {
                      return [
                        ...additionalRules.slice(0, index),
                        ...additionalRules.slice(
                          index + 1,
                          additionalRules.length
                        ),
                      ];
                    })
                  }
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 sm:space-x-5">
          <Input
            className="!h-full"
            placeholder="No smoking..."
            value={rulesInput}
            onChange={(e) => setRulesInput(e.target.value.trim())}
          />
          <Button
            className=" flex gap-x-1 items-center"
            onClick={() => handleRulesAdd()}
          >
            <Plus className="w-4 h-4" /> Add tag
          </Button>
        </div>
      </div>
      <div className="mt-4 flex gap-x-4 ml-2 mb-4">
        <Link
          href={{
            pathname: `/dashboard/add-listing/4`,
            query: { userId: userId },
          }}
        >
          <Button>Go back</Button>
        </Link>
        <Link
          href={{
            pathname: `/dashboard/add-listing/6`,
            query: { userId: userId },
          }}
        >
          <Button>Continue</Button>
        </Link>
      </div>
    </>
  );
};

export default PageAddListing5;
