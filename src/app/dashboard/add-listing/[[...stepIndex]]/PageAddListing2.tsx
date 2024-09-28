"use client";

import React, { FC, useEffect, useState } from "react";
import FormItem from "../FormItem";
import dynamic from "next/dynamic";
import { LoadScript } from "@react-google-maps/api";
import { useToast } from "@/hooks/use-toast";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import LocationMap from "@/components/LocationMap";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { FaLocationDot } from "react-icons/fa6";
import { Plus } from "lucide-react";
import { IoRemoveSharp } from "react-icons/io5";

const Map = dynamic(() => import("@/components/LocationMap"), { ssr: false });

interface nearByLocationInterface {
  nearByLocationName: string[];
  nearByLocationDistance: number[];
  nearByLocationTag: string[];
}
interface Page2State {
  country: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  address: string;
  center: { lat: number; lng: number };
  area: string;
  subarea: string;
  neighbourhood: string;
  floor: number;
  isTopFloor: string;
  orientation: string;
  levels: number;
  zones: string;
  propertyStyle: string;
  isSuitableForStudents: string;
  monthlyExpenses: string;
  heatingMedium: string;
  energyClass: string;
  heatingType: string;
  constructionYear: string;
  nearbyLocations: nearByLocationInterface;
}

const PageAddListing2: FC = () => {
  const { toast } = useToast();
  const params = useSearchParams();
  const userId = params.get("userId");

  const [type, setType] = useState<string>();

  const [rentalType, SetRentalType] = useState(() => {
    const type = localStorage.getItem("page1");
    if (!type) {
      setType("");
    } else {
      const parsedData = JSON.parse(type);
      console.log(parsedData);
      setType(parsedData.rentalType);
    }
  });

  const [constructionYear, setConstructionYear] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["constructionYear"];
    }
  });

  const [heatingType, setHeatingType] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["heatingType"];
    }
  });

  const [energyClass, setEnergyClass] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["energyClass"];
    }
  });

  const [heatingMedium, setHeatingMedium] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["heatingMedium"];
    }
  });

  const [monthlyExpenses, setMonthlyExpenses] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["monthlyExpenses"];
    }
  });

  const [isSuitableForStudents, setisSuitableForStudents] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return true;
    } else {
      return JSON.parse(saved)["isSuitableForStudents"] || true;
    }
  });

  const [propertyStyle, setPropetyStyle] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["propertyStyle"];
    }
  });

  const [zones, setZones] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["zones"];
    }
  });

  const [levels, setLevel] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["levels"];
    }
  });

  const [orientation, setOrientation] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["orientation"];
    }
  });

  const [isTopFloor, setTopFloor] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return false;
    } else {
      return JSON.parse(saved)["isTopFloor"] || false;
    }
  });

  const [area, setArea] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["area"];
    }
  });

  const [neighbourhood, setNeighborhood] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["neighbourhood"];
    }
  });

  const [subarea, setSubArea] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["subarea"];
    }
  });

  const [floor, setFloor] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else {
      return JSON.parse(saved)["floor"];
    }
  });

  const [address, setAddress] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["address"];
  });

  const [country, setCountry] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["country"];
  });

  const [state, setState] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["state"];
  });

  const [city, setCity] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["city"];
  });

  const [street, setStreet] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["street"];
  });

  const [postalCode, setPostalCode] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["postalCode"];
  });
  
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: 0,
    lng: 0,
  });

  const [nearbyLocations, setNearByLocations] =
    useState<nearByLocationInterface>(() => {
      const saved = localStorage.getItem("page2");
      if (!saved) {
        const newObj: nearByLocationInterface = {
          nearByLocationName: [],
          nearByLocationDistance: [],
          nearByLocationTag: [],
        };
        return newObj;
      } else return JSON.parse(saved)["nearbyLocations"];
    });

  const [nearByLocationInput, setNearByLocationInput] = useState({
    nearByLocationName: "",
    nearByLocationDistance: 0,
    nearByLocationTag: "",
  });

  const handlePlaceSelected = (place: any) => {
    setAddress(place.address);
    setCountry(place.country);
    setState(place.state);
    setCity(place.city);
    setStreet(place.street);
    setPostalCode(place.postalCode);
    setArea(place.area);
    setNeighborhood(place.neighbourhood);
    setSubArea(place.subArea);
    setFloor(place.floor);
    setTopFloor(place.topFloor);
    setOrientation(place.orientation);
    setCenter({ lat: place.lat, lng: place.lng });
    setConstructionYear(place.constructionYear);
    setHeatingType(place.heatingType);
    setEnergyClass(place.energyClass);
    setHeatingMedium(place.heatingmedium);
    setMonthlyExpenses(place.commonExpenses);
    setisSuitableForStudents(place.isStudentLive);
    setZones(place.zones);
    setLevel(place.level);
    setPropetyStyle(place.propertyStyle);
  };

  const [page2, setPage2] = useState<Page2State>({
    country,
    street,
    city,
    state,
    postalCode,
    center,
    address,
    area,
    subarea,
    neighbourhood,
    floor,
    isTopFloor,
    orientation,
    levels,
    zones,
    propertyStyle,
    isSuitableForStudents,
    monthlyExpenses,
    heatingMedium,
    energyClass,
    heatingType,
    constructionYear,
    nearbyLocations: {
      nearByLocationName: [],
      nearByLocationDistance: [],
      nearByLocationTag: [],
    },
  });

  useEffect(() => {
    const newPage2: Page2State = {
      country,
      street,
      city,
      state,
      postalCode,
      center,
      address,
      area,
      subarea,
      neighbourhood,
      floor,
      isTopFloor,
      orientation,
      levels,
      zones,
      propertyStyle,
      isSuitableForStudents,
      monthlyExpenses,
      heatingMedium,
      energyClass,
      heatingType,
      constructionYear,
      nearbyLocations,
    };
    setPage2(newPage2);
    localStorage.setItem("page2", JSON.stringify(newPage2));
  }, [
    country,
    street,
    city,
    state,
    postalCode,
    center,
    area,
    subarea,
    neighbourhood,
    floor,
    isTopFloor,
    orientation,
    levels,
    zones,
    propertyStyle,
    isSuitableForStudents,
    monthlyExpenses,
    heatingMedium,
    energyClass,
    heatingType,
    constructionYear,
    nearbyLocations,
  ]);

  // Validation function
  const [isValidForm, setIsValidForm] = useState(false);
  const validateForm = () => {
    const missingFields: string[] = [];

    if (!country) missingFields.push("Country");
    if (!street) missingFields.push("Street");
    if (!city) missingFields.push("City");
    if (!state) missingFields.push("State");
    if (!postalCode) missingFields.push("Postal Code");

    if (missingFields.length > 0) {
      setIsValidForm(false);
      return false;
    }
    setIsValidForm(true);
    return true;
  };

  const addNearByLocation = () => {
    console.log("clicked");
    if (
      nearByLocationInput.nearByLocationName === "" ||
      nearByLocationInput.nearByLocationDistance === 0 ||
      nearByLocationInput.nearByLocationTag === ""
    ) {
      console.log("returning");
      return;
    }
    console.log("nearByLocation: ", nearbyLocations);
    setNearByLocations((prev) => {
      const newObj = { ...prev };
      console.log("newObj: ", newObj);
      newObj["nearByLocationName"] = [
        ...newObj["nearByLocationName"],
        nearByLocationInput.nearByLocationName,
      ];
      newObj["nearByLocationDistance"] = [
        ...newObj["nearByLocationDistance"],
        nearByLocationInput.nearByLocationDistance,
      ];
      newObj["nearByLocationTag"] = [
        ...newObj["nearByLocationTag"],
        nearByLocationInput.nearByLocationTag,
      ];
      return newObj;
    });

    setNearByLocationInput({
      nearByLocationName: "",
      nearByLocationDistance: 0,
      nearByLocationTag: "",
    });
  };

  const removeNearByLocation = (index: number) => {

    const newObj = {...nearbyLocations};
    newObj["nearByLocationName"].splice(index, 1);
    newObj["nearByLocationDistance"].splice(index, 1);
    newObj["nearByLocationTag"].splice(index, 1);
    setNearByLocations(newObj);

  };

  useEffect(() => {
    validateForm();
  }, [country, street, city, state, postalCode]);

  return (
    <div>
      <h2 className="text-2xl mb-2 font-semibold border-b border-primary pb-2">
        Choose the country
      </h2>
      <FormItem label="Country/Region">
        <Select value={country} onValueChange={(value) => setCountry(value)}>
          <SelectTrigger>
            <span>{country}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Greece">Greece</SelectItem>
            <SelectItem value="Italy">Italy</SelectItem>
            <SelectItem value="Cyprus">Cyprus</SelectItem>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="Netherlands">Netherlands</SelectItem>
            <SelectItem value="UK">UK</SelectItem>
            <SelectItem value="Hungary">Hungary</SelectItem>
            <SelectItem value="Turkey">Turkey</SelectItem>
            <SelectItem value="Bulgaria">Bulgaria</SelectItem>
            <SelectItem value="Lithuania">Lithuania</SelectItem>
            <SelectItem value="Malta">Malta</SelectItem>
            <SelectItem value="Romania">Romania</SelectItem>
            <SelectItem value="Spain">Spain</SelectItem>
            <SelectItem value="Croatia">Croatia</SelectItem>
            <SelectItem value="Portugal">Portugal</SelectItem>
            <SelectItem value="Slovenia">Slovenia</SelectItem>
            <SelectItem value="Slovakia">Slovakia</SelectItem>
            <SelectItem value="Viet Nam">Viet Nam</SelectItem>
            <SelectItem value="Thailand">Thailand</SelectItem>
            <SelectItem value="France">France</SelectItem>
            <SelectItem value="Singapore">Singapore</SelectItem>
            <SelectItem value="Japan">Japan</SelectItem>
            <SelectItem value="Korea">Korea</SelectItem>{" "}
          </SelectContent>{" "}
        </Select>{" "}
      </FormItem>
      <div className="flex flex-col my-4">
        <div className="ml-2 ">
          <LoadScript
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            libraries={["places"]}
          >
            <div className="mt-2 mb-2">
              <PlacesAutocomplete
                onPlaceSelected={handlePlaceSelected}
                countryCode={country}
              />
            </div>
          </LoadScript>
        </div>
        <div className="w-full">
          <FormItem label="Street">
            <Input
              placeholder="..."
              value={street}
              onChange={(e) => {
                const trimmedValue = e.target.value.replace(/\s{2,}/g, " ");
                setStreet(trimmedValue);
              }}
            />
          </FormItem>
        </div>
      </div>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-5">
          <FormItem label="City">
            <Input
              value={city}
              onChange={(e) => {
                const trimmedValue = e.target.value
                  .trim()
                  .replace(/\s{2,}/g, " ");
                setCity(trimmedValue);
              }}
            />
          </FormItem>
          <FormItem label="State">
            <Input value={state} onChange={(e) => setState(e.target.value)} />
          </FormItem>
          <FormItem label="Postal code">
            <Input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.trim())}
            />
          </FormItem>
          <div className="ml-3">
            <h1>Coordinates</h1>
            <div className="flex gap-32 w-full mt-2">
              <div className="flex gap-2">
                <h4 className=" text-sm">Latitude: </h4>
                <h4 className=" text-sm">{center.lat}</h4>
              </div>
              <div className="flex gap-2">
                <h4 className="text-sm">Longitude: </h4>
                <h4 className="text-sm">{center.lng}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="ml-3">
          <label htmlFor="">Detailed Address</label>
          <div className="mt-1 text-sm  text-neutral-500 dark:text-neutral-400 flex gap-x-3">
            <h2 className="flex gap-x-1">
              Street:<span>{street}</span>{" "}
            </h2>
            <h2 className="flex gap-x-1">
              City:<span>{city}</span>{" "}
            </h2>
            <h2 className="flex gap-x-1">
              State: <span>{state}</span>{" "}
            </h2>
            <h2 className="flex gap-x-1">
              Country:<span>{country}</span>
            </h2>
          </div>
          <div className="mt-4">
            <div className="aspect-w-5 aspect-h-5 sm:aspect-h-3">
              <LocationMap latitude={center.lat} longitude={center.lng} />
            </div>
          </div>
        </div>
      </div>

      <div className=" mt-2">
        <div className=" text-xl flex gap-x-1 items-center mt-4 mb-2">
          Nearby Locations
          <FaLocationDot className=" text-sm" />
        </div>

        <div className=" flex w-full justify-between ">
          <div className="flex flex-col gap-y-1 w-1/3 ">
            <FormItem label="Place Name">
              <Input
                placeholder="Nearby Location Place Name"
                value={nearByLocationInput?.["nearByLocationName"]}
                onChange={(e) => {
                  setNearByLocationInput((prev) => {
                    const newObj = { ...prev };
                    newObj["nearByLocationName"] = e.target.value;
                    return newObj;
                  });
                }}
              />
            </FormItem>
          </div>
          <div className="flex flex-col gap-y-1 w-1/5">
            <FormItem label="Distance">
              <Input
                type="number"
                placeholder="Distance in meters"
                value={nearByLocationInput?.["nearByLocationDistance"]}
                onChange={(e) => {
                  setNearByLocationInput((prev) => {
                    const newObj = { ...prev };
                    newObj["nearByLocationDistance"] = parseInt(
                      e.target.value,
                      10
                    );
                    return newObj;
                  });
                }}
              />
            </FormItem>
          </div>
          <div className="flex flex-col gap-y-1 w-1/3">
            <label htmlFor="nearByLocationInputTag"> Location Tag</label>
            <Select
              value={nearByLocationInput?.["nearByLocationTag"]}
              onValueChange={(value) => {
                setNearByLocationInput((prev) => {
                  console.log("value changed: ", value);
                  const newObj = { ...prev };
                  newObj["nearByLocationTag"] = value;
                  return newObj;
                });
              }}
            >
              <SelectTrigger>
                <span>{nearByLocationInput?.["nearByLocationTag"]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Restaurant">Restaurant</SelectItem>
                <SelectItem value="Cafe">Cafe</SelectItem>
                <SelectItem value="Mall">Mall</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className=" w-1/12 flex items-end justify-center">
            <Button
              type="button"
              onClick={(e) => addNearByLocation()}
              className=""
            >
              <Plus className=" w-4 h-4 font-medium" />
            </Button>
          </div>
        </div>

        <div className=" w-full flex flex-col mt-2 gap-y-1">
          {nearbyLocations?.nearByLocationName?.map((item, index) => (
            <div key={index} className=" flex justify-between">
              <div className=" w-1/3 px-2 flex justify-center">
                {nearbyLocations.nearByLocationName[index]}
              </div>
              <div className=" w-1/5 px-2 flex justify-center">
                {nearbyLocations.nearByLocationDistance[index]}
              </div>
              <div className=" w-1/3 px-2 flex justify-center">
                {nearbyLocations.nearByLocationTag[index]}
              </div>

              <div className=" w-1/12 flex items-end justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => removeNearByLocation(index)}
                  className=""
                >
                  <IoRemoveSharp className=" w-4 h-4 font-medium" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* This code only rebder if the rentalType is Longterm */}
      {(type === "Long Term" || type === "Both") && (
        <div>
          <div className="text-2xl mt-3 font-semibold border-b border-primary pb-2 ">
            Longterm Input
          </div>
          <div className="my-4">
            <FormItem label="Choose Area">
              <Select value={area} onValueChange={(value) => setArea(value)}>
                <SelectTrigger>
                  <span>{area}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Centre">Centre</SelectItem>
                  <SelectItem value="East">East</SelectItem>
                  <SelectItem value="West">West</SelectItem>
                  <SelectItem value="North">North</SelectItem>
                  <SelectItem value="South">South</SelectItem>
                  <SelectItem value="North East">North East</SelectItem>
                  <SelectItem value="North West">North West</SelectItem>
                  <SelectItem value="South East">South East</SelectItem>
                  <SelectItem value="South West">South West</SelectItem>
                  <SelectItem value="Northeast">Northeast</SelectItem>
                  <SelectItem value="Northwest">Northwest</SelectItem>
                  <SelectItem value="Southeast">Southeast</SelectItem>
                  <SelectItem value="Southwest">Southwest</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          </div>

          <div className="w-full my-3">
            <FormItem label="SubArea">
              <Input
                placeholder="SubArea"
                value={subarea}
                onChange={(e) => setSubArea(e.target.value)}
              />
            </FormItem>
          </div>
          <div className="w-full">
            <FormItem label="Neighborhood">
              <Input
                placeholder="Neighborhood"
                value={neighbourhood}
                onChange={(e) => setNeighborhood(e.target.value)}
              />
            </FormItem>
          </div>
          <div className="w-full">
            <FormItem label="Floor">
              <Input
                type="number"
                placeholder="How many floor in numbers"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
            </FormItem>
          </div>

          <div className="my-4">
            <FormItem label="Is Topfloor">
              <Select
                value={isTopFloor}
                onValueChange={(value) => setTopFloor(value)}
              >
                <SelectTrigger>
                  <span>{isTopFloor}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          </div>
          <div className="my-4">
            <FormItem label="Orientation">
              <Select
                value={orientation}
                onValueChange={(value) => setOrientation(value)}
              >
                <SelectTrigger>
                  <span>{orientation}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="East-Facing">East-Facing</SelectItem>
                  <SelectItem value="West-Facing">West-Facing</SelectItem>
                  <SelectItem value="Nort-Facing">Nort-Facing</SelectItem>
                  <SelectItem value="South-Facing">South-Facing</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          </div>

          <div className="w-full">
            <FormItem label="Level">
              <Input
                type="number"
                placeholder="How many level "
                value={levels}
                min={0}
                max={50}
                inputMode="decimal"
                onChange={(e) => setLevel(e.target.value)}
              />
            </FormItem>
          </div>
          <div className="my-4">
            <FormItem label="Zone">
              <Select value={zones} onValueChange={(value) => setZones(value)}>
                <SelectTrigger>
                  <span>{zones}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem defaultValue={"Residential"} value="Residential">
                    Residential
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          </div>
          <div className="my-4">
            <FormItem label="Property Style">
              <Select
                value={propertyStyle}
                onValueChange={(value) => setPropetyStyle(value)}
              >
                <SelectTrigger>
                  <span>{propertyStyle}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Renovated">Renovated</SelectItem>
                  <SelectItem value="Unfinished">Unfinished</SelectItem>
                  <SelectItem value="Luxury">Luxury</SelectItem>
                  <SelectItem value="Under-Construction">
                    Under Construction
                  </SelectItem>
                  <SelectItem value="Neo-Classical">NeoClassical</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          </div>

          <div className="my-4">
            <FormItem label="Heating Medium">
              <Select
                value={heatingMedium}
                onValueChange={(value) => setHeatingMedium(value)}
              >
                <SelectTrigger>
                  <span>{heatingMedium}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="Natural-gas">Natural gas</SelectItem>
                  <SelectItem value="Luxury">Luxury</SelectItem>
                  <SelectItem value="Under-Construction">
                    Under Construction
                  </SelectItem>
                  <SelectItem value="Gas-heating-system">
                    Gas heating system
                  </SelectItem>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="Stove">Stove</SelectItem>
                  <SelectItem value="Thermal-accumulator">
                    Thermal accumulator
                  </SelectItem>
                  <SelectItem value="Pellet">Pellet</SelectItem>
                  <SelectItem value="Infrared">Infrared</SelectItem>
                  <SelectItem value="Fan-coil">Fan coil</SelectItem>
                  <SelectItem value="Wood">Wood</SelectItem>
                  <SelectItem value="Teleheating">Teleheating</SelectItem>
                  <SelectItem value="Geothermal-energy">
                    Geothermal energy
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          </div>

          <div className="my-4">
            <FormItem label="Heating Type">
              <Select
                value={heatingType}
                onValueChange={(value) => setHeatingType(value)}
              >
                <SelectTrigger>
                  <span>{heatingType}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Autonomous-Heating">
                    Autonomous Heating
                  </SelectItem>
                  <SelectItem value="Central-Heating">
                    Central Heating
                  </SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          </div>

          <div className="my-4">
            <FormItem label="Is it suitable for Student">
              <Select
                value={isSuitableForStudents}
                onValueChange={(value) => setisSuitableForStudents(value)}
              >
                <SelectTrigger>
                  <span>{isSuitableForStudents}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          </div>

          <div className="w-full my-3">
            <FormItem label="Energy Class">
              <Input
                type="text"
                placeholder="Energy Class"
                value={energyClass}
                onChange={(e) => setEnergyClass(e.target.value)}
              />
            </FormItem>
          </div>

          <div className="w-full my-3">
            <FormItem label="Construction Year">
              <Input
                type="number"
                placeholder="Construction Year"
                value={constructionYear}
                onChange={(e) => setConstructionYear(e.target.value)}
              />
            </FormItem>
          </div>

          <div className="w-full my-3">
            <FormItem label="Monthly Expenses">
              <Input
                type="number"
                placeholder="Common expenses"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(e.target.value)}
              />
            </FormItem>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-x-4 ml-2 mb-4">
        <Link
          href={{
            pathname: `/dashboard/add-listing/1`,
            query: { userId: userId },
          }}
        >
          <Button>Go Back</Button>
        </Link>

        <Button disabled={!isValidForm}>
          <Link
            href={{
              pathname: `/dashboard/add-listing/3`,
              query: { userId: userId },
            }}
          >
            Continue
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default PageAddListing2;
