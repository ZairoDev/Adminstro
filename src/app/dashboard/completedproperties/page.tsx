"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef } from "react";
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
  PaginationEllipsis,
} from "@/components/ui/pagination";
import debounce from "lodash.debounce";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { Property } from "@/util/type";
import Link from "next/link";
import CustomTooltip from "@/components/CustomToolTip";
import { DonutChart } from "@/components/charts/DonutChart";
import Heading from "@/components/Heading";
import CardLoader from "@/components/CardLoader";

interface ApiResponse {
  data: Property[];
  totalPages: number;
  propertiesWithDescriptionsCount: number;
  wordsCount: number;
  totalProperties: number;
}
const CompletedProperties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("email");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalWords, setTotalWords] = useState<number>(0);
  const [totalProperties, setTotalProperties] = useState(0);
  const [totalNumberOfProperties, setTotalNumberOfProperties] =
    useState<number>(0);

  const limit: number = 11;
  const router = useRouter();

  const handleEditDescription = (propertyId: string) => {
    router.push(`/dashboard/remainingproperties/description/${propertyId}`);
  };
  const fetchProperties = useCallback(
    debounce(async (searchTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/completedproperties?page=${page}&limit=${limit}&searchTerm=${searchTerm}&searchType=${searchType}`
        );
        const data: ApiResponse = await response.json();
        if (response.ok) {
          setProperties(data.data);
          setTotalPages(data.totalPages);
          setTotalProperties(data?.propertiesWithDescriptionsCount);
          setTotalWords(data?.wordsCount);
          setTotalNumberOfProperties(data?.totalProperties);
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
  const chartData = [
    { title: "Completed", count: totalProperties, fill: "hsl(var(--primary))" },
    {
      title: "Remaining",
      count: totalNumberOfProperties - totalProperties,
      fill: "hsl(var(--primary-foreground))",
    },
  ];
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
        heading="Completed Properties"
        subheading="These are the properties which have new description"
      />
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
          <div className="flex w-full items-center ">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchTerm(e.target.value)
              }
              className="max-w-xl"
              ref={searchInputRef}
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <CardLoader />
        ) : error ? (
          <div>Error: {error}</div>
        ) : (
          <div className=" mb-4">
            <div className=" ">       
              <DonutChart
                title="Total Properties"
                data={chartData}
                totalCount={totalProperties}
                totalCountTitle="Properties"
                footerText1={`Total Words: ${totalWords}`}
                footerText2={`Total Properties: ${totalNumberOfProperties}`}
              />
            </div>
            <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4">
              {properties.map((property) => (
                <div
                  key={property?._id}
                  className="border rounded-lg relative sm:max-w-sm w-full h-full"
                >
                  <div className="">
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
                            className="rounded-t-lg h-56 w-full object-cover"
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
                  <div className="flex  justify-between">
                    <div className="p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-thin opacity-80">
                          <CustomTooltip
                            text={`${property?.VSID}`}
                            desc="Property VSID"
                          />
                        </p>
                      </div>
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

                    <div className="  ">
                      <Button
                        variant="link"
                        className="w-full "
                        onClick={() => handleEditDescription(property?._id)}
                      >
                        Preview
                        <ArrowUpRight size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Pagination Section */}
      {properties.length > 0 && (
        <div className="text-xs w-full">
          <Pagination className="flex flex-wrap items-center w-full">
            {/* <PaginationPrevious
              className="text-xs sm:block hidden"
              onClick={() => handlePageChange(page - 1)}
            >
             
            </PaginationPrevious> */}

            <PaginationContent className="text-xs flex flex-wrap justify-center w-full md:w-auto">
              {renderPaginationItems()}
            </PaginationContent>

            {/* <PaginationNext
              className="text-xs sm:block hidden"
              onClick={() => handlePageChange(page + 1)}
            >
             
            </PaginationNext> */}
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default CompletedProperties;
