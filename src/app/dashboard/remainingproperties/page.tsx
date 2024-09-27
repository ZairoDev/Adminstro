"use client";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardFooter,
  CardContent,
} from "@/components/ui/card";
import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
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
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import debounce from "lodash.debounce";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import Loader from "@/components/loader";
import { Property } from "@/util/type";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Link from "next/link";
import { Tooltip } from "@radix-ui/react-tooltip";
import CustomTooltip from "@/components/CustomToolTip";
import Animation from "@/components/animation";

interface ApiResponse {
  data: Property[];
  totalPages: number;
  incompletePropertiesCount: number;
}
const CompletedProperties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("email");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [rermainigCount, setRemainingCount] = useState(0);
  const limit: number = 12;

  const router = useRouter();

  const handleEditDescription = (propertyId: string) => {
    console.log(propertyId, "Up");
    router.push(`/dashboard/remainingproperties/description/${propertyId}`);
    console.log(propertyId, "Down");
  };

  const fetchProperties = useCallback(
    debounce(async (searchTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/remainingproperty?page=${page}&limit=${limit}&searchTerm=${searchTerm}&searchType=${searchType}`
        );
        const data: ApiResponse = await response.json();
        console.log(data);
        if (response.ok) {
          setProperties(data.data);
          setTotalPages(data.totalPages);
          setRemainingCount(data?.incompletePropertiesCount);
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

  useEffect(() => {
    fetchProperties(searchTerm);
  }, [fetchProperties, searchTerm]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const renderPaginationItems = () => {
    let items = [];
    const maxVisiblePages = 4;
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

  return (
    <div>
      <Animation>
        {/* Search and filter section */}
        <div className="flex sm:items-center sm:flex-row flex-col justify-between">
          <div className="flex w-full lg:mt-0 mt-2 items-center gap-x-2">
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
            <div className="flex w-full items-center py-4">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)
                }
                className="max-w-xl"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-screen">
              <Loader />
            </div>
          ) : error ? (
            <div>Error: {error}</div>
          ) : (
            <div className=" mb-4">
              <div className="grid gap-4 mb-4 justify-center items-center grid-cols-1 sm:grid-cols-2 md:grid-cols-3  xl:grid-cols-4">
                {properties.map((property) => (
                  <Card key={property?._id} className="w-full rounded-lg">
                    <CardHeader className="p-0 border-b">
                      <div>
                        {property?.propertyCoverFileUrl[0] ? (
                          <AspectRatio ratio={16 / 12}>
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
                                className="w-full h-full  sm:object-fill object-cover flex items-center justify-center rounded-t-lg"
                              />
                            </Link>
                          </AspectRatio>
                        ) : (
                          <div className="relative">
                            <AspectRatio ratio={16 / 12}>
                              <img
                                src="https://vacationsaga.b-cdn.net/ProfilePictures/replacer.png"
                                loading="lazy"
                                alt="PropertyImage"
                                className="w-full relative h-full object-fill flex items-center justify-center rounded-t-lg"
                              />
                              <p className="absolute inset-0 text-2xl font-semibold flex items-center justify-center text-red-600">
                                404 Not Found
                              </p>
                            </AspectRatio>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4  ">
                      <div className="flex items-center justify-between">
                        <p className="">Vsid {property?.VSID}</p>
                        <p className="">Beds {property?.beds?.[0] || "NA"}</p>
                      </div>
                      <div className="mt-2">
                        {property &&
                        property.basePrice &&
                        property.basePrice[0] ? (
                          <p className="text-xl">
                            €{property.basePrice[0]}/night
                          </p>
                        ) : (
                          <p className="text-xl">Price not available</p>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <p className="line-clamp-1">
                          State: <span></span> {property?.state || "NA"}
                        </p>
                        {property?.isLive ? (
                          <span className="relative flex h-3 w-3">
                            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                        ) : (
                          <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2 flex-col  justify-between">
                      <div className="w-full ">
                        <Button
                          disabled={!property?.isLive}
                          variant="outline"
                          className="w-full"
                          onClick={() => handleEditDescription(property?._id)}
                        >
                          <Edit size={12} />
                          Edit Description
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Pagination Section */}
        <div className="text-xs w-full">
          <Pagination className="flex flex-wrap items-center w-full">
            {/* <PaginationPrevious
            className="text-xs sm:block hidden"
            onClick={() => handlePageChange(page - 1)}
            aria-disabled={page === 1}
          >
         
          </PaginationPrevious> */}

            <PaginationContent className="text-xs flex flex-wrap justify-center w-full md:w-auto">
              {renderPaginationItems()}
            </PaginationContent>

            {/* <PaginationNext
            className="text-xs sm:block hidden"
            aria-disabled={page === totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
           
          </PaginationNext> */}
          </Pagination>
        </div>
      </Animation>
    </div>
  );
};

export default CompletedProperties;
