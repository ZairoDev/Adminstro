"use client";
import React, { useState, useEffect } from "react";
import Heading from "@/components/Heading";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import axios from "axios";
import { Button } from "@/components/ui/button";
import ImageCard from "@/components/imagecard/ImageCard";
import {
  CalendarDaysIcon,
  LoaderCircle,
  Plus,
  Ratio,
  Trash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

interface GeneralAmenities {
  [key: string]: boolean;
}
interface Otheramenities {
  [key: string]: boolean;
}
interface PageProps {
  params: {
    id: string[];
  };
  generalAmenities: GeneralAmenities;
}

const PortionDetailsPage: React.FC<PageProps> = ({ params }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [propertyData, setPropertyData] = useState<any[]>([]);
  const [selectedPortion, setSelectedPortion] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await axios.post("/api/property/gerPropertyByCommonId", {
        commonId: params.id[0],
      });
      console.log(response.data.commonIdProperties);
      setPropertyData(response.data.commonIdProperties);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching properties:", error);
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProperties();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    if (selectedPortion === null) return;
    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      [field]: e.target.value,
    };
    setPropertyData(updatedData);
  };

  const [propertyLoading, setPropertyLoading] = useState(false);

  // Handle nearby location code started from here



  // Amenties handling here...

  const handleOthersAmentiesChange = (amenity: string, checked: boolean) => {
    if (selectedPortion === null) return;
    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      otherAmenities: {
        ...updatedData[selectedPortion].otherAmenities,
        [amenity]: checked,
      },
    };
    setPropertyData(updatedData);
  };

  const handleGeneraleAmentiesChange = (amenity: string, checked: boolean) => {
    if (selectedPortion === null) return;
    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      generalAmenities: {
        ...updatedData[selectedPortion].generalAmenities,
        [amenity]: checked,
      },
    };
    setPropertyData(updatedData);
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    if (selectedPortion === null) return;

    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      safeAmenities: {
        ...updatedData[selectedPortion].safeAmenities,
        [amenity]: checked,
      },
    };
    setPropertyData(updatedData);
  };
  const [newRule, setNewRule] = useState("");
  const handleAddRule = () => {
    if (newRule.trim() === "" || selectedPortion === null) return;

    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      additionalRules: [
        ...updatedData[selectedPortion].additionalRules,
        newRule,
      ],
    };
    setPropertyData(updatedData);
    setNewRule("");
  };

  const handleDeleteRule = (index: number) => {
    if (selectedPortion === null) return;

    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      additionalRules: updatedData[selectedPortion].additionalRules.filter(
        (_: any, i: any) => i !== index
      ),
    };
    setPropertyData(updatedData);
  };


  
  // Edit property api call
  const editproperty = async () => {
    if (selectedPortion === null) return;
    const PropertyId = propertyData[selectedPortion]._id;
    try {
      setPropertyLoading(true);
      const response = await axios.post("/api/property/editProperty", {
        PropertyId,
        propertyData: propertyData[selectedPortion],
      });
      console.log("Property updated successfully:", response.data);
      toast({
        description: "Property updated successfully",
      });
      setPropertyLoading(false);
    } catch (error: any) {
      console.log(error, "This error belongs to edit property");
      setPropertyLoading(false);
    }
  };
  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center">
          <LoaderCircle size={18} className="animate-spin" />
        </div>
      ) : (
        <Card className="w-full">
          <CardContent className="p-0">
            <div className="flex flex-col h-[92vh]  md:flex-row ">
              <div className="w-full md:w-[30%] min-h-40 border-b-2  md:border-0  p-4 overflow-y-auto">
                <Heading
                  heading="List of portions"
                  subheading="You need to hit the update button after changing any details"
                />
                <div className="mt-4 space-y-2">
                  {propertyData.map((portion: any, index: number) => (
                    <div
                      key={portion.VSID}
                      className={
                        selectedPortion === index
                          ? "w-full text-sm justify-start cursor-pointer rounded-l-sm bg-primary/40 border-r-4  px-2 py-1 border-primary "
                          : "w-full text-sm justify-start py-1 cursor-pointer px-2 "
                      }
                      onClick={() => setSelectedPortion(index)}
                    >
                      <p className="text-sm flex items-center gap-x-2 ">
                        <Ratio size={14} className="ml-2" />
                        Portion {index + 1}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <Separator orientation="vertical" className="hidden md:block" />
              <div className="w-full  p-4 overflow-y-scroll">
                <AnimatePresence mode="wait">
                  {selectedPortion !== null && propertyData[selectedPortion] ? (
                    <motion.div
                      key={selectedPortion}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-1"
                    >
                      <Heading
                        heading={`Portion no ${selectedPortion + 1}`}
                        subheading={`Here’s everything about Portion ${
                          selectedPortion + 1
                        } edit wisely, or don’t. No pressure!`}
                      />
                      <p className="text-base">
                        Main picture of portion {selectedPortion + 1}
                      </p>
                      <img
                        src={propertyData[selectedPortion].propertyCoverFileUrl}
                        alt={`Portion ${selectedPortion + 1}`}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <p>Remaining pictures of portion {selectedPortion + 1}</p>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {propertyData[selectedPortion].propertyPictureUrls.map(
                          (url: string, index: number) => (
                            <ImageCard
                              key={index}
                              src={url}
                              alt={`Image ${index + 1} of ${
                                propertyData[selectedPortion].propertyName
                              }`}
                            />
                          )
                        )}
                      </div>
                      <div>
                        <p>Manage Calender</p>
                        <Link href="/">
                          <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm  file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring  focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50">
                            <CalendarDaysIcon className="mr-2 h-4 w-4" /> Tap to
                            open portion calender
                          </div>
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        <div className="opacity-70">
                          <Label className="w-full">Property Vsid</Label>
                          <Input
                            disabled
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].VSID}
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">Last updatedby</Label>
                          <Input
                            className="w-full"
                            disabled
                            defaultValue={propertyData[
                              selectedPortion
                            ]?.lastUpdatedBy.at(-1)}
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">Last updatedAt</Label>
                          <Input
                            disabled
                            className="w-full"
                            defaultValue={propertyData[
                              selectedPortion
                            ]?.lastUpdates.at(-1)}
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">Portion no</Label>
                          <Input
                            disabled
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].portionNo
                            }
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">Updated at</Label>
                          <Input
                            className="w-full"
                            disabled
                            defaultValue={
                              propertyData[selectedPortion].updatedAt
                            }
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">User Id</Label>
                          <Input
                            className="w-full"
                            disabled
                            defaultValue={propertyData[selectedPortion].userId}
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">Common Id</Label>
                          <Input
                            disabled
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].commonId
                            }
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">createdAt</Label>
                          <Input
                            disabled
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].createdAt
                            }
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">Email</Label>
                          <Input
                            disabled
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].email}
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">Property Id</Label>
                          <Input
                            disabled
                            className="w-full"
                            defaultValue={propertyData[selectedPortion]._id}
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">hosted From</Label>
                          <Input
                            disabled
                            onChange={(e) => handleInputChange(e, "hostedBy")}
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].hostedFrom
                            }
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">HostedFrom</Label>
                          <Input
                            disabled
                            onChange={(e) => handleInputChange(e, "hostedFrom")}
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].hostedFrom
                            }
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>
                        <div className="opacity-70">
                          <Label className="w-full">Number of Updation</Label>
                          <Input
                            disabled
                            className="w-full"
                            defaultValue={propertyData[selectedPortion]._v}
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>

                        <div className="opacity-70">
                          <Label className="w-full">Property Name</Label>
                          <Input
                            className="w-full"
                            disabled
                            defaultValue={
                              propertyData[selectedPortion].propertyName
                            }
                          />
                          <p className="text-xs text-red-300 ml-2">
                            can not edit
                          </p>
                        </div>

                        <div className="">
                          <Label className="">Tap to Edit</Label>
                          <div className=" flex h-10 w-full rounded-md justify-between items-center border border-input bg-background px-2 py-3 text-sm ">
                            <Label className="w-full">Instant Booking</Label>
                            <Switch
                              checked={
                                propertyData[selectedPortion]
                                  ?.isInstantBooking || false
                              }
                              onCheckedChange={(checked) => {
                                if (selectedPortion === null) return;
                                const updatedData = [...propertyData];
                                updatedData[selectedPortion] = {
                                  ...updatedData[selectedPortion],
                                  isInstantBooking: checked,
                                };
                                setPropertyData(updatedData);
                              }}
                            />
                          </div>
                        </div>
                        <div className="">
                          <Label className="">Tap to Edit</Label>
                          <div className="flex h-10 w-full rounded-md justify-between items-center border border-input bg-background px-2 py-3 text-sm ">
                            <Label className="w-full">Live Status</Label>
                            <Switch
                              checked={
                                propertyData[selectedPortion]?.isLive || false
                              }
                              onCheckedChange={(checked) => {
                                if (selectedPortion === null) return;

                                const updatedData = [...propertyData];
                                updatedData[selectedPortion] = {
                                  ...updatedData[selectedPortion],
                                  isLive: checked,
                                };
                                setPropertyData(updatedData);
                              }}
                            />
                          </div>
                        </div>
                        <div className="">
                          <Label className="">Tap to Edit</Label>
                          <div className="flex h-10 w-full rounded-md border justify-between items-center border-input bg-background px-2 py-3 text-sm ">
                            <Label className="w-full">
                              Student Suitability
                            </Label>
                            <Switch
                              checked={
                                propertyData[selectedPortion]
                                  ?.isSuitableForStudents || false
                              }
                              onCheckedChange={(checked) => {
                                if (selectedPortion === null) return;
                                const updatedData = [...propertyData];
                                updatedData[selectedPortion] = {
                                  ...updatedData[selectedPortion],
                                  isSuitableForStudents: checked,
                                };
                                setPropertyData(updatedData);
                              }}
                            />
                          </div>
                        </div>
                        <div className="">
                          <Label className="">Tap to Edit</Label>
                          <div className="flex h-10 w-full rounded-md justify-between items-center border border-input bg-background px-2 py-3 text-sm ">
                            <Label className="w-full">Topfloor Status</Label>

                            <Switch
                              className=""
                              checked={
                                propertyData[selectedPortion]?.isTopFloor ||
                                false
                              }
                              onCheckedChange={(checked) => {
                                if (selectedPortion === null) return;
                                const updatedData = [...propertyData];
                                updatedData[selectedPortion] = {
                                  ...updatedData[selectedPortion],
                                  isTopFloor: checked,
                                };
                                setPropertyData(updatedData);
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="w-full">Base Price</Label>
                          <Input
                            className="w-full"
                            onChange={(e) => handleInputChange(e, "basePrice")}
                            defaultValue={
                              propertyData[selectedPortion].basePrice
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Property Area</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "area")}
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].area}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Baseprice Longterm</Label>
                          <Input
                            className="w-full"
                            onChange={(e) =>
                              handleInputChange(e, "basePriceLongTerm")
                            }
                            defaultValue={
                              propertyData[selectedPortion].basePriceLongTerm
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Bath Room</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "bathroom")}
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].bathroom
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Bedroom</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "bedroom")}
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].bedrooms
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Location(Lat)</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].center.lat
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Location(Lng)</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].center.lng
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Children Age</Label>
                          <Input
                            className="w-full"
                            onChange={(e) =>
                              handleInputChange(e, "childrenAge")
                            }
                            defaultValue={
                              propertyData[selectedPortion].childrenAge
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">City</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "city")}
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].city}
                          />
                        </div>

                        <div>
                          <Label className="w-full">Construction Year</Label>
                          <Input
                            onChange={(e) =>
                              handleInputChange(e, "constructionYear")
                            }
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].constructionYear
                            }
                          />
                        </div>
                        {/* <div>
                          <Label className="w-full">Cooking</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "cooking")}
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].cooking}
                          />
                        </div> */}

                        <div>
                          <Label className="w-full">Cooking</Label>
                          <Select
                            value={propertyData[selectedPortion]?.cooking || ""}
                            onValueChange={(value) => {
                              if (selectedPortion === null) return;

                              // Create a copy of propertyData and update the cooking field
                              const updatedData = [...propertyData];
                              updatedData[selectedPortion] = {
                                ...updatedData[selectedPortion],
                                cooking: value,
                              };
                              setPropertyData(updatedData);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select cooking option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Allow">Allow</SelectItem>
                              <SelectItem value="Do not allow">
                                Do not allow
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="w-full">Country</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "country")}
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].country}
                          />
                        </div>

                        <div>
                          <Label className="w-full">EnergyClass</Label>
                          <Input
                            className="w-full"
                            onChange={(e) =>
                              handleInputChange(e, "energyClass")
                            }
                            defaultValue={
                              propertyData[selectedPortion].energyClass
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Floor</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "floor")}
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].floor}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Guests</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "guests")}
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].guests}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Heating Medium</Label>
                          <Input
                            onChange={(e) =>
                              handleInputChange(e, "heatingMedium")
                            }
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].heatingMedium
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Heating Type</Label>
                          <Input
                            onChange={(e) =>
                              handleInputChange(e, "heatingType")
                            }
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].heatingType
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Hostedby</Label>
                          <Input
                            className="w-full"
                            onChange={(e) => handleInputChange(e, "hostedBy")}
                            defaultValue={
                              propertyData[selectedPortion].hostedBy
                            }
                          />
                        </div>

                        <div>
                          <Label className="w-full">kitchen</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "kitchen")}
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].kitchen}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Levels</Label>
                          <Input
                            className="w-full"
                            onChange={(e) => handleInputChange(e, "levels")}
                            defaultValue={propertyData[selectedPortion].levels}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Monthly Discount</Label>
                          <Input
                            className="w-full"
                            onChange={(e) =>
                              handleInputChange(e, "monthlyDiscount")
                            }
                            defaultValue={
                              propertyData[selectedPortion].monthlyDiscount
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Monthly Expenses</Label>
                          <Input
                            className="w-full"
                            onChange={(e) =>
                              handleInputChange(e, "monthlyExpenses")
                            }
                            defaultValue={
                              propertyData[selectedPortion].monthlyExpenses
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Neighbourhood</Label>
                          <Input
                            onChange={(e) =>
                              handleInputChange(e, "neighbourhood")
                            }
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].neighbourhood
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">New PlaceName</Label>
                          <Input
                            className="w-full"
                            onChange={(e) =>
                              handleInputChange(e, "newPlaceName")
                            }
                            defaultValue={
                              propertyData[selectedPortion].newPlaceName
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Orientation</Label>
                          <Input
                            onChange={(e) =>
                              handleInputChange(e, "orientation")
                            }
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].orientation
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Party</Label>
                          <Select
                            value={propertyData[selectedPortion]?.party || ""}
                            onValueChange={(value) => {
                              if (selectedPortion === null) return;
                              const updatedData = [...propertyData];
                              updatedData[selectedPortion] = {
                                ...updatedData[selectedPortion],
                                party: value,
                              };
                              setPropertyData(updatedData);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a verified email to display" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Allow">Allow</SelectItem>
                              <SelectItem value="Do not allow">
                                Do not allow
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="w-full">Pet</Label>
                          <Select
                            value={propertyData[selectedPortion]?.pet || ""}
                            onValueChange={(value) => {
                              if (selectedPortion === null) return;
                              const updatedData = [...propertyData];
                              updatedData[selectedPortion] = {
                                ...updatedData[selectedPortion],
                                pet: value,
                              };
                              setPropertyData(updatedData);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select pet policy" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Allow">Allow</SelectItem>
                              <SelectItem value="Do not allow">
                                Do not allow
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="w-full">Placename</Label>
                          <Input
                            className="w-full"
                            onChange={(e) => handleInputChange(e, "placeName")}
                            defaultValue={
                              propertyData[selectedPortion].placeName
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Postalcode</Label>
                          <Input
                            className="w-full"
                            onChange={(e) => handleInputChange(e, "postalCode")}
                            defaultValue={
                              propertyData[selectedPortion].postalCode
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Min Nights</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].night[0]
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Max Nights</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].night[1]
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Property Style</Label>
                          <Input
                            onChange={(e) =>
                              handleInputChange(e, "propertyStyle")
                            }
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].propertyStyle
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Property Type</Label>
                          <Input
                            className="w-full"
                            onChange={(e) =>
                              handleInputChange(e, "propertyType")
                            }
                            defaultValue={
                              propertyData[selectedPortion].propertyType
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Rental Form</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "rentalForm")}
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].rentalForm
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Rental Type</Label>
                          <Input
                            className="w-full"
                            onChange={(e) => handleInputChange(e, "rentalType")}
                            defaultValue={
                              propertyData[selectedPortion].rentalType
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Proprty Size</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "size")}
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].size}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Smoking</Label>
                          <Select
                            value={propertyData[selectedPortion]?.smoking || ""}
                            onValueChange={(value) => {
                              if (selectedPortion === null) return;
                              const updatedData = [...propertyData];
                              updatedData[selectedPortion] = {
                                ...updatedData[selectedPortion],
                                smoking: value,
                              };
                              setPropertyData(updatedData);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Allow">Allow</SelectItem>
                              <SelectItem value="Do not allow">
                                Do not allow
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="w-full">State</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].state}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Street</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "street")}
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].street}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Subarea</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "subarea")}
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].subarea}
                          />
                        </div>

                        <div>
                          <Label className="w-full">Weekend Price</Label>
                          <Input
                            className="w-full"
                            onChange={(e) =>
                              handleInputChange(e, "weekendPrice")
                            }
                            defaultValue={
                              propertyData[selectedPortion].weekendPrice
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Weekly Discount</Label>
                          <Input
                            onChange={(e) =>
                              handleInputChange(e, "weeklyDiscount")
                            }
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].weeklyDiscount
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Zones</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "zones")}
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].zones}
                          />
                        </div>
                      </div>

                      <div>
                        {propertyData[selectedPortion]?.generalAmenities &&
                        Object.keys(
                          propertyData[selectedPortion]?.generalAmenities || {}
                        ).length > 0 ? (
                          <div className="p-4">
                            <h2 className="text-xl font-semibold mb-2 -ml-4">
                              General Amenities
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(
                                propertyData[selectedPortion]
                                  ?.generalAmenities || {}
                              ).map(([amenity, value]) => (
                                <div
                                  key={amenity}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="checkbox"
                                    id={amenity}
                                    checked={value as boolean}
                                    onChange={(e) =>
                                      handleGeneraleAmentiesChange(
                                        amenity,
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <label htmlFor={amenity} className="">
                                    {amenity}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4">
                            <p>No amenities available</p>
                          </div>
                        )}
                      </div>

                      <div>
                        {propertyData[selectedPortion]?.otherAmenities &&
                        Object.keys(
                          propertyData[selectedPortion]?.otherAmenities || {}
                        ).length > 0 ? (
                          <div className="p-4">
                            <h2 className="text-xl font-semibold mb-2 -ml-4">
                              Other Amenities
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(
                                propertyData[selectedPortion]?.otherAmenities ||
                                  {}
                              ).map(([amenity, value]) => (
                                <div
                                  key={amenity}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="checkbox"
                                    id={amenity}
                                    checked={value as boolean}
                                    onChange={(e) =>
                                      handleOthersAmentiesChange(
                                        amenity,
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <label htmlFor={amenity} className="">
                                    {amenity}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4">
                            <p>No amenities available</p>
                          </div>
                        )}
                      </div>
                      <div>
                        {propertyData[selectedPortion]?.safeAmenities &&
                        Object.keys(
                          propertyData[selectedPortion]?.safeAmenities || {}
                        ).length > 0 ? (
                          <div className="p-4">
                            <h2 className="text-xl font-semibold mb-2 -ml-4">
                              Safe Amenities
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(
                                propertyData[selectedPortion]?.safeAmenities ||
                                  {}
                              ).map(([amenity, value]) => (
                                <div
                                  key={amenity}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    id={amenity}
                                    type="checkbox"
                                    checked={value as boolean}
                                    onChange={(e) =>
                                      handleAmenityChange(
                                        amenity,
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <label htmlFor={amenity}>{amenity}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4">
                            <p>No amenities available</p>
                          </div>
                        )}
                      </div>

                      {/* Handle nearby location code will start from here */}

                      {/* Handle nearby lcoation code will end from here */}

                      <div className="mb-10">
                        <div className="">
                          <h2 className="text-xl font-semibold mb-2 ">
                            Additional Rules
                          </h2>
                          <div className="flex flex-col ml-4 gap-y-2 ">
                            {propertyData[selectedPortion]?.additionalRules.map(
                              (rule: any, index: any) => (
                                <div
                                  key={index}
                                  className="flex border-b py-2 items-center justify-between"
                                >
                                  <span>{rule}</span>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleDeleteRule(index)}
                                  >
                                    <Trash size={18} />
                                  </Button>
                                </div>
                              )
                            )}
                            <div className="flex items-center mt-2">
                              <Input
                                value={newRule}
                                onChange={(e) => setNewRule(e.target.value)}
                                placeholder="Add new rule"
                                className="mr-2"
                              />
                              <Button onClick={handleAddRule}>
                                <Plus size={18} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-10">
                        <Label className="w-full">Old Description</Label>
                        <Textarea
                          onChange={(e: any) => handleInputChange(e, "reviews")}
                          className="w-full min-h-40"
                          defaultValue={propertyData[selectedPortion].reviews}
                        />
                      </div>
                      <div className="opacity-50">
                        <Label className="w-full ">New Description</Label>
                        <Textarea
                          disabled
                          className="w-full min-h-40 "
                          defaultValue={
                            propertyData[selectedPortion].newReviews
                          }
                        />
                        <p className="text-xs text-red-300 ml-2">
                          can not edit
                        </p>
                      </div>
                      <div>
                        <Button
                          disabled={propertyLoading}
                          onClick={editproperty}
                          className="mt-4 flex items-center w-full sm:w-auto justify-center"
                        >
                          {propertyLoading ? (
                            <>
                              Updating...
                              <LoaderCircle
                                size={18}
                                className="animate-spin mr-2"
                              />{" "}
                            </>
                          ) : (
                            "Update"
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex items-center flex-col p-2 justify-center text-muted-foreground"
                    >
                      <img
                        className=" max-w-xs "
                        src="https://vacationsaga.b-cdn.net/empty_u3jzi3.png"
                        alt="placeholder"
                      />
                      <p className="text-lg font-semibold">
                        Select a portion to view details.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default PortionDetailsPage;
