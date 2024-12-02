"use client";
import CustomTooltip from "@/components/CustomToolTip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip } from "@/components/ui/tooltip";
import { PropertiesDataType, QuickListingInterface } from "@/util/type";
import axios from "axios";
import { House, LucideLoader2, Plus, Star, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import Pusher from "pusher-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa6";
import toast, { Toaster } from "react-hot-toast";
import debounce from "lodash.debounce";
import { CustomDialog } from "@/components/CustomDialog";

interface pageProps {
  params: {
    id: string;
  };
}

interface PropertyObject extends PropertiesDataType {
  isFavourite: boolean;
}

interface quickListingShowcase extends PropertyObject {
  QID: string;
  ownerName: string;
  ownerMobile: string;
  description: string;
  address: string;
}

const Page = ({ params }: pageProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPropertyLoading, setIspropertyLoading] = useState(false);
  const roomId = params.id[0].split("-")[0];
  const propertyIdRef = useRef<HTMLInputElement>(null);
  const [showcaseProperties, setShowcaseProperties] = useState<
    Partial<quickListingShowcase>[]
  >([]);
  const [rejectedProperties, setRejectedProperties] = useState<
    Partial<quickListingShowcase>[]
  >([]);
  const [favouriteProperties, setFavouriteProperties] = useState<string[]>([]);
  const [removedPropertyIndex, setRemovedPropertyIndex] = useState(-1);
  const [retractedPropertyIndex, setRetractedPropertyIndex] = useState(-1);
  const [alreadyAddedProperty, setAlreadyAddedProperty] = useState<string>("");
  const [favouriteUpdatedProperties, setFavouriteUpdatedProperties] = useState<
    string[]
  >([]);
  const [role, setRole] = useState("");
  const [quickListingProp, setQuickListingProp] =
    useState<QuickListingInterface>();

  useEffect(() => {
    const roomDetails = params.id[0].split("-");
    const roomId = roomDetails[0];
    const roomPassword = roomDetails[1];

    const checkRoomCredentials = async (
      roomId: string,
      roomPassword: string
    ) => {
      try {
        setIsLoading(true);
        const response = await axios.post("/api/room/joinRoom", {
          roomId,
          roomPassword,
        });
        setRole(response.data.role);
        setIsLoading(false);
      } catch (err: any) {
        console.log("Error in verifying room credentails: ", err);
      }
      setIsLoading(false);
    };

    const fetchRoomProperties = async (roomId: string) => {
      try {
        const response = await axios.post("/api/room/getPropertiesFromRoom", {
          roomId,
        });
        setShowcaseProperties(response.data.showcaseProperties);
        setRejectedProperties(response.data.rejectedProperties);
      } catch (err: any) {
        console.log("Error in fetching room properties: ", err);
      }
    };

    checkRoomCredentials(roomId, roomPassword);
    fetchRoomProperties(roomId);
  }, []);

  const addProperty = async () => {
    if (!propertyIdRef?.current?.value) return;

    if (
      showcaseProperties.filter(
        (item) => item._id === propertyIdRef?.current?.value
      ).length
    ) {
      setAlreadyAddedProperty(propertyIdRef?.current?.value);
      toast("Property Already Added", {
        icon: "❗",
      });
      setTimeout(() => {
        setAlreadyAddedProperty("");
      }, 3000);
      return;
    }

    try {
      setIspropertyLoading(true);
      const response = await axios.post("/api/room/addPropertyInRoom", {
        propertyId: propertyIdRef?.current?.value,
        roomId: roomId,
      });
    } catch (err: any) {
      toast.error("Unable to add property");
    } finally {
      setIspropertyLoading(false);
      propertyIdRef.current.value = "";
    }
  };

  const removeProperty = async (index: number, propertyId: string) => {
    setRemovedPropertyIndex(index);
    try {
      const response = await axios.patch("/api/room/removePropertyFromRoom", {
        roomId: roomId,
        propertyId: propertyId,
      });
    } catch (err: any) {
      console.log("Error in removing property: ", err);
    }
    setRemovedPropertyIndex(-1);
  };

  const retractProperty = async (index: number, propertyId: string) => {
    setRetractedPropertyIndex(index);
    try {
      const response = await axios.post(
        "/api/room/retractPropertyFromRejected",
        { roomId, propertyId }
      );
    } catch (err: unknown) {
      console.log("err: ", err);
    } finally {
      setRetractedPropertyIndex(-1);
    }
  };
  const debouncedAddToFavourite = useCallback(
    debounce(async (favouriteProperties: string[]) => {
      try {
        const response = await axios.patch("/api/room/addPropertyToFavourite", {
          roomId,
          propertyIds: favouriteProperties,
          client: role,
        });
        setFavouriteProperties([]);
      } catch (err: unknown) {
        toast.error("Error in adding to favourite");
      }
    }, 5000),
    []
  );

  useEffect(() => {
    if (favouriteProperties.length > 0) {
      debouncedAddToFavourite(favouriteProperties);
    }

    return () => debouncedAddToFavourite.cancel();
  }, [favouriteProperties]);

  useEffect(() => {
    const pusher = new Pusher("323cb59d9065a784e864", {
      cluster: "ap2",
    });

    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind("showcasePropertyAdded", (data: any) => {
      setShowcaseProperties((prev) => {
        const newProperties = [...prev];
        newProperties.push(data.data);
        return newProperties;
      });
      toast("New Property Added!", {
        icon: "🏠",
      });
    });

    channel.bind("propertyRemoved", (data: any) => {
      const propertyId = data._id;
      setShowcaseProperties((prev) => {
        const newProperties = prev.filter(
          (property) => property._id !== propertyId
        );
        return newProperties;
      });
      setRejectedProperties((prev) => {
        const newRemovedProperties = [...prev];
        const isAlreadyPresent = newRemovedProperties?.find(
          (item) => item?._id === propertyId
        );
        if (!isAlreadyPresent) newRemovedProperties.push(data);
        return newRemovedProperties;
      });
      toast.success("Property Removed!");
    });

    channel.bind("retractedProperty", (data: any) => {
      setShowcaseProperties((prev) => [...prev, data]);
      setRejectedProperties((prev) => {
        const newRemovedProperties = prev.filter(
          (item) => item._id! !== data._id
        );
        return newRemovedProperties;
      });
      toast.success("Property Retracted!");
    });

    channel.bind("updateFavourites", (data: any) => {
      const favPropertyIds = data.propertyIds;
      const client = data.client;
      if (client !== role) {
        setShowcaseProperties((prev) => {
          const newProperties = [...prev];
          prev.forEach((item, index: number) => {
            if (favPropertyIds.includes(item._id!)) {
              const propertyObject = { ...newProperties[index] };
              propertyObject.isFavourite = !propertyObject.isFavourite;
              newProperties.splice(index, 1, propertyObject);
            }
          });
          return newProperties;
        });
      }
      setFavouriteUpdatedProperties(favPropertyIds);
      toast("Favourites Updated", {
        icon: "🌟",
      });
      // setTimeout(() => {
      //   setFavouriteUpdatedProperties([]);
      // }, 3000);
    });

    return () => {
      pusher.unsubscribe(`room-${roomId}`);
    };
  }, [roomId]);

  return (
    <div className=" w-full h-full p-2">
      <Toaster position="top-right" reverseOrder={true} />
      {isLoading ? (
        <div className=" w-full h-full flex justify-center items-center">
          <LucideLoader2 className=" animate-spin" size={48} />
        </div>
      ) : (
        <div className={``}>
          {role !== "Visitor" && (
            <div className=" flex gap-x-8 items-end">
              <div>
                <Label>
                  Enter Property Id
                  <Input
                    type="text"
                    ref={propertyIdRef}
                    placeholder="Enter Property Id"
                    className="w-80"
                  />
                </Label>
              </div>
              <Button
                className=" font-semibold text-base flex items-center gap-x-2 "
                onClick={addProperty}
              >
                <House /> {isPropertyLoading ? "Adding..." : "Add Property"}
              </Button>
            </div>
          )}
          {removedPropertyIndex !== -1 && (
            <div className=" mt-4 flex justify-center">
              Removing Property <LucideLoader2 className=" animate-spin" />
            </div>
          )}{" "}
          {showcaseProperties?.length > 0 && (
            <p className=" dark:text-white text-2xl font-medium mt-2 text-[#F7951D]">
              Property Showcase
            </p>
          )}
          <div className=" flex flex-wrap gap-x-4 mt-4">
            {role !== "Visitor" && (
              <div className=" h-32 w-32 border-2 border-dotted border-neutral-700 hover:bg-neutral-800 cursor-pointer rounded-lg flex flex-col justify-center items-center">
                <Plus size={32} />
                {roomId && (
                  <CustomDialog
                    roomId={roomId}
                    setQuickListingProp={setQuickListingProp}
                  />
                )}
              </div>
            )}
            {showcaseProperties?.map(
              (item, index: number) =>
                item?._id && (
                  <div
                    className={` my-1 flex flex-col items-center ${
                      index === removedPropertyIndex && "opacity-20"
                    } `}
                    key={index}
                  >
                    <Link
                      href={{
                        pathname:
                          item?.VSID === "xxxx"
                            ? `http://localhost:3001/roomListing/${item._id}`
                            : `https://www.vacationsaga.com/listing-stay-detail/${item._id}`,
                      }}
                      target="_blank"
                    >
                      <img
                        src={item?.propertyImages?.[0]}
                        alt="PropertyImage"
                        className={` w-32 h-32 rounded-md shadow-md shadow-white/30 ${
                          item._id === alreadyAddedProperty &&
                          "border-4 border-pink-600 shadow-2xl"
                        } ${
                          (favouriteUpdatedProperties.includes(item._id!) ||
                            item.isFavourite) &&
                          "border-4 border-yellow-400 shadow-2xl"
                        }`}
                      />
                      <p>{item?.QID}</p>
                      <p>{item?.basePrice}</p>
                      <p>{item?.VSID}</p>
                    </Link>
                    <div className=" flex gap-x-2 my-2">
                      <Button
                        variant={"outline"}
                        onClick={() => {
                          setShowcaseProperties((prev) => {
                            const newObject = { ...prev[index] };
                            newObject.isFavourite = !newObject.isFavourite;
                            prev[index] = newObject;
                            return [...prev];
                          });
                          if (favouriteProperties.indexOf(item._id!) === -1) {
                            setFavouriteProperties((prev) => [
                              ...prev,
                              item._id!,
                            ]);
                          } else {
                            setFavouriteProperties((prev) =>
                              prev.filter((id) => id !== item._id!)
                            );
                          }
                        }}
                        className="shadow-md shadow-white/30"
                      >
                        {showcaseProperties[index].isFavourite ? (
                          <FaStar className=" text-xl text-yellow-400" />
                        ) : (
                          <FaRegStar className=" text-xl" />
                        )}
                      </Button>
                      <Button
                        variant={"outline"}
                        onClick={() => removeProperty(index, item._id!)}
                        className="shadow-md shadow-white/30"
                      >
                        <CustomTooltip
                          icon={<Trash2 size={18} />}
                          desc="Remove Property"
                        />
                      </Button>
                    </div>
                  </div>
                )
            )}

            {isPropertyLoading && (
              <div className=" flex flex-col items-center">
                <div className="w-32 h-32 rounded-lg bg-neutral-600 animate-pulse "></div>
                <div className=" flex gap-x-2 my-2">
                  <div className=" h-8 w-8 rounded-lg bg-neutral-600 animate-pulse"></div>
                  <div className=" h-8 w-8 rounded-lg bg-neutral-600 animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
          <div className=" my-2 h-1 bg-neutral-400 dark:bg-neutral-800 rounded-lg "></div>
          <div className=" mt-2">
            {rejectedProperties?.length > 0 && (
              <p className=" dark:text-white text-2xl font-medium text-[#F7951D]">
                Rejected Properties
              </p>
            )}
            <div className=" flex flex-wrap gap-x-4 mt-4">
              {rejectedProperties?.map(
                (item, index: number) =>
                  item?._id && (
                    <div
                      className={` my-1 flex flex-col items-center ${
                        item._id === alreadyAddedProperty && " opacity-20"
                      } ${index === retractedPropertyIndex && "opacity-20"} `}
                      key={index}
                    >
                      <Link
                        href={{
                          pathname: `https://www.vacationsaga.com/listing-stay-detail/${item._id}`,
                        }}
                        target="_blank"
                      >
                        <img
                          src={item?.propertyImages?.[0]}
                          alt="PropertyImage"
                          className=" w-32 h-32 rounded-lg shadow-md shadow-white/30"
                        />
                      </Link>
                      <div className=" flex justify-center mt-2">
                        <Button
                          variant={"outline"}
                          className="shadow-md shadow-white/30"
                          onClick={() => retractProperty(index, item._id!)}
                        >
                          <CustomTooltip
                            icon={<Undo2 size={18} />}
                            desc="Add to showcase again"
                          />{" "}
                        </Button>
                      </div>
                    </div>
                  )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
