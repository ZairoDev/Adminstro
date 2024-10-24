"use client";
import React, { useState, useEffect } from "react";
import Heading from "@/components/Heading";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import axios from "axios";
import { Button } from "@/components/ui/button";
import ImageCard from "@/components/imagecard/ImageCard";
import { LoaderCircle, Ratio } from "lucide-react";
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

interface PageProps {
  params: {
    id: string;
  };
}

const PortionDetailsPage: React.FC<PageProps> = ({ params }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [propertyData, setPropertyData] = useState<any[]>([]);
  const [selectedPortion, setSelectedPortion] = useState<number | null>(null);

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

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center">
          <LoaderCircle size={18} className="animate-spin" />
        </div>
      ) : (
        <Card className="w-full  ">
          <CardContent className="p-0">
            <div className="flex flex-col h-[92vh]  md:flex-row ">
              <div className="w-full md:w-[30%]  border-b-2  md:border-0  p-4 overflow-y-auto">
                <Heading
                  heading="List of portions"
                  subheading="Select any of them to get details"
                />
                <div className="mt-4  space-y-2">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        <div>
                          <Label className="w-full">Property Vsid</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].VSID}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Property Name</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].propertyName
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Portion no</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].portionNo
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Base Price</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].basePrice
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Property Area</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].area}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Baseprice Longterm</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].basePriceLongTerm
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Bath Room</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].bathroom
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Bedroom</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].bedrooms
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Location(centre)</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].center.lat
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Location(centre)</Label>
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
                            defaultValue={
                              propertyData[selectedPortion].childrenAge
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">City</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].city}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Common Id</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].commonId
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Construction Year</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].constructionYear
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Cooking</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].cooking}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Country</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].country}
                          />
                        </div>
                        <div>
                          <Label className="w-full">createdAt</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].createdAt
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Email</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].email}
                          />
                        </div>
                        <div>
                          <Label className="w-full">EnergyClass</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].energyClass
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Floor</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].floor}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Guests</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].guests}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Heating Medium</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].heatingMedium
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Heating Type</Label>
                          <Input
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
                            defaultValue={
                              propertyData[selectedPortion].hostedBy
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Hostedby</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].hostedBy
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">HostedFrom</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].hostedFrom
                            }
                          />
                        </div>
                        <div className="">
                          <Label className="w-full">Instant Booking</Label>
                          <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm  file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring  focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50">
                            <Switch
                              checked={
                                propertyData[selectedPortion].isInstantBooking
                              }
                            />
                          </div>
                        </div>
                        <div className="">
                          <Label className="w-full">Live Status</Label>
                          <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm  file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring  focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50">
                            <Switch
                              checked={propertyData[selectedPortion].isLive}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="w-full">
                            Student Suitablity Status
                          </Label>
                          <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm  file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring  focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50">
                            <Switch
                              checked={
                                propertyData[selectedPortion]
                                  .isSuitableForStudents
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="w-full">Topfloor Status</Label>
                          <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm  file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring  focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50">
                            <Switch
                              checked={propertyData[selectedPortion].isTopFloor}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="w-full">kitchen</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].kitchen}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Levels</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].levels}
                          />
                        </div>{" "}
                        <div>
                          <Label className="w-full">Monthly Discount</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].monthlyDiscount
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Monthly Expenses</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].monthlyExpenses
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Neighbourhood</Label>
                          <Input
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
                            defaultValue={
                              propertyData[selectedPortion].newPlaceName
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Orientation</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].orientation
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Party</Label>
                          <Select
                            defaultValue={propertyData[selectedPortion].party}
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
                            defaultValue={propertyData[selectedPortion].pet}
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
                          <Label className="w-full">Placename</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].placeName
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Postalcode</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].postalCode
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Property Style</Label>
                          <Input
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
                            defaultValue={
                              propertyData[selectedPortion].propertyType
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Rental Form</Label>
                          <Input
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
                            defaultValue={
                              propertyData[selectedPortion].rentalType
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Proprty Size</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].size}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Smoking</Label>
                          <Select
                            defaultValue={propertyData[selectedPortion].smoking}
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
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].street}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Subarea</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].subarea}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Updated at</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].updatedAt
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">User Id</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].userId}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Weekend Price</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].weekendPrice
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Weekly Discount</Label>
                          <Input
                            className="w-full"
                            defaultValue={
                              propertyData[selectedPortion].weeklyDiscount
                            }
                          />
                        </div>
                        <div>
                          <Label className="w-full">Zones</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion].zones}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Number of Updation</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion]._v}
                          />
                        </div>
                        <div>
                          <Label className="w-full">Property Id</Label>
                          <Input
                            className="w-full"
                            defaultValue={propertyData[selectedPortion]._id}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="w-full">Old Description</Label>
                        <Textarea
                          className="w-full min-h-40"
                          defaultValue={propertyData[selectedPortion].reviews}
                        />
                      </div>
                      <div>
                        <Label className="w-full ">New Description</Label>
                        <Textarea
                          className="w-full min-h-40"
                          defaultValue={
                            propertyData[selectedPortion].newReviews
                          }
                        />
                      </div>
                      <div>
                        <Button className="mt-4 ">Update</Button>
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
