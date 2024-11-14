"use client";

import CustomTooltip from "@/components/CustomToolTip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip } from "@/components/ui/tooltip";
import { PropertiesDataType } from "@/util/type";
import axios from "axios";
import { House, LucideLoader2, Star, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import Pusher from "pusher-js";
import { useEffect, useRef, useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa6";
import toast, { Toaster } from "react-hot-toast";

interface pageProps {
  params: {
    id: string;
  };
}

interface PropertyObject extends PropertiesDataType {
  isFavourite: boolean;
}

const Page = ({ params }: pageProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPropertyLoading, setIspropertyLoading] = useState(false);
  const roomId = params.id[0].split("-")[0];
  const propertyIdRef = useRef<HTMLInputElement>(null);
  const [showcaseProperties, setShowcaseProperties] = useState<
    Partial<PropertyObject>[]
  >([]);
  const [rejectedProperties, setRejectedProperties] = useState<
    Partial<PropertiesDataType>[]
  >([]);
  const [removedPropertyIndex, setRemovedPropertyIndex] = useState(-1);
  const role = "Visitor";

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
        console.log("response: ", response.data);
        setIsLoading(false);
      } catch (err: any) {
        console.log("error: ", err);
      }
      setIsLoading(false);
    };

    const fetchRoomProperties = async (roomId: string) => {
      try {
        const response = await axios.post("/api/room/getPropertiesFromRoom", {
          roomId,
        });
        console.log("response: ", response);
        console.log("all properties: ", response.data.showcaseProperties);
        setShowcaseProperties(response.data.showcaseProperties);
        setRejectedProperties(response.data.rejectedProperties);
      } catch (err: any) {
        console.log("Error in fetching room properties: ", err);
      }
    };

    checkRoomCredentials(roomId, roomPassword);
    fetchRoomProperties(roomId);
  }, []);

  useEffect(() => {
    const pusher = new Pusher("323cb59d9065a784e864", {
      cluster: "ap2",
    });

    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind("showcasePropertyAdded", (data: any) => {
      console.log("data: ", data);
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
      console.log("property removed: ", data);
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

    return () => {
      pusher.unsubscribe(`room-${roomId}`);
    };
  }, [roomId]);

  const addProperty = async () => {
    if (!propertyIdRef?.current?.value) return;

    try {
      setIspropertyLoading(true);
      const response = await axios.post("/api/room/addPropertyInRoom", {
        propertyId: propertyIdRef?.current?.value,
        roomId: roomId,
      });
      console.log("response: ", response);
    } catch (err: any) {
      console.log("error in adding property: ", err);
    } finally {
      setIspropertyLoading(false);
    }
  };

  const removeProperty = async (index: number, propertyId: string) => {
    setRemovedPropertyIndex(index);
    try {
      const response = await axios.patch("/api/room/removePropertyFromRoom", {
        roomId: roomId,
        propertyId: propertyId,
      });
      console.log("property deleted: ", response);
    } catch (err: any) {
      console.log("Error in removing property: ", err);
    }
    setRemovedPropertyIndex(-1);
  };

  useEffect(() => {
    console.log("show case properties: ", showcaseProperties);
  }, [showcaseProperties]);

  return (
    <div className=" w-full h-full p-2">
      <Toaster position="top-right" reverseOrder={true} />
      {isLoading ? (
        <div className=" w-full h-full flex justify-center items-center">
          <LucideLoader2 className=" animate-spin" size={48} />
        </div>
      ) : (
        <div>
          <div className=" flex gap-x-8 items-end">
            <div>
              <Label>
                Enter Property Id
                <Input
                  type="text"
                  ref={propertyIdRef}
                  placeholder="Enter Property Id"
                  className=" w-80"
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
          {removedPropertyIndex !== -1 && (
            <div className=" mt-4 flex justify-center">
              {" "}
              Removing Property <LucideLoader2 className=" animate-spin" />
            </div>
          )}{" "}
          {showcaseProperties?.length > 0 && (
            <p className=" dark:text-white text-2xl font-medium mt-2">
              Property Showcase
            </p>
          )}
          <div className=" flex flex-wrap gap-x-4 mt-4">
            {showcaseProperties?.map(
              (item, index: number) =>
                item?._id && (
                  <div
                    className={` my-1 flex flex-col items-center ${
                      index === removedPropertyIndex && "opacity-20"
                    }`}
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
                        className=" w-32 h-32 rounded-md shadow-md shadow-white/30"
                      />
                    </Link>
                    <div className=" flex gap-x-2 my-2">
                      <Button
                        variant={"outline"}
                        onClick={() =>
                          setShowcaseProperties((prev) => {
                            const newObject = { ...prev[index] };
                            newObject.isFavourite = !newObject.isFavourite;
                            prev[index] = newObject;
                            return [...prev];
                          })
                        }
                        className="shadow-md shadow-white/30"
                      >
                        {showcaseProperties[index].isFavourite ? (
                          <FaStar className=" text-yellow-600" />
                        ) : (
                          <FaRegStar />
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
              <p className=" dark:text-white text-2xl font-medium">
                Rejected Properties
              </p>
            )}
            <div className=" flex flex-wrap gap-x-4 mt-4">
              {rejectedProperties?.map(
                (item, index: number) =>
                  item?._id && (
                    <div
                      className={` my-1 flex flex-col items-center`}
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
                          onClick={() => removeProperty(index, item._id!)}
                          className="shadow-md shadow-white/30"
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
