"use client";
import React, { useEffect, useState } from "react";
import { PropertiesDataType } from "@/util/type";
import Heading from "@/components/Heading";
import axios from "axios";
import Link from "next/link";
import CustomTooltip from "@/components/CustomToolTip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Edit } from "lucide-react";

const PropertyPage: React.FC = () => {
  const [property, setProperty] = useState<PropertiesDataType[]>();
  const response = async () => {
    try {
      const propertyData = await axios.get("/api/property/getAllProperty");
      setProperty(propertyData.data.properties);
      console.log(propertyData.data.properties);
    } catch (error: any) {
      console.log(error);
    }
  };
  useEffect(() => {
    response();
  }, []);

  return (
    <>
      <Heading
        heading="Add New Property"
        subheading="New way of property render here"
      />

      <div>
        <p className="sr-only">Searching things will be render here...</p>
        <div className="flex lg:mt-0  items-center gap-x-2">
          <div className="sm:max-w-[180px] max-w-[100px] w-full">
            <Select
            //   onValueChange={(value: string) => setSearchType(value)}
            //   value={searchType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="VSID">VSID</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full items-center ">
            <Input
              placeholder="Search..."
              //   value={searchTerm}
              //   onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              //     setSearchTerm(e.target.value)
              //   }
              //   ref={searchInputRef}
              className="max-w-xl"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1  sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4 ">
        {property?.map((property: any) => (
          <div key={property._id} className="">
            <div className="border rounded-lg relative sm:max-w-sm w-full h-full">
              <div className="p-0 border-b ">
                <div>
                  {property?.commonProperties[0] ? (
                    <Link
                      href={{
                        pathname: `https://www.vacationsaga.com/listing-stay-detail`,
                        query: { id: property._id },
                      }}
                      target="_blank"
                    >
                      <img
                        src={
                          property?.commonProperties[0]?.propertyCoverFileUrl
                        }
                        alt="PropertyImage"
                        loading="lazy"
                        className=" rounded-t-lg h-56 w-full object-cover"
                      />
                    </Link>
                  ) : (
                    <div className="relative">
                      <img
                        src="https://vacationsaga.b-cdn.net/ProfilePictures/replacer.png"
                        loading="lazy"
                        alt="PropertyImage"
                        className="rounded-t-lg h-56 w-full object-cover"
                      />
                      <p className="absolute inset-0 text-2xl font-semibold flex items-center justify-center text-red-600">
                        404 Not Found
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="absolute top-0 left-0 px-1 text-sm bg-primary rounded-lg text-muted-foreground">
                  <CustomTooltip
                    text={`${property.commonId}`}
                    desc="Common Id"
                  />
                </div>
                <div className="absolute top-0 right-0 px-1 text-sm bg-primary rounded-lg text-muted-foreground">
                  <Link
                    className="flex items-center justify-center gap-x-1"
                    href={`/dashboard/newproperty/${property.commonId}`}
                  >
                    <CustomTooltip
                      text="Edit"
                      desc="Tap to edit the property"
                    />
                  </Link>
                </div>

                <div>
                  <div className="p-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-thin opacity-80">
                          <CustomTooltip
                            text={`${property.commonProperties[0]?.VSID}`}
                            desc="Property VSID"
                          />
                        </p>
                        <div className="">
                          <p className="text-base">
                            <CustomTooltip
                              text={`€${
                                property.commonProperties[0]?.basePrice || "NAN"
                              }`}
                              desc="Property price per night"
                            />
                          </p>
                        </div>
                      </div>
                      <div className="flex  flex-col">
                        <div className="flex h-6 mt-2 flex-col opacity-40">
                          <p className=" text-xs line-clamp-1">
                            <CustomTooltip
                              text={`${
                                property.commonProperties[0]?.hostedBy?.substring(
                                  0,
                                  10
                                ) || "NA"
                              }`}
                              desc={`Hosted by: ${
                                property.commonProperties[0]?.hostedBy || "NAN"
                              }`}
                            />
                          </p>
                          <p className=" text-xs line-clamp-1">
                            <CustomTooltip
                              className=""
                              text={`${
                                property.commonProperties[0]?.hostedFrom?.substring(
                                  0,
                                  10
                                ) || "NA"
                              }`}
                              desc={`Hosted from: ${
                                property.commonProperties[0]?.hostedFrom ||
                                "Not found"
                              }`}
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default PropertyPage;
