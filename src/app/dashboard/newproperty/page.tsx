"use client";

import axios from "axios";
import Link from "next/link";
import { Edit } from "lucide-react";
import debounce from "lodash.debounce";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import Heading from "@/components/Heading";
import { Input } from "@/components/ui/input";
import CustomTooltip from "@/components/CustomToolTip";
import { PropertiesDataType, Property } from "@/util/type";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

const PropertyPage: React.FC = () => {
  const [property, setProperty] = useState<PropertiesDataType[]>();
  const [properties, setProperties] = useState<Property[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("email");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const limit: number = 12;

  const fetchProperties = useCallback(
    debounce(async (searchTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/property/getAllProperty?page=${page}&limit=${limit}&searchTerm=${searchTerm}&searchType=${searchType}`
        );
        const data = await response.json();
        console.log("allproperties: ", data);
        if (response.ok) {
          setProperties(data.data);
          setProperty(data.data);
          setTotalPages(data.totalPages);
        } else {
          throw new Error("Failed to fetch properties");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 500),
    [page, searchType, limit]
  );

  const renderPaginationItems = () => {
    let items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={page === i}
            onClick={(e) => {
              e.preventDefault();
              // handlePageChange(i);
              setPage(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    if (endPage < totalPages) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    return items;
  };

  useEffect(() => {
    fetchProperties(searchTerm);
  }, [searchTerm, page]);

  useEffect(() => {
    console.log("property: ", property);
  }, [property]);

  // const response = async () => {
  //   try {
  //     const propertyData = await axios.get("/api/property/getAllProperty");
  //     setProperty(propertyData.data.properties);
  //     console.log(propertyData.data.properties);
  //   } catch (error: any) {
  //     console.log(error);
  //   }
  // };
  // useEffect(() => {
  //   response();
  // }, []);

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
              onValueChange={(value: string) => setSearchType(value)}
              value={searchType}
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
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchTerm(e.target.value)
              }
              ref={searchInputRef}
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
                  <Link
                    href={`https://www.vacationsaga.com/listing-stay-detail/${property._id}`}
                    target="_blank"
                  >
                    {property?.propertyCoverFileUrl ? (
                      <img
                        src={property?.propertyCoverFileUrl}
                        alt="PropertyImage"
                        loading="lazy"
                        className=" rounded-t-lg h-56 w-full object-cover"
                      />
                    ) : (
                      <img
                        src="https://vacationsaga.b-cdn.net/ProfilePictures/replacer.png"
                        loading="lazy"
                        alt="PropertyImage"
                        className="rounded-t-lg h-56 w-full object-cover"
                      />
                    )}
                  </Link>
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
                            text={`${property?.VSID}`}
                            desc="Property VSID"
                          />
                        </p>
                        <div className="">
                          <p className="text-base">
                            <CustomTooltip
                              text={`€${property?.basePrice || "NAN"}`}
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
                                property?.hostedBy?.substring(0, 10) || "NA"
                              }`}
                              desc={`Hosted by: ${property?.hostedBy || "NAN"}`}
                            />
                          </p>
                          <p className=" text-xs line-clamp-1">
                            <CustomTooltip
                              className=""
                              text={`${
                                property.commonProperties?.hostedFrom?.substring(
                                  0,
                                  10
                                ) || "NA"
                              }`}
                              desc={`Hosted from: ${
                                property.commonProperties?.hostedFrom ||
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
      {properties.length > 0 && (
        <div className="text-xs w-full">
          <Pagination className="flex flex-wrap items-center w-full">
            <PaginationContent className="text-xs flex flex-wrap justify-center w-full md:w-auto">
              {renderPaginationItems()}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
};

export default PropertyPage;
