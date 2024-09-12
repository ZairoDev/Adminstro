"use client";
import { LuLoader2 } from "react-icons/lu";
import React, { FC, useEffect, useState } from "react";
// import { PencilSquareIcon } from "@heroicons/react/24/outline";
// import { Route } from "@/routers/types";

import Link from "next/link";
import axios from "axios";
// import toast, { Toaster } from "react-hot-toast";
import { FaHouseUser } from "react-icons/fa";
// import { useAuth } from "@/hooks/useAuth";
// import PricingCard from "@/app/subscription/PricingCard";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export interface PageAddListing10Props {}

interface Page3State {
  portionName: string[];
  portionSize: number[];
  guests: number[];
  bedrooms: number[];
  beds: number[];
  bathroom: number[];
  kitchen: number[];
}

interface Page2State {
  country: string;
  street: string;
  roomNumber: string;
  city: string;
  state: string;
  postalCode: string;
}

interface CombinedData {
  userId?: string;

  propertyType?: string;
  placeName?: string;
  rentalForm?: string;
  numberOfPortions?: number;

  street?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
  center?: object;

  portionName?: string[];
  portionSize?: number[];
  guests?: number[];
  bedrooms?: number[];
  beds?: number[];
  bathroom?: number[];
  kitchen?: number[];
  childrenAge?: number[];

  basePrice?: number[];
  weekendPrice?: number[];
  weeklyDiscount?: number[];
  currency?: string;

  generalAmenities?: object;
  otherAmenities?: object;
  safeAmenities?: object;

  smoking?: string;
  pet?: string;
  party?: string;
  cooking?: string;
  additionalRules?: string[];

  reviews?: string[];

  propertyCoverFileUrl?: string;
  propertyPictureUrls?: string[];
  portionCoverFileUrls?: string[];
  portionPictureUrls?: string[][];

  night: number[];
  time: number[];
  datesPerPortion: number[][];

  rentalType?: string;
  basePriceLongTerm?: number[];
  monthlyDiscount?: number[];
  longTermMonths?: string[];

  isLive?: boolean;
}

interface checkBoxState {
  [key: string]: any;
}

