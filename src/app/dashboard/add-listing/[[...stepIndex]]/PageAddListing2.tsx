"use client";

import React, { FC, useEffect, useState } from "react";
import FormItem from "../FormItem";
import dynamic from "next/dynamic";
import { GoogleMap, LoadScript, Autocomplete } from "@react-google-maps/api";

const libraries: "places"[] = ["places"];
import { useToast } from "@/hooks/use-toast";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select"; 
import { Input } from "@/components/ui/input";
// import LocationMap from "@/components/LocationMap";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { FaLink, FaLocationDot } from "react-icons/fa6";
import { Plus } from "lucide-react";
import { IoRemoveSharp } from "react-icons/io5";
import { Label } from "@/components/ui/label";
import Heading from "@/components/Heading";
import axios from "axios";
import { AreaSelect } from "@/components/leadTableSearch/page";
import SearchableAreaSelect from "../../createquery/SearchAndSelect";

const Map = dynamic(() => import("@/components/LocationMap"), { ssr: false });

interface nearbyLocationInterface {
  nearbyLocationName: string[];
  nearbyLocationDistance: number[];
  nearbyLocationTag: string[];
  nearbyLocationUrl: string[];
}
interface Page2State {
  country: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  address: string;
  internalCity:string;
  internalArea:string;
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
  nearbyLocations: nearbyLocationInterface;
}


interface TargetType { _id: string; city: string; areas: AreaType[]; }
interface AreaType { _id: string; city: string; name: string; }

