"use client";

import React, { FC, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Copy, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { UserInterface } from "@/util/type";
import ScreenLoader from "@/components/ScreenLoader";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { sub } from "date-fns";

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

interface nearbyLocationInterface {
  nearbyLocationName: string[];
  nearbyLocationDistance: number[];
  nearbyLocationTag: string[];
  nearbyLocationUrl: string[];
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
  pricePerDay?: number[][][];

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

  area?: string;
  subarea?: string;
  neighbourhood?: string;
  floor?: number;
  isTopFloor?: string;
  constructionYear?: number;
  energyClass?: string;
  heatingMedium?: string;
  heatingType?: string;
  isSuitableForStudents?: string;
  levels?: string;
  monthlyExpenses?: string;
  orientation?: string;
  zones?: string;
  propertyStyle?: string;

  nearbyLocations?: nearbyLocationInterface;

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
  const { toast } = useToast();
  const params = useSearchParams();
  const userId = params.get("userId");
  console.log(userId);

  const [goLiveState, setGoLiveState] = useState<boolean>(false);
  const [isLiveDisabled, setIsLiveDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loggedInUserEmail, setLoggedInUserEmail] = useState<string>("");

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

  const createPricePerDayArray = (portions: number) => {
    console.log("number of portions: ", portions);
    const pricePerDayArray = Array.from({ length: portions }, () =>
      Array.from({ length: 12 }, () => Array.from({ length: 31 }, () => 1))
    );
    for (let i = 0; i < portions; i++) {
      for (let j = 0; j < 12; j++) {
        for (let k = 0; k < 31; k++) {
          pricePerDayArray[i][j][k] = combinedData?.basePrice?.[i] || 1;
        }
      }
    }
    return pricePerDayArray;
  };

  const [combinedData, setCombinedData] = useState<CombinedData>();

  // ! useEffect for extracting data from local storage of all the pages from 1 to 9
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
      };
      setCombinedData(combinedData);
      return combinedData;
    };

    const data = fetchDataFromLocalStorage();
    console.log(data, "Hello I am here");
  }, []);

  const [propertyId, setPropertyId] = useState<string>();
  const [propertyVSID, setPropertyVSID] = useState<string>();

  const [user, setuser] = useState<UserInterface>();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchuser = async () => {
      setLoading(true);
      try {
        const user = await axios.post("/api/user/getuserbyid", {
          userId: userId,
        });
        if (user) {
          console.log("user data", user.data.data.email);
          setuser(user.data.data);
          setLoggedInUserEmail(user.data.loggedInUserEmail);
        }
        setLoading(false);
        console.log(user);
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    };
    fetchuser();
  }, []);

  console.log(user?.email, "At line number 222");

  // ! combining data from all the pages in data object and clearing the local storage after making the post request
  const handleGoLive = async () => {
    setGoLiveState(true);
    setIsLoading(true);
    const data = {
      userId: userId,
      email: user?.email,
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
      basePriceLongTerm: combinedData?.basePriceLongTerm,
      weekendPrice: combinedData?.weekendPrice,
      weeklyDiscount: combinedData?.weeklyDiscount,
      currency: combinedData?.currency,
      pricePerDay: createPricePerDayArray(combinedData?.numberOfPortions || 1),
      // pricePerDay: Array.from(
      //   { length: combinedData?.numberOfPortions || 1 },
      //   () => monthArray
      // ),

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

      hostedBy: loggedInUserEmail,

      area: combinedData?.area,
      subarea: combinedData?.subarea,
      constructionYear: combinedData?.constructionYear,
      floor: combinedData?.floor,
      isTopFloor: combinedData?.isTopFloor,
      orientation: combinedData?.orientation,
      levels: combinedData?.levels,
      zones: combinedData?.zones,
      propertyStyle: combinedData?.propertyStyle,
      isSuitableForStudents: combinedData?.isSuitableForStudents,
      monthlyExpenses: combinedData?.monthlyExpenses,
      heatingMedium: combinedData?.heatingMedium,
      energyClass: combinedData?.energyClass,
      heatingType: combinedData?.heatingType,
      neighbourhood: combinedData?.neighbourhood,

      nearbyLocations: combinedData?.nearbyLocations,

      rentalType: combinedData?.rentalType,
      monthlyDiscount: combinedData?.monthlyDiscount,
      longTermMonths: combinedData?.longTermMonths,
      isLive: true,
    };

    try {
      const response = await axios.post(
        "/api/createnewproperty/newProperties",
        data
      );
      console.log(data, "Hello i am here look at me ");
      if (response.status === 200) {
        console.log("Property is now live");
        setIsLiveDisabled(true);
        setPropertyVSID(response.data.VSID);
        setPropertyId(response.data._id);
        console.log(data, "The whole data that going to be livel");
        console.log('response: ', response.data);
        toast({
          title: "Your Property is Now Live!",
          description: `Your property for ${user?.name} is now live!`,
        });
        // clearLocalStorage();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Some error occurred",
        description:
          "There are some issues with your request. Please try again.",
      });
      console.log(error);
      console.log(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-12">
        <div>
          <h2 className="text-2xl mb-8 font-semibold border-b border-primary pb-2">
            Almost There! 🚀
          </h2>
          <span className="block mt-2">
            You&apos;re just one step away from listing your property. Tap on
            &quot;Continue&quot; to finalize and publish your property listing.
          </span>
        </div>
        <div className="border rounded-lg p-4">
          <div className="">
            <div className="flex justify-center items-center overflow-hidden">
              {propertyCoverFileUrl ? (
                <AspectRatio ratio={16 / 9}>
                  <img
                    src={propertyCoverFileUrl}
                    alt="coverImage"
                    className="card-img-top rounded-xl object-cover"
                  />
                </AspectRatio>
              ) : (
                <p className="flex items-center justify-center">No image 404</p>
              )}
            </div>
            <div className="card-body mt-2 ml-2">
              <h1 className="mt-2">{page3?.portionName?.[0]}</h1>
            </div>
            <div className="flex gap-2 ml-2 mt-2 items-center">
              {page2?.country && (
                <h4>
                  {page2?.city}, {page2?.country}
                </h4>
              )}
            </div>
          </div>
          <div className="flex items-center mt-4 gap-x-4 justify-between">
            <div className="w-full">
              {propertyVSID ? (
                <Link
                  href={{
                    pathname: `https://www.vacationsaga.com/listing-stay-detail`,
                    query: { id: propertyId },
                  }}
                >
                  <Button className="w-full">Preview</Button>
                </Link>
              ) : (
                <>
                  {isLoading ? (
                    <ScreenLoader />
                  ) : (
                    <Button
                      className="w-full"
                      onClick={handleGoLive}
                      disabled={
                        isLiveDisabled || !combinedData?.placeName || loading
                      }
                    >
                      Go live 🚀
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="w-full flex items-center justify-between gap-x-2">
              <Link className="w-full" href="/dashboard/add-listing/1">
                <Button className="w-full">
                  <Pencil className="h-3 w-3" />
                  <span className="ml-3 text-sm">Edit</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col ml-2 gap-2">
          {propertyVSID && (
            <div className="flex items-center gap-2">
              <div className="text-xs">Your VSID: {propertyVSID}</div>
              <Button
                onClick={() => navigator.clipboard.writeText(propertyVSID)}
                className=""
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}

          {propertyId && (
            <div className="flex items-center gap-2">
              <div className="text-xs">
                Your Property Link:{" "}
                <a
                  href={`https://www.vacationsaga.com/listing-stay-detail?id=${propertyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  https://www.vacationsaga.com/listing-stay-detail?id=
                  {propertyId}
                </a>
              </div>
              <Button
                onClick={() =>
                  navigator.clipboard.writeText(
                    `https://www.vacationsaga.com/listing-stay-detail?id=${propertyId}`
                  )
                }
                className=""
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-x-4 ml-2 mb-4">
        <Link
          href={{
            pathname: `/dashboard/add-listing/9`,
            query: { userId: userId },
          }}
        >
          <Button>Go back</Button>
        </Link>
      </div>
    </>
  );
};

export default PageAddListing10;