const PageAddListing10: FC<PageAddListing10Props> = () => {
  const user = "fdhjf";
  const [goLiveState, setGoLiveState] = useState<boolean>(false);
  const [isLiveDisabled, setIsLiveDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const clearLocalStorage = () => {
    localStorage.removeItem("page1");
    localStorage.removeItem("page2");
    localStorage.removeItem("page3");
    // localStorage.removeItem("page4");
    localStorage.removeItem("page5");
    localStorage.removeItem("page6");
    localStorage.removeItem("page8");
    localStorage.removeItem("page9");
    localStorage.removeItem("propertyCoverFileUrl");
    localStorage.removeItem("propertyPictureUrls");
    localStorage.removeItem("portionCoverFileUrls");
    localStorage.removeItem("portionPictureUrls");
    // localStorage.removeItem("AmenitiesToRetrieve");
    localStorage.removeItem("isImages");
    localStorage.removeItem("isPortionPictures");
    localStorage.removeItem("isPropertyPictures");
  };

  const [propertyCoverFileUrl, setPropertyCoverFileUrl] = useState<string>(
    () => {
      const savedPage = localStorage.getItem("propertyCoverFileUrl") || "";
      return savedPage || "";
    }
  );

  const [page3, setPage3] = useState<Page3State>(() => {
    const savedPage = localStorage.getItem("page3") || "";
    if (savedPage) {
      return JSON.parse(savedPage);
    }
    return "";
  });

  const [page2, setPage2] = useState<Page2State>(() => {
    const savedPage = localStorage.getItem("page2") || "";
    if (savedPage) {
      return JSON.parse(savedPage);
    }
    return "";
  });

  const [basePrice, setBasePrice] = useState<number>(() => {
    const saved = localStorage.getItem("page8");
    if (!saved) {
      return 0;
    }
    const value = JSON.parse(saved);
    return parseInt(value.basePrice[0]) || 0;
  });

  const [combinedData, setCombinedData] = useState<CombinedData>();

  useEffect(() => {
    const fetchDataFromLocalStorage = () => {
      const page1 = JSON.parse(localStorage.getItem("page1") || "{}");
      const page2 = JSON.parse(localStorage.getItem("page2") || "{}");
      const page3 = JSON.parse(localStorage.getItem("page3") || "{}");
      const page4 = JSON.parse(localStorage.getItem("page4") || "[{}, {}, {}]");
      const page5 = JSON.parse(localStorage.getItem("page5") || "{}");
      const page6 = JSON.parse(localStorage.getItem("page6") || "{}");
      // const page7 = JSON.parse(localStorage.getItem('page7') || '{}');
      const page8 = JSON.parse(localStorage.getItem("page8") || "{}");
      const page9 = JSON.parse(localStorage.getItem("page9") || "{}");

      const propertyPictureUrls = JSON.parse(
        localStorage.getItem("propertyPictureUrls") || "[]"
      );
      const portionCoverFileUrls = JSON.parse(
        localStorage.getItem("portionCoverFileUrls") || "[]"
      );
      const portionPictureUrls = JSON.parse(
        localStorage.getItem("portionPictureUrls") || "[[]]"
      );
      const combinedData = {
        ...page1,
        ...page2,
        ...page3,
        ...page4,
        ...page5,
        ...page6,
        ...page8,
        ...page9,
        propertyCoverFileUrl,
        propertyPictureUrls,
        portionCoverFileUrls,
        portionPictureUrls,
        // userId: user?._id,
      };
      setCombinedData(combinedData);
      return combinedData;
    };

    const data = fetchDataFromLocalStorage();
  }, [user, propertyCoverFileUrl]);

  const [propertyId, setPropertyId] = useState<string>();
  const [propertyVSID, setPropertyVSID] = useState<string>();

  const handleGoLive = async () => {
    setGoLiveState(true);
    setIsLoading(true);
    const data = {
      // userId: user?._id,
      // email: user?.email,
      propertyType: combinedData?.propertyType,
      placeName: combinedData?.placeName,
      rentalForm: combinedData?.rentalForm,
      numberOfPortions: combinedData?.numberOfPortions,

      street: combinedData?.street,
      postalCode: combinedData?.postalCode,
      city: combinedData?.city,
      state: combinedData?.state,
      country: combinedData?.country,
      center: combinedData?.center,

      portionName: combinedData?.portionName,
      portionSize: combinedData?.portionSize,
      guests: combinedData?.guests,
      bedrooms: combinedData?.bedrooms,
      beds: combinedData?.beds,
      bathroom: combinedData?.bathroom,
      kitchen: combinedData?.kitchen,
      childrenAge: combinedData?.childrenAge,

      basePrice: combinedData?.basePrice,
      weekendPrice: combinedData?.weekendPrice,
      weeklyDiscount: combinedData?.weeklyDiscount,
      currency: combinedData?.currency,

      generalAmenities: combinedData?.generalAmenities,
      otherAmenities: combinedData?.otherAmenities,
      safeAmenities: combinedData?.safeAmenities,

      smoking: combinedData?.smoking,
      pet: combinedData?.pet,
      party: combinedData?.party,
      cooking: combinedData?.cooking,
      additionalRules: combinedData?.additionalRules,

      reviews: combinedData?.reviews,

      propertyCoverFileUrl: combinedData?.propertyCoverFileUrl,
      propertyPictureUrls: combinedData?.propertyPictureUrls,
      portionCoverFileUrls: combinedData?.portionCoverFileUrls,
      portionPictureUrls: combinedData?.portionPictureUrls,

      night: combinedData?.night,
      time: combinedData?.time,
      datesPerPortion: combinedData?.datesPerPortion,

      rentalType: combinedData?.rentalType,
      basePriceLongTerm: combinedData?.basePriceLongTerm,
      monthlyDiscount: combinedData?.monthlyDiscount,
      longTermMonths: combinedData?.longTermMonths,
      isLive: true,
    };

    // try {
    //   const response = await axios.post("/api/users", data);
    //   if (data?.userId) {
    //     toast.success("Property is successfully live!");
    //     clearLocalStorage();
    //     setIsLiveDisabled(true);
    //     setIsLoading(false);
    //   } else {
    //     toast.error("User must be logged in to go live");
    //     setIsLoading(false);
    //   }
    //   setPropertyId(response.data._id);
    //   setPropertyVSID(response.data.VSID);
    // } catch (error) {
    //   toast.error("User must be logged in to go live");
    //   setIsLoading(false);
    //   throw error;
    // }
  };
  return (
    <>
      {/* <Toaster position="bottom-right" reverseOrder={true} /> */}
      <div className=" flex flex-col gap-12">
        <div>
          <h2 className="text-2xl font-semibold">Congratulations 🎉</h2>
          <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
            Excellent, congratulations on completing the listing, it is waiting
            to be reviewed for publication
          </span>
        </div>
        <div className="flex flex-col w-72">
          <div className="card  border border-gray-600 rounded-xl pb-2">
            <div className=" h-72 flex justify-center items-center overflow-hidden">
              {propertyCoverFileUrl ? (
                <img
                  src={propertyCoverFileUrl}
                  alt="coverImage"
                  className="card-img-top rounded-xl object-cover"
                />
              ) : (
                <FaHouseUser className=" w-3/4 h-3/4" />
              )}
            </div>
            <div className="card-body mt-2 ml-2">
              <h1 className="mt-2">{page3?.portionName?.[0]}</h1>
            </div>
            <div className="flex gap-2 ml-2 mt-2 items-center">
              {page2?.country && (
                <h6>
                  {page2?.city}, {page2?.country}
                </h6>
              )}
            </div>
            <hr className=" w-16 border-gray-600 boder-2 my-2" />
            <div className=" mt-1 font-medium text-xl ml-2">
              {basePrice > 0 && <div>€ {basePrice} /night</div>}
            </div>
          </div>
          <div className="flex gap-y-2  mt-2  flex-col    items-center">
            <div className="w-full">
              {isLoading ? (
                <Button className="dark:bg-primary-6000 flex items-center justify-center gap-x-2 w-full dark:text-white text-slate-700 bg-orange-400">
                  <span className="flex items-center justify-center gap-x-2">
                    Processing...
                    <LuLoader2 className="text-base animate-spin ml-2" />
                  </span>
                </Button>
              ) : (
                <button
                  className="dark:bg-primary-6000 disabled:bg-neutral-600 w-full dark:text-white text-slate-700 bg-orange-400"
                  onClick={handleGoLive}
                  disabled={isLiveDisabled}>
                  <span className="text-sm">Go Live</span>
                </button>
              )}
            </div>

            <div className="w-full flex items-center justify-between gap-x-2 ">
              <Button
                // href={"/add-listing/1" as Route}
                className="  w-full  ">
                <Pencil className="h-3 w-3" />
                <span className="ml-3 text-sm">Edit</span>
              </Button>

              <div>
                {propertyVSID && (
                  <Link
                    href={{
                      pathname: "/listing-stay-detail",
                      query: {
                        id: propertyId,
                      },
                    }}
                  >
                    <button className="-p-4 w-full mt-2">
                      <span className="text-sm ">Preview</span>
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className=" flex flex-col">
          {propertyVSID && <div>Your VSID: {propertyVSID}</div>}
          {propertyId && (
            <div className="">
              Your Property Link:{" "}
              {`https://www.vacationsaga.com/listing-stay-detail?id=${propertyId}`}
            </div>
          )}
        </div>
        <div
          className={` ${
            goLiveState ? "block" : "hidden"
          } relative w-screen mx-auto max-w-3xl`}
        >
          <div className="flex justify-center h-screen">
            {goLiveState && (
              <div className="absolute inset-0 w-[90vw] left-1/2 transform -translate-x-1/2">
                {/* <PricingCard email={user?.email} /> */}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PageAddListing10;
