"use client";
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
import { useRouter } from "next/navigation";

import {
  Card,
  CardHeader,
  CardFooter,
  CardContent,
} from "@/components/ui/card";
import React, { useState, useEffect, useCallback, useContext } from "react";
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
import { Edit, EyeIcon, EyeOff } from "lucide-react";
import axios from "axios";
import Loader from "@/components/loader";
import { Property } from "@/util/type";

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
  const limit: number = 10;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );

  const router = useRouter();

  const [userRole, setUserRole] = useState<string | null>(null);

  const getUserRole = async () => {
    try {
      const response = await axios.get("/api/user/getloggedinuser");
      console.log("API response:", response.data.user.role);
      if (response.data && response.data.user && response.data.user.role) {
        setUserRole(response.data.user.role);
      } else {
        console.error("No role found in the response.");
      }
    } catch (error: any) {
      console.error("Error fetching user role:", error);
    } finally {
    }
  };
  useEffect(() => {
    getUserRole();
  }, []);

  const handleEditClick = (propertyId: string) => {
    router.push(`/dashboard/property/edit/${propertyId}`);
  };

  const handleEditDescription = (propertyId: string) => {
    router.push(`/dashboard/property/description/${propertyId}`);
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

      console.log(response.data);

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

      console.log(response.data);

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

  return (
    <div>
      {/* Search and filter section */}
      <div className="flex lg:mt-0 mt-2 items-center gap-x-2">
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
                        <img
                          src={property?.propertyCoverFileUrl}
                          alt="PropertyImage"
                          className="w-full h-[180px]  sm:object-fill object-cover flex items-center justify-center rounded-t-lg"
                        />
                      ) : (
                        <div className="relative">
                          <img
                            src="/replacer.jpg"
                            alt="PropertyImage"
                            className="w-full h-[180px]  object-fill flex items-center justify-center rounded-t-lg"
                          />
                          <div className="absolute top-8 -rotate-45 left-0 skew-x-6 text-red-500">
                            <p className="text-xs">
                              Replace me with <br /> property image
                            </p>
                          </div>
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
                    {!property?.isLive && (
                      <Drawer>
                        <DrawerTrigger asChild>
                          {userRole === "SuperAdmin" ||
                          userRole === "Advert" ? (
                            <Button
                              className=" w-full  text-xs gap-x-1 hover:bg-green-600/10 bg-transparent border border-green-600 text-green-600"
                              onClick={() =>
                                setSelectedPropertyId(property?._id)
                              }
                              disabled={isSubmitting}
                            >
                              Live
                              <EyeIcon size={12} />
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
                          {(userRole === "SuperAdmin" ||
                            userRole === "Advert") &&
                          property?.isLive ? (
                            <Button
                              className="w-full flex items-center justify-center gap-x-1 text-xs hover:bg-red-600/10 bg-transparent border border-red-600 text-red-600"
                              disabled={isSubmitting}
                              onClick={() =>
                                setSelectedPropertyId(property?._id)
                              }
                            >
                              Hide <EyeOff size={12} />
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

                    <div className="w-full ">
                      {userRole === "SuperAdmin" && (
                        <div>
                          <Button
                            variant="outline"
                            className="w-full mb-2"
                            onClick={() => handleEditClick(property?._id)}
                          >
                            <Edit size={12} />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleEditDescription(property?._id)}
                          >
                            <Edit size={12} />
                            Edit Description
                          </Button>
                        </div>
                      )}

                      {userRole === "Advert" && (
                        <div className="w-full">
                          <Button
                            className="w-full"
                            onClick={() => handleEditClick(property?._id)}
                          >
                            <Edit size={12} />
                            Edit
                          </Button>
                        </div>
                      )}

                      {userRole === "Content" && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleEditDescription(property?._id)}
                        >
                          <Edit size={12} />
                          Edit Description
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Pagination Section */}
      <div className="pagination-controls">
        <Pagination>
          <PaginationPrevious
            onClick={() => handlePageChange(page - 1)}
            // disabled={page === 1}
          >
            Previous
          </PaginationPrevious>
          <PaginationContent>{renderPaginationItems()}</PaginationContent>
          <PaginationNext
            onClick={() => handlePageChange(page + 1)}
            // disabled={page === totalPages}
          >
            Next
          </PaginationNext>
        </Pagination>
      </div>
    </div>
  );
};

export default PropertyPage;
