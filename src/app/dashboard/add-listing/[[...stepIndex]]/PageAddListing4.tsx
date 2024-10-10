"use client";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { ChangeEvent, FC, useEffect, useMemo, useState } from "react";

export interface PageAddListing4Props {}

interface checkBoxState {
  [key: string]: any;
}

type InnerObject = {
  [key: string]: boolean;
};

type MainState = {
  generalAmenities: InnerObject;
  otherAmenities: InnerObject;
  safeAmenities: InnerObject;
};

const PageAddListing4: FC<PageAddListing4Props> = () => {
  const params = useSearchParams();
  const userId = params.get("userId");
  console.log(userId);

  const savedAmenities = JSON.parse(localStorage.getItem("page4") || "[]");

  const [amenitiesState, setAmenitiesState] = useState<MainState>(() => {
    const savedPage = localStorage.getItem("page4") || "";
    if (!savedPage) {
      return { key1: {}, key2: {}, key3: {} };
    }
    const value = JSON.parse(savedPage);
    return value || { key1: {}, key2: {}, key3: {} };
  });

  const generalAmenities = useMemo(
    () => ({
      Wifi: amenitiesState?.generalAmenities?.Wifi || false,
      Internet: amenitiesState?.generalAmenities?.Internet || false,
      TV: amenitiesState?.generalAmenities?.TV || false,
      "Air conditioning":
        amenitiesState?.generalAmenities?.["Air conditioning"] || false,
      Fan: amenitiesState?.generalAmenities?.Fan || false,
      "Private entrance":
        amenitiesState?.generalAmenities?.["Private entrance"] || false,
      Dryer: amenitiesState?.generalAmenities?.Dryer || false,
      Heater: amenitiesState?.generalAmenities?.Heater || false,
      "Washing machine":
        amenitiesState?.generalAmenities?.["Washing machine"] || false,
      Detergent: amenitiesState?.generalAmenities?.Detergent || false,
      "Clothes dryer":
        amenitiesState?.generalAmenities?.["Clothes dryer"] || false,
      "Baby cot": amenitiesState?.generalAmenities?.["Baby cot"] || false,
      Desk: amenitiesState?.generalAmenities?.Desk || false,
      Fridge: amenitiesState?.generalAmenities?.Fridge || false,
      "Balcony View":
        amenitiesState?.generalAmenities?.["Balcony View"] || false,
      Bathtub: amenitiesState?.generalAmenities?.["Bathtub "] || false,
      Puzzles: amenitiesState?.generalAmenities?.["Puzzles"] || false,
      "Cleaning Products":
        amenitiesState?.generalAmenities?.["Cleaning Products"] || false,
      "Dressing Room":
        amenitiesState?.generalAmenities?.["Dressing Room"] || false,
      "Drying Racks":
        amenitiesState?.generalAmenities?.["Drying Racks"] || false,
      Soundproofing:
        amenitiesState?.generalAmenities?.["Soundproofing"] || false,
      "Smoking Area":
        amenitiesState?.generalAmenities?.["Smoking Area"] || false,
      "Smoking Alarm":
        amenitiesState?.generalAmenities?.["Smoking Alarm"] || false,
      "Living Area": amenitiesState?.generalAmenities?.["Living Area"] || false,
      "Clothes Stand":
        amenitiesState?.generalAmenities?.["Clothes Stand"] || false,
      Bathrobe: amenitiesState?.generalAmenities?.["Bathrobe"] || false,
      Mirror: amenitiesState?.generalAmenities?.["Mirror"] || false,
      "CCTV Common Area":
        amenitiesState?.generalAmenities?.["CCTV Common Area"] || false,
      "CCTV Outside Area":
        amenitiesState?.generalAmenities?.["CCTV Outside Area"] || false,
      Housekeeping: amenitiesState?.generalAmenities?.["Housekeeping"] || false,
      "Electric Grill":
        amenitiesState?.generalAmenities?.["Electric grill"] || false,
      "Free Parking":
        amenitiesState?.generalAmenities?.["Free Parking"] || false,
      Microwave: amenitiesState?.generalAmenities?.Microwave || false,
      "Mosquito net":
        amenitiesState?.generalAmenities?.["Mosquito net"] || false,
      Oven: amenitiesState?.generalAmenities?.Oven || false,
      "Private Bathroom":
        amenitiesState?.generalAmenities?.["Private Bathroom"] || false,
      Slippers: amenitiesState?.generalAmenities?.["Slippers"] || false,
      "Flat TV": amenitiesState?.generalAmenities?.["Flat TV"] || false,
      Shower: amenitiesState?.generalAmenities?.Shower || false,
      "Lunch Area": amenitiesState?.generalAmenities?.["Lunch Area"] || false,
      "channels for Children":
        amenitiesState?.generalAmenities?.["TV channel for Children"] || false,
      "Cooling Fan": amenitiesState?.generalAmenities?.["Cooling Fan"] || false,
      Verandah: amenitiesState?.generalAmenities?.Verandah || false,
      Balcony: amenitiesState?.generalAmenities?.Balcony || false,
      "Mountain View":
        amenitiesState?.generalAmenities?.["Mountain View"] || false,
      "Landmark View":
        amenitiesState?.generalAmenities?.["Landmark View"] || false,
      Iron: amenitiesState?.generalAmenities?.["Iron"] || false,
      "Inner Courtyard View":
        amenitiesState?.generalAmenities?.["Inner Courtyard View"] || false,
      "Coffee Machine":
        amenitiesState?.generalAmenities?.["Coffee Machine"] || false,
      "Hand Sanitizer":
        amenitiesState?.generalAmenities?.["Hand Sanitizer"] || false,
      "Satellite Channels":
        amenitiesState?.generalAmenities?.["Satellite Channels"] || false,
      "Hot Tub/ Jacuzzi":
        amenitiesState?.generalAmenities?.["Hot Tub/ Jacuzzi"] || false,
      "Sun Umbrellas":
        amenitiesState?.generalAmenities?.["Sun Umbrellas"] || false,
      "Beach Front": amenitiesState?.generalAmenities?.["Beach Front"] || false,
      Hypoallergenic:
        amenitiesState?.generalAmenities?.["Hypoallergenic"] || false,
      "Lake View": amenitiesState?.generalAmenities?.["Lake View"] || false,
    }),
    [savedAmenities]
  );

  const otherAmenities = useMemo(
    () => ({
      Wardrobe: amenitiesState?.otherAmenities?.Wardrobe || false,
      "Cloth hook": amenitiesState?.otherAmenities?.["Cloth hook"] || false,
      "Extra cushion":
        amenitiesState?.otherAmenities?.["Extra cushion"] || false,
      "Gas stove": amenitiesState?.otherAmenities?.["Gas stove"] || false,
      "Toilet paper": amenitiesState?.otherAmenities?.["Toilet paper"] || false,
      "Free toiletries":
        amenitiesState?.otherAmenities?.["Free toiletries"] || false,
      "Makeup table": amenitiesState?.otherAmenities?.["Makeup table"] || false,
      "Hot pot": amenitiesState?.otherAmenities?.["Hot pot"] || false,
      "Bathroom heaters":
        amenitiesState?.otherAmenities?.["Bathroom heaters"] || false,
      Kettle: amenitiesState?.otherAmenities?.Kettle || false,
      Dishwasher: amenitiesState?.otherAmenities?.Dishwasher || false,
      "BBQ grill": amenitiesState?.otherAmenities?.["BBQ grill"] || false,
      Toaster: amenitiesState?.otherAmenities?.Toaster || false,
      Towel: amenitiesState?.otherAmenities?.Towel || false,
      "Dining table": amenitiesState?.otherAmenities?.["Dining table"] || false,
      Airport: amenitiesState?.otherAmenities?.["Airport"] || false,
      ATM: amenitiesState?.otherAmenities?.["ATM"] || false,
      Beach: amenitiesState?.otherAmenities?.["Beach"] || false,
      "City view": amenitiesState?.otherAmenities?.["City view"] || false,
      Terrace: amenitiesState?.otherAmenities?.["Terrace"] || false,
      "Tennis Court": amenitiesState?.otherAmenities?.["Tennis Court"] || false,
      "Game Console": amenitiesState?.otherAmenities?.["Game Console"] || false,
      "Garden View": amenitiesState?.otherAmenities?.["Garden view"] || false,
      "Gas Station": amenitiesState?.otherAmenities?.["Gas Station"] || false,
      Gym: amenitiesState?.otherAmenities?.Gym || false,
      "Luggage Trolley":
        amenitiesState?.otherAmenities?.["Luggage Trolley"] || false,
      "Outdoor Furniture":
        amenitiesState?.otherAmenities?.["Outdoor Furniture"] || false,
      Park: amenitiesState?.otherAmenities?.Park || false,
      "Play Ground": amenitiesState?.otherAmenities?.["Play Ground"] || false,
      Pool: amenitiesState?.otherAmenities?.Pool || false,
      Sauna: amenitiesState?.otherAmenities?.Sauna || false,
      "Room Service": amenitiesState?.otherAmenities?.["Room Service"] || false,
      "Railway Station":
        amenitiesState?.otherAmenities?.["Railway Station"] || false,
      "Seating Area": amenitiesState?.otherAmenities?.["Seating Area"] || false,
      Bidet: amenitiesState?.otherAmenities?.Bidet || false,
      "Socket near the bed":
        amenitiesState?.otherAmenities?.["Socket near the bed"] || false,
      Books: amenitiesState?.otherAmenities?.Books || false,
      "DVD for children":
        amenitiesState?.otherAmenities?.["DVD for children"] || false,
      "Cable Channels":
        amenitiesState?.otherAmenities?.["Cable Channels"] || false,
      "Music for children":
        amenitiesState?.otherAmenities?.["Music for children"] || false,
      "Fire Place": amenitiesState?.otherAmenities?.["Fire Place"] || false,
      "Sofa Bed": amenitiesState?.otherAmenities?.["Sofa Bed"] || false,
      "Latex Mattresses":
        amenitiesState?.otherAmenities?.["Latex Mattresses"] || false,
      "Claw Foot Tub":
        amenitiesState?.otherAmenities?.["Claw Foot Tub"] || false,
      "Hand Held Shower":
        amenitiesState?.otherAmenities?.["Hand Held Shower"] || false,
      Chocolates: amenitiesState?.otherAmenities?.Chocolates || false,
      "Butler Pantry":
        amenitiesState?.otherAmenities?.["Butler Pantry"] || false,
      "Private Bathroom":
        amenitiesState?.otherAmenities?.["Private Bathroom"] || false,
      Linen: amenitiesState?.otherAmenities?.Linen || false,
      Patio: amenitiesState?.otherAmenities?.Patio || false,
      Computer: amenitiesState?.otherAmenities?.Computer || false,
      Playground: amenitiesState?.otherAmenities?.Playground || false,
      "Outdoor Dining Area":
        amenitiesState?.otherAmenities?.["Outdoor Dining Area"] || false,
      "Mini Bar": amenitiesState?.otherAmenities?.["Mini Bar"] || false,
      "Outdoor Tub": amenitiesState?.otherAmenities?.["Outdoor Tub"] || false,
      Garden: amenitiesState?.otherAmenities?.Garden || false,
      "Streaming Media":
        amenitiesState?.otherAmenities?.["Streaming Media"] || false,
      Parasol: amenitiesState?.otherAmenities?.Parasol || false,
      "Sea View": amenitiesState?.otherAmenities?.["Sea View"] || false,
      "Tall Chairs": amenitiesState?.otherAmenities?.["Tall Chairs"] || false,
      Cafeteria: amenitiesState?.otherAmenities?.Cafeteria || false,
      "Room for non Smoker":
        amenitiesState?.otherAmenities?.["Room for non Smoker"] || false,
      "Tobacco Detectors":
        amenitiesState?.otherAmenities?.["Tobacco Detectors"] || false,
      Sunbed: amenitiesState?.otherAmenities?.Sunbed || false,
      "Beach Umbrella":
        amenitiesState?.otherAmenities?.["Beach Umbrella"] || false,
      "Private Pool": amenitiesState?.otherAmenities?.["Private Pool"] || false,
      "Indoor Pool": amenitiesState?.otherAmenities?.["Indoor Pool"] || false,
      "Outdoor Pool": amenitiesState?.otherAmenities?.["Outdoor Pool"] || false,
      "Small Pool": amenitiesState?.otherAmenities?.["Small Pool"] || false,
      "Beach Chair": amenitiesState?.otherAmenities?.["Beach Chair"] || false,
      Kitchenette: amenitiesState?.otherAmenities?.Kitchenette || false,
      Bicycles: amenitiesState?.otherAmenities?.Bicycles || false,
      "Outdoor Shower":
        amenitiesState?.otherAmenities?.["Outdoor Shower"] || false,
      "Sun Lounger": amenitiesState?.otherAmenities?.["Sun Lounger"] || false,
      "Carbon Monoxide Detector":
        amenitiesState?.otherAmenities?.["Carbon Monoxide Detector"] || false,
      Hearths: amenitiesState?.otherAmenities?.["Hearths"] || false,
    }),
    [savedAmenities]
  );

  const safeAmenities = useMemo(
    () => ({
      "Fire Siren": amenitiesState?.safeAmenities?.["Fire Siren"] || false,
      "Fire extinguisher":
        amenitiesState?.safeAmenities?.["Fire extinguisher"] || false,
      "Antitheft Key":
        amenitiesState?.safeAmenities?.["Antitheft Key"] || false,
      "Safe Vault": amenitiesState?.safeAmenities?.["Safe Vault"] || false,
    }),
    [savedAmenities]
  );

  const initialState: MainState = {
    generalAmenities,
    otherAmenities,
    safeAmenities,
  };

  const [amenities, setAmenities] = useState<MainState>(initialState);

  const handleCheckboxChange = (
    outerKey: keyof MainState,
    innerKey: string,
    checked: boolean | string
  ) => {
    setAmenities((prevState) => ({
      ...prevState,
      [outerKey]: {
        ...prevState[outerKey],
        [innerKey]: checked,
      },
    }));
  };

  useEffect(() => {
    localStorage.setItem("page4", JSON.stringify(amenities));
  }, [amenities]);

  return (
    <>
      <div>
        <Heading
          heading="Amenities"
          subheading="Choose the best Amenities describes your listing"
        />
      </div>

      <div className="space-y-8">
        <div className="mt-6 border-b pb-6">
          <label className="text-xl font-semibold" htmlFor="">
            General amenities
          </label>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.keys(amenities.generalAmenities)
              .sort((a, b) => a.localeCompare(b))
              .map((key) => (
                <div
                  key={key}
                  className="flex sm:text-base text-xs items-center gap-x-1"
                >
                  <Label className="cursor-pointer text-xs sm:text-sm">
                    {key}
                  </Label>
                  <Checkbox
                    className="cursor-pointer"
                    key={key}
                    name={key}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange("generalAmenities", key, checked)
                    }
                    {...(amenities.generalAmenities[key] && {
                      defaultChecked: true,
                    })}
                  />
                </div>
              ))}
          </div>
        </div>

        <div>
          <label className="text-lg  font-semibold" htmlFor="">
            Other amenities
          </label>
          <div className="mt-6 border-b pb-6 grid grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.keys(amenities.otherAmenities)
              .sort((a, b) => a.localeCompare(b))
              .map((key) => (
                <div key={key} className="flex items-center gap-x-1">
                  <Label className="cursor-pointer text-xs sm:text-sm">
                    {key}
                  </Label>
                  <Checkbox
                    className="cursor-pointer"
                    key={key}
                    name={key}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange("otherAmenities", key, checked)
                    }
                    {...(amenities.generalAmenities[key] && {
                      defaultChecked: true,
                    })}
                    {...(amenities.otherAmenities[key] && {
                      defaultChecked: true,
                    })}
                  />
                </div>
              ))}
          </div>
        </div>

        <div>
          <label className="text-lg font-semibold" htmlFor="">
            Safe amenities
          </label>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.keys(amenities.safeAmenities)
              .sort((a, b) => a.localeCompare(b))
              .map((key) => (
                <div key={key} className="flex items-center gap-x-1">
                  <Label className="cursor-pointer text-xs sm:text-sm">
                    {key}
                  </Label>
                  <Checkbox
                    className="cursor-pointer"
                    key={key}
                    name={key}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange("safeAmenities", key, checked)
                    }
                    {...(amenities.generalAmenities[key] && {
                      defaultChecked: true,
                    })}
                    {...(amenities.safeAmenities[key] && {
                      defaultChecked: true,
                    })}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-x-4 ml-2 mb-4">
        <Link
          href={{
            pathname: `/dashboard/add-listing/3`,
            query: { userId: userId },
          }}
        >
          <Button>Go back</Button>
        </Link>
        <Link
          href={{
            pathname: `/dashboard/add-listing/5`,
            query: { userId: userId },
          }}
        >
          <Button>Continue</Button>
        </Link>
      </div>
    </>
  );
};

export default PageAddListing4;