const PageAddListing2: FC = () => {
  const { toast } = useToast();
  const params = useSearchParams();
  const userId = params.get("userId");
  const [type, setType] = useState<string>("");
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [areas, setAreas] = useState<AreaType[]>([]);
  const [internalCity,setInternalCity]=useState<string>("");
  const [internalArea,setInternalArea]=useState<string>("");
  const [constructionYear, setConstructionYear] = useState<string>("");
  const [heatingType, setHeatingType] = useState<string>("");
  const [energyClass, setEnergyClass] = useState<string>("");
  const [heatingMedium, setHeatingMedium] = useState<string>("");
  const [monthlyExpenses, setMonthlyExpenses] = useState<string>("");
  const [isSuitableForStudents, setisSuitableForStudents] =
    useState<string>("");
  const [propertyStyle, setPropetyStyle] = useState<string>("");
  const [zones, setZones] = useState<string>("");
  const [levels, setLevel] = useState<string>("");
  const [orientation, setOrientation] = useState<string>("");
  const [isTopFloor, setTopFloor] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [neighbourhood, setNeighborhood] = useState<string>("");
  const [subarea, setSubArea] = useState<string>("");
  const [floor, setFloor] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [street, setStreet] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [areas1, setAreas1] = useState<AreaType[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: 0,
    lng: 0,
  });
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);    
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  const [nearbyLocations, setNearByLocations] =
    useState<nearbyLocationInterface>({
      nearbyLocationName: [],
      nearbyLocationDistance: [],
      nearbyLocationTag: [],
      nearbyLocationUrl: [],
    });

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load page1 data
      const page1 = localStorage.getItem("page1");
      if (page1) {
        try {
          const parsedData = JSON.parse(page1);
          setType(parsedData.rentalType || "");
        } catch (e) {
          setType("");
        }
      }

      // Load page2 data
      const page2 = localStorage.getItem("page2");
      if (page2) {
        try {
          const parsedData = JSON.parse(page2);

          setConstructionYear(parsedData["constructionYear"] || "");
          setHeatingType(parsedData["heatingType"] || "");
          setEnergyClass(parsedData["energyClass"] || "");
          setHeatingMedium(parsedData["heatingMedium"] || "");
          setMonthlyExpenses(parsedData["monthlyExpenses"] || "");
          setisSuitableForStudents(
            parsedData["isSuitableForStudents"] !== undefined
              ? parsedData["isSuitableForStudents"]
              : ""
          );
          setInternalCity(parsedData["internalCity"] || "");
          setInternalArea(parsedData["internalArea"] || "");
          setPropetyStyle(parsedData["propertyStyle"] || "");
          setZones(parsedData["zones"] || "");
          setLevel(parsedData["levels"] || "");
          setOrientation(parsedData["orientation"] || "");
          setTopFloor(parsedData["isTopFloor"] || "");
          setArea(parsedData["area"] || "");
          setNeighborhood(parsedData["neighbourhood"] || "");
          setSubArea(parsedData["subarea"] || "");
          setFloor(parsedData["floor"] || "");
          setAddress(parsedData["address"] || "");
          setCountry(parsedData["country"] || "");
          setState(parsedData["state"] || "");
          setCity(parsedData["city"] || "");
          setStreet(parsedData["street"] || "");
          setPostalCode(parsedData["postalCode"] || "");
          setCenter(parsedData["center"] || { lat: 0, lng: 0 });

          setNearByLocations(
            parsedData["nearbyLocations"] || {
              nearbyLocationName: [],
              nearbyLocationDistance: [],
              nearbyLocationTag: [],
              nearbyLocationUrl: [],
            }
          );
        } catch (e) {
          console.error("Error parsing page2", e);
        }
      }
    }
  }, []);

  const [nearbyLocationInput, setNearbyLocationInput] = useState({
    nearbyLocationName: "",
    nearbyLocationDistance: 0,
    nearbyLocationTag: "",
    nearbyLocationUrl: "",
  });

  // const handlePlaceSelected = (place: any) => {
  //   setAddress(place.address);
  //   setCountry(place.country);
  //   setState(place.state);
  //   setCity(place.city);
  //   setStreet(place.street);
  //   setPostalCode(place.postalCode);
  //   setArea(place.area);
  //   setNeighborhood(place.neighbourhood);
  //   setSubArea(place.subArea);
  //   setFloor(place.floor);
  //   setTopFloor(place.topFloor);
  //   setOrientation(place.orientation);
  //   setCenter({ lat: place.lat, lng: place.lng });
  //   setConstructionYear(place.constructionYear);
  //   setHeatingType(place.heatingType);
  //   setEnergyClass(place.energyClass);
  //   setHeatingMedium(place.heatingmedium);
  //   setMonthlyExpenses(place.commonExpenses);
  //   setisSuitableForStudents(place.isStudentLive);
  //   setZones(place.zones);
  //   setLevel(place.level);
  //   setPropetyStyle(place.propertyStyle);
  // };

  const [page2, setPage2] = useState<Page2State>({
    country,
    street,
    city,
    state,
    internalCity,
    internalArea,
    postalCode,
    center,
    address,
    area,
    subarea,
    neighbourhood,
    floor: Number(floor) || 0,
    isTopFloor,
    orientation,
    levels: Number(levels) || 0,
    zones,
    propertyStyle,
    isSuitableForStudents,
    monthlyExpenses,
    heatingMedium,
    energyClass,
    heatingType,
    constructionYear,
    nearbyLocations: {
      nearbyLocationName: [],
      nearbyLocationDistance: [],
      nearbyLocationTag: [],
      nearbyLocationUrl: [],
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
      internalCity,
      internalArea,
      area,
      subarea,
      neighbourhood,
      floor: Number(floor) || 0,
      isTopFloor: isTopFloor === "true" ? "true" : "false", // Keep string but match your Page2State expectations
      orientation,
      levels: Number(levels) || 0,
      zones,
      propertyStyle,
      isSuitableForStudents:
        isSuitableForStudents === "true" ? "true" : "false", // same approach
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
    internalCity,
    internalArea,
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
      nearbyLocationInput.nearbyLocationName === "" ||
      nearbyLocationInput.nearbyLocationDistance === 0 ||
      nearbyLocationInput.nearbyLocationTag === ""
    ) {
      console.log("returning");
      return;
    }
    console.log("nearbyLocation: ", nearbyLocations);
    setNearByLocations((prev) => {
      const newObj = { ...prev };
      console.log("newObj: ", newObj);
      newObj["nearbyLocationName"] = [
        ...newObj["nearbyLocationName"],
        nearbyLocationInput.nearbyLocationName,
      ];
      newObj["nearbyLocationDistance"] = [
        ...newObj["nearbyLocationDistance"],
        nearbyLocationInput.nearbyLocationDistance,
      ];
      newObj["nearbyLocationTag"] = [
        ...newObj["nearbyLocationTag"],
        nearbyLocationInput.nearbyLocationTag,
      ];
      newObj["nearbyLocationUrl"] = [
        ...newObj["nearbyLocationUrl"],
        nearbyLocationInput.nearbyLocationUrl,
      ];
      return newObj;
    });

    setNearbyLocationInput({
      nearbyLocationName: "",
      nearbyLocationDistance: 0,
      nearbyLocationTag: "",
      nearbyLocationUrl: "",
    });
  };

  const removeNearByLocation = (index: number) => {
    const newObj = { ...nearbyLocations };
    newObj["nearbyLocationName"].splice(index, 1);
    newObj["nearbyLocationDistance"].splice(index, 1);
    newObj["nearbyLocationTag"].splice(index, 1);
    newObj["nearbyLocationUrl"].splice(index, 1);
    setNearByLocations(newObj);
  };

  const handleLoad = (auto: google.maps.places.Autocomplete) => {
    setAutocomplete(auto);
  };

  const handlePlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      console.log("place: ", place);

      if (place.formatted_address) {
        handlePlaceSelected(place);
      }
    }
  };

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    // Helper to extract component by type
    const getComponent = (type: string) => {
      const comp = place.address_components?.find((c) =>
        c.types.includes(type)
      );
      return comp ? comp.long_name : "";
    };

    const lat = place.geometry?.location?.lat() ?? 0;
    const lng = place.geometry?.location?.lng() ?? 0;

    setAddress(place.formatted_address ?? "");
    setCountry(getComponent("country"));
    setState(getComponent("administrative_area_level_1"));
    setCity(
      getComponent("locality") || getComponent("administrative_area_level_2")
    );
    setStreet(getComponent("route"));
    setPostalCode(getComponent("postal_code"));
    setArea(getComponent("sublocality") || getComponent("neighborhood"));
    setNeighborhood(getComponent("neighborhood"));
    setSubArea(getComponent("sublocality_level_1"));
    setCenter({ lat, lng });
  };

  useEffect(() => {
    validateForm();
  }, [country, street, city, state, postalCode]);

    useEffect(() => {
    const fetchTargets = async () => {
      try {
        const res = await axios.get("/api/addons/target/getAreaFilterTarget");
        // const data = await res.json();
        setTargets(res.data.data); 
        console.log("targets: ", res.data.data);
      } catch (error) {
        console.error("Error fetching targets:", error);
      } 
    };
    fetchTargets();
  }, []);

    useEffect(() => {
      const target = targets.find((t) => t.city === selectedLocation);
      if (target) {
        setAreas1(target.areas);
      } else {
        setAreas1([]);
      }
    }, [selectedLocation, targets]);


  return (
    <div>
      <Heading
        heading="Choose the country"
        subheading="Choose country that best describes your listing"
      />
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
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
            libraries={libraries}
            onLoad={() => setIsGoogleLoaded(true)}
            onError={() =>
              toast({
                variant: "destructive",
                title: "Google Maps failed to load",
                description: "Please refresh or verify your API key/network.",
              })
            }
          >
            {/* Ensure all Google Maps related components (like Autocomplete) 
        are children of LoadScript and/or guarded by isGoogleLoaded if outside. */}
            {isGoogleLoaded && (
              <Autocomplete
                onLoad={handleLoad}
                onPlaceChanged={handlePlaceChanged}
              >
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Search Address"
                  className="w-full p-2 border rounded"
                />
              </Autocomplete>
            )}
          </LoadScript>
        </div>

        {/* <div>
           <Select
            onValueChange={(value) =>{
              //  setFilters({ ...filters, place: value });
               setSelectedLocation(value);
            }
            }
            value={selectedLocation}
          >
            <SelectTrigger className=" w-44 border border-neutral-700">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Locations</SelectLabel>
                {targets.map((loc: any) => (
                  <SelectItem key={loc.city} value={loc.city}>
                    <div className="flex justify-between items-center w-full">
                      <span>{loc.city}</span>
                    </div>
                  </SelectItem>
                ))}
                {

                }
              </SelectGroup>
            </SelectContent>
          </Select>
        </div> */}

        {/* <div className="w-44">
          <AreaSelect
            maxWidth="100%"
            data={
              [...areas] // ✅ copy array
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((loc: Area) => ({
                  label: loc.name,
                  value: loc.name,
                }))
            }
            value={filters.area || ""}
            save={(newValue: string) => {
              setFilters({ ...filters, area: newValue });
            }}
            tooltipText="Select an area"
          />
        </div> */}

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
      <div>
        <div className="w-full ml-1 mb-2">
          <Label>Location</Label>
          <Select
            onValueChange={(value) => {
              setInternalCity(value);
              setSelectedLocation(value);
            }}
            value={internalCity}
          >
            <SelectTrigger className=" w-44 border border-neutral-700">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Locations</SelectLabel>
                {targets.map((loc: any) => (
                  <SelectItem key={loc.city} value={loc.city}>
                    <div className="flex justify-between items-center w-full">
                      <span>{loc.city}</span>
                    </div>
                  </SelectItem>
                ))}
                {}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full ml-1 mb-2">
          <Label>Area</Label>
          <SearchableAreaSelect
            areas={areas1}
            onSelect={(area) => setInternalArea(area.name)}
          />
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
              <Map latitude={center.lat} longitude={center.lng} />
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
          <div className=" flex flex-col w-full justify-between ">
            <div className=" flex w-full justify-between ">
              <div className="flex flex-col gap-y-1 w-1/3 ">
                <FormItem label="Place Name">
                  <Input
                    placeholder="Nearby Location Place Name"
                    value={nearbyLocationInput?.["nearbyLocationName"]}
                    onChange={(e) => {
                      setNearbyLocationInput((prev) => {
                        const newObj = { ...prev };
                        newObj["nearbyLocationName"] = e.target.value;
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
                    value={nearbyLocationInput?.["nearbyLocationDistance"]}
                    onChange={(e) => {
                      setNearbyLocationInput((prev) => {
                        const newObj = { ...prev };
                        newObj["nearbyLocationDistance"] = parseInt(
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
                <label htmlFor="nearbyLocationInputTag"> Location Tag</label>
                <Select
                  value={nearbyLocationInput?.["nearbyLocationTag"]}
                  onValueChange={(value) => {
                    setNearbyLocationInput((prev) => {
                      console.log("value changed: ", value);
                      const newObj = { ...prev };
                      newObj["nearbyLocationTag"] = value;
                      return newObj;
                    });
                  }}
                >
                  <SelectTrigger>
                    <span>{nearbyLocationInput?.["nearbyLocationTag"]}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Restaurant">Restaurant</SelectItem>
                    <SelectItem value="Cafe">Cafe</SelectItem>
                    <SelectItem value="Mall">Mall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Label className=" my-2 ml-1">Nearby Place Goole Map Url</Label>
            <div className=" flex w-full ml-1">
              <Input
                placeholder="Nearby Place Goole Map Url"
                value={nearbyLocationInput?.["nearbyLocationUrl"]}
                className=" w-full"
                onChange={(e) => {
                  setNearbyLocationInput((prev) => {
                    const newObj = { ...prev };
                    newObj["nearbyLocationUrl"] = e.target.value;
                    return newObj;
                  });
                }}
              />
            </div>
          </div>

          {/* // add nearby location Button */}
          <div className=" w-1/12 flex items-center justify-center">
            <Button
              type="button"
              onClick={(e) => addNearByLocation()}
              className=""
            >
              <Plus className=" w-4 h-4 font-medium" />
            </Button>
          </div>
        </div>

        <div className=" w-full flex flex-col mt-4 gap-y-1">
          {nearbyLocations?.nearbyLocationName?.map((item, index) => (
            <div key={index} className=" flex justify-between w-full">
              <div className=" w-11/12 flex flex-col">
                <div className=" w-full flex justify-between">
                  <div className=" w-1/3 px-2 flex justify-center">
                    {nearbyLocations.nearbyLocationName[index]}
                  </div>

                  <div className=" w-1/5 px-2 flex justify-center">
                    {nearbyLocations.nearbyLocationDistance[index]}
                  </div>

                  <div className=" w-1/3 px-2 flex justify-center">
                    {nearbyLocations.nearbyLocationTag[index]}
                  </div>
                </div>

                <div className=" w-full px-2 flex justify-center items-center overflow-hidden">
                  {/* {nearbyLocations.nearbyLocationUrl[index]} */}
                  <Input
                    disabled
                    value={nearbyLocations.nearbyLocationUrl[index]}
                    className=" overflow-auto"
                  />
                  <Link
                    href={nearbyLocations.nearbyLocationUrl[index]}
                    target="_blank"
                    className=" ml-1"
                  >
                    <div className=" border rounded-lg p-2 bg-secondary">
                      {" "}
                      <FaLink className=" w-4 h-4 font-medium" />
                    </div>
                  </Link>
                </div>
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
          <Heading
            heading="Longterm inputs"
            subheading="These input belongs to longterm only"
          />
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
                  <span>{isTopFloor === "true" ? "true" : "false"}</span>
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
                  <SelectItem value="North-East">North-East</SelectItem>
                  <SelectItem value="North-West">North-West</SelectItem>
                  <SelectItem value="South-East">South-East</SelectItem>
                  <SelectItem value="South-West">South-West</SelectItem>
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
                  <span>
                    {isSuitableForStudents === "true" ? "True" : "False"}
                  </span>
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
