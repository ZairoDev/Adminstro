"use client";

import axios from "axios";
import Link from "next/link";
import debounce from "lodash.debounce";
import { useRouter } from "next/navigation";
import { Edit, EyeIcon, EyeOff } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";

import { Property } from "@/util/type";
import { useAuthStore } from "@/AuthStore";
import Heading from "@/components/Heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CardLoader from "@/components/CardLoader";
import CustomTooltip from "@/components/CustomToolTip";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface ApiResponse {
  data: Property[];
  totalPages: number;
}

const PropertyPage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("email");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );
  const limit: number = 12;
  const router = useRouter();

  const { token } = useAuthStore();

  const handleEditClick = (propertyId: string) => {
    router.push(`/dashboard/property/edit/${propertyId}`);
  };
  const fetchProperties = useCallback(
    debounce(async (searchTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/getallproperty?page=${page}&limit=${limit}&searchTerm=${searchTerm}&searchType=${searchType}`
        );
        const data: ApiResponse = await response.json();
        // console.log(data);
        if (response.ok) {
          setProperties(data.data);
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

  // console.log(properties);

  useEffect(() => {
    fetchProperties(searchTerm);
  }, [fetchProperties, searchTerm]);

  const handleLiveAction = async (propertyId: string) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post("/api/visibiltychange", {
        id: propertyId,
        isLive: true,
      });

      // console.log(response.data);

      setProperties((prevProps) =>
        prevProps.map((property) =>
          property._id === propertyId ? { ...property, isLive: true } : property
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHideAction = async (propertyId: string) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post("/api/visibiltychange", {
        id: propertyId,
        isLive: false,
      });
      // console.log(response.data);
      setProperties((prevProps) =>
        prevProps.map((property) =>
          property._id === propertyId
            ? { ...property, isLive: false }
            : property
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
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
              handlePageChange(i);
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

  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "j") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div>
      <Heading
        heading="All Properties"
        subheading="You will get the list of all properties here"
      />
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

      <div className="mt-4">
        {loading ? (
          <CardLoader />
        ) : error ? (
          <div>Error: {error}</div>
        ) : (
          <div className=" mb-4">
            <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1  sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4 ">
              {properties.map((property) => (
                <div
                  key={property?._id}
                  className="border rounded-lg relative sm:max-w-sm w-full h-full"
                >
                  <div className="p-0 border-b ">
                    <div>
                      {property?.propertyCoverFileUrl[0] ? (
                        <Link
                          href={{
                            pathname: `https://www.vacationsaga.com/listing-stay-detail`,
                            query: { id: property._id },
                          }}
                          target="_blank"
                        >
                          <img
                            src={property?.propertyCoverFileUrl}
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
                          {property &&
                          property.basePrice &&
                          property.basePrice[0] ? (
                            <p className="text-base">
                              <CustomTooltip
                                text={`€${property.basePrice[0]}`}
                                desc="Property price per night"
                              />
                            </p>
                          ) : (
                            <p className="text-base">NAN</p>
                          )}
                        </div>
                      </div>
                      <div className="flex  flex-col">
                        <div className="flex h-6 mt-2 flex-col opacity-40">
                          <p className=" text-xs line-clamp-1">
                            <CustomTooltip
                              text={`${
                                property?.hostedBy?.substring(0, 10) || "NA"
                              }`}
                              desc={`Hosted by: ${property?.hostedBy}`}
                            />
                          </p>
                          <p className=" text-xs line-clamp-1">
                            <CustomTooltip
                              className=""
                              text={`${
                                property?.hostedFrom?.substring(0, 10) || "NA"
                              }`}
                              desc={`Hosted from: ${property?.hostedFrom}`}
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-y-2 mt-1 px-2 gap-x-2  justify-between">
                    {!property?.isLive && (
                      <Drawer>
                        <DrawerTrigger asChild>
                          {token?.role === "SuperAdmin" ||
                          token?.role === "Advert" ? (
                            <Button
                              className=" absolute top-0 text-green-700 left-0"
                              variant="link"
                              onClick={() =>
                                setSelectedPropertyId(property?._id)
                              }
                              disabled={isSubmitting}
                            >
                              <EyeIcon size={18} />
                            </Button>
                          ) : null}
                        </DrawerTrigger>
                        <DrawerContent className="max-w-3xl m-auto">
                          <DrawerHeader>
                            <DrawerTitle>Live Confirmation</DrawerTitle>
                            <DrawerDescription>
                              Are you sure you want to make this property live?
                            </DrawerDescription>
                          </DrawerHeader>
                          <DrawerFooter>
                            <DrawerClose asChild>
                              <Button
                                className="p-2"
                                onClick={() => handleLiveAction(property?._id)}
                                disabled={isSubmitting}
                              >
                                Yes, Confirm
                              </Button>
                            </DrawerClose>
                          </DrawerFooter>
                        </DrawerContent>
                      </Drawer>
                    )}
                    {property?.isLive && (
                      <Drawer>
                        <DrawerTrigger asChild>
                          {(token?.role === "SuperAdmin" ||
                            token?.role === "Advert") &&
                          property?.isLive ? (
                            <Button
                              className="absolute text-red-700 left-0 top-0"
                              variant="link"
                              disabled={isSubmitting}
                              onClick={() =>
                                setSelectedPropertyId(property?._id)
                              }
                            >
                              <EyeOff size={18} />
                            </Button>
                          ) : null}
                        </DrawerTrigger>
                        <DrawerContent className="max-w-3xl m-auto">
                          <DrawerHeader>
                            <DrawerTitle>Hide Confirmation</DrawerTitle>
                            <DrawerDescription>
                              Are you sure you want to hide this property?
                            </DrawerDescription>
                          </DrawerHeader>
                          <DrawerFooter>
                            <DrawerClose asChild>
                              <Button
                                className="p-2"
                                onClick={() => handleHideAction(property?._id)}
                                disabled={isSubmitting}
                              >
                                Yes, Confirm
                              </Button>
                            </DrawerClose>
                          </DrawerFooter>
                        </DrawerContent>
                      </Drawer>
                    )}
                    <div className="absolute  right-0 top-0 ">
                      {token?.role === "SuperAdmin" && (
                        <div>
                          <Button
                            variant="link"
                            className="w-full mb-2"
                            onClick={() => handleEditClick(property?._id)}
                          >
                            <Edit size={18} />
                          </Button>
                        </div>
                      )}
                      {token?.role === "Advert" && (
                        <div className="w-full">
                          <Button
                            variant="link"
                            className="w-full"
                            onClick={() => handleEditClick(property?._id)}
                          >
                            <Edit size={18} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
    </div>
  );
};

export default PropertyPage;
