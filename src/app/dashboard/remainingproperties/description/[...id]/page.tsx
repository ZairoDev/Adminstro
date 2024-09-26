"use client";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Property } from "@/util/type";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { MdArrowDropDown, MdArrowRight } from "react-icons/md";
import { FaEuroSign, FaInfoCircle, FaUser } from "react-icons/fa";
import { IoIosBed } from "react-icons/io";
import { FaBath } from "react-icons/fa";
import { SlSizeFullscreen } from "react-icons/sl";
import CustomTooltip from "@/components/CustomToolTip";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Img from "@/components/Img";
interface PageProps {
  params: {
    id: string;
  };
}
const Page = ({ params }: PageProps) => {
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveChangesLoading, setSaveChangesLoading] = useState<boolean>(false);
  const [numberOfPortions, setNumberOfPortions] = useState<number>(1);
  const [isPortionOpen, setIsPortionOpen] = useState<boolean[]>(() =>
    Array.from({ length: numberOfPortions }, () => false)
  );
  const [isNewReview, setIsNewReview] = useState<boolean>(false);

  useEffect(() => {
    if (params.id) {
      const fetchProperty = async () => {
        setLoading(true);
        try {
          const response = await axios.post("/api/singleproperty/getproperty", {
            propertyId: params.id,
          });
          console.log(response.data);
          setProperty(response.data);
          setNumberOfPortions(response.data.basePrice.length);
          setLoading(false);
          if (response.data.newReviews !== undefined) setIsNewReview(true); 
        } catch (error: any) {
          console.error("Error fetching property:", error);
          setLoading(false);
        } finally {
          setLoading(false);
        }
      };
      fetchProperty();
    }
  }, [params.id]);

  const [formData, setFormData] = useState<Partial<Property>>({
    VSID: property?.VSID,
    rentalType: property?.rentalType,

    propertyType: property?.propertyType,
    placeName: property?.placeName,
    newPlaceName: property?.newPlaceName,
    rentalForm: property?.rentalForm,
    numberOfPortions: property?.numberOfPortions,

    street: property?.street,
    postalCode: property?.postalCode,
    city: property?.city,
    state: property?.state,
    country: property?.country,

    portionName: property?.portionName,
    portionSize: property?.portionSize,
    guests: property?.guests,
    bedrooms: property?.bedrooms,
    beds: property?.beds,
    bathroom: property?.bathroom,
    kitchen: property?.kitchen,
    childrenAge: property?.childrenAge,

    basePrice: property?.basePrice,
    weekendPrice: property?.weekendPrice,
    monthlyDiscount: property?.monthlyDiscount,

    generalAmenities: property?.generalAmenities,
    otherAmenities: property?.otherAmenities,
    safeAmenities: property?.safeAmenities,

    smoking: property?.smoking,
    pet: property?.pet,
    party: property?.party,
    cooking: property?.cooking,
    additionalRules: property?.additionalRules,

    center: property?.center,

    reviews: property?.reviews,
    newReviews: property?.newReviews,

    propertyCoverFileUrl: property?.propertyCoverFileUrl,
    propertyPictureUrls: property?.propertyPictureUrls,
    portionCoverFileUrls: property?.portionCoverFileUrls,
    portionPictureUrls: property?.portionPictureUrls,

    night: property?.night,
    time: property?.time,
    datesPerPortion: property?.datesPerPortion,

    isLive: property?.isLive,
  });

  useEffect(() => {
    if (property) {
      setFormData({
        VSID: property.VSID,
        rentalType: property.rentalType,

        propertyType: property.propertyType,
        placeName: property.placeName,
        newPlaceName: property.newPlaceName,
        rentalForm: property.rentalForm,
        numberOfPortions: property.numberOfPortions,

        street: property.street,
        postalCode: property.postalCode,
        city: property.city,
        state: property.state,
        country: property.country,

        portionName: property.portionName,
        portionSize: property.portionSize,
        guests: property.guests,
        bedrooms: property.bedrooms,
        beds: property.beds,
        bathroom: property.bathroom,
        kitchen: property.kitchen,
        childrenAge: property.childrenAge,

        center: property.center,
        basePrice: property.basePrice,
        weekendPrice: property.weekendPrice,
        monthlyDiscount: property.monthlyDiscount,

        generalAmenities: property.generalAmenities,
        otherAmenities: property.otherAmenities,
        safeAmenities: property.safeAmenities,

        smoking: property.smoking,
        pet: property.pet,
        party: property.party,
        cooking: property.cooking,
        additionalRules: property.additionalRules,

        propertyCoverFileUrl: property?.propertyCoverFileUrl,
        propertyPictureUrls: property?.propertyPictureUrls,
        portionCoverFileUrls: property?.portionCoverFileUrls,
        portionPictureUrls: property?.portionPictureUrls,

        reviews: property.reviews,
        newReviews: property.newReviews,

        night: property.night,
        time: property.time,
        datesPerPortion: property.datesPerPortion,

        isLive: property.isLive,
      });
    }
  }, [property]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updateDesc = async () => {
      setSaveChangesLoading(true);
      try {
        const response = await axios.post(
          "/api/singleproperty/updatedescription",
          {
            newPlaceName: formData.newPlaceName,
            newReviews: formData.newReviews,
            propertyId: params.id,
          }
        );
        toast({
          title: "Updated Successfully",
        });
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Something went wrong!",
          description: `Error: ${err.response.data.error}`,
        });
      }
      setSaveChangesLoading(false);
    };
    updateDesc();
  };

  useEffect(() => {
    if (saveChangesLoading) {
      toast({
        title: "Saving Changes...",
        description: "Description is being updated!",
      });
    }
  }, [saveChangesLoading]);

  return (
    <>
      <div className="max-w-6xl p-2 m-auto ">
        {loading ? (
          <div className="flex items-center justify-center h-screen w-full">
            <Loader />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex sm:border rounded-lg sm:p-4 flex-col gap-x-2 gap-y-4 mt-4">
              <div className="border-b border-primary">
                <h1 className="text-2xl pb-2 text-center font-semibold">
                  Edit description
                </h1>
              </div>
              <div>
                <div className="flex rounded-lg sm:p-2  flex-col gap-x-2 gap-y-4 mt-4">
                  <div className="xs:flex items-center gap-x-4 justify-between">
                    <div className="w-full">
                      <label className="text-xs" htmlFor="portionName">
                        Property Name
                        <Input
                          type="text"
                          name="Property"
                          disabled
                          value={formData?.placeName || ""}
                        />
                      </label>
                    </div>

                    <div className="w-full">
                      <label className="text-xs" htmlFor="portionName">
                        New Name for Property
                        <Input
                          type="text"
                          name="Property"
                          value={formData?.newPlaceName || ""}
                          onChange={(e) => {
                            const newObj = { ...formData };
                            newObj["newPlaceName"] = e.target.value;
                            setFormData(newObj);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <div>
                      <h1 className="mt-1">Property Picture</h1>
                    </div>
                    <div className="mt-4 space-x-2 overflow-x-auto">
                      <div className="flex space-x-4">
                        {formData?.propertyPictureUrls?.map((url, index) => (
                          <div key={index} className="flex-shrink-0">
                            <Img
                              src={url || "/placeholder.webp"}
                              alt="not found"
                              className="w-40 h-40 object-cover rounded-md"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className=" sm:flex gap-x-4">
                    <div className=" text-sm xss:text-md sm:text-lg my-2 w-full">
                      <label htmlFor="review">Description of Property</label>
                      <Textarea
                        className="h-64"
                        name="review"
                        value={formData?.reviews?.[0] || ""}
                        disabled
                      />
                    </div>
                    <div className="text-sm xs:text-md sm:text-lg my-2 w-full">
                      <label
                        htmlFor="review"
                        className="flex justify-between items-center"
                      >
                        New Description of Property{" "}
                        <span className=" text-xs">
                          (
                          {`Words Count: ${
                            formData?.newReviews
                              ?.split(" ")
                              .filter((item) => item != "").length || 0
                          }`}
                          )
                        </span>
                      </label>
                      <Textarea
                        className="h-64"
                        name="review"
                        value={formData?.newReviews || ""}
                        onChange={(e) => {
                          const newObj = { ...formData };
                          newObj["newReviews"] = e.target.value;
                          setFormData(newObj);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {Array.from({
              length: numberOfPortions,
            }).map((item, index) => {
              return (
                <div
                  className=" text-sm sm:text-base flex flex-col space-y-4 my-4 w-full"
                  key={index}
                >
                  {" "}
                  <div
                    className=""
                    onClick={() =>
                      setIsPortionOpen((prev) => {
                        const newIsPortionOpen = [...prev];
                        newIsPortionOpen[index] = !newIsPortionOpen[index];
                        return newIsPortionOpen;
                      })
                    }
                  >
                    <div className=" flex flex-wrap xs:flex-nowrap gap-y-2 items-center transition-transform duration-300 ease-in-out cursor-pointer border px-4 py-2 rounded-lg justify-center xs:justify-normal ">
                      <p className=" text-nowrap">Portion no {index + 1}</p>
                      {isPortionOpen[index] ? (
                        <MdArrowDropDown className="text-2xl" />
                      ) : (
                        <MdArrowRight className="text-2xl" />
                      )}{" "}
                      {isPortionOpen[index] && (
                        <div className=" flex flex-wrap md:flex-nowrap gap-x-4 xs:ml-8 justify-center gap-y-2">
                          <CustomTooltip
                            icon={<FaUser />}
                            content={formData?.guests?.[index]}
                            desc="No. Of Guests"
                          />
                          <CustomTooltip
                            icon={<IoIosBed />}
                            content={formData?.beds?.[index]}
                            desc="No. Of beds"
                          />
                          <CustomTooltip
                            icon={<FaBath />}
                            content={formData?.bathroom?.[index]}
                            desc="No. Of bathroom"
                          />
                          <CustomTooltip
                            icon={<SlSizeFullscreen />}
                            content={formData?.portionSize?.[index]}
                            desc="Portion's size"
                          />
                          <CustomTooltip
                            icon={<FaEuroSign />}
                            content={formData?.basePrice?.[index]}
                            desc="Price of Portion"
                          />
                          <CustomTooltip
                            text={formData?.portionName?.[index]}
                            desc="Name of Portion"
                            className=" xs:text-nowrap"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {isPortionOpen[index] && (
                    <>
                      <div className=" flex flex-col space-y-4">
                        <div className="mt-4 space-x-2 overflow-x-auto">
                          <div className="flex space-x-4">
                            {formData?.portionPictureUrls?.[index]?.map(
                              (url, index) => (
                                <div key={index} className="flex-shrink-0">
                                  <Img
                                    src={url || "/placeholder.webp"}
                                    alt="not found"
                                    className="w-40 h-40 object-cover rounded-md"
                                  />
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <div className=" flex mt-4">
              <Button type="submit" disabled={isNewReview}>
                {saveChangesLoading ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
};

export default Page;
