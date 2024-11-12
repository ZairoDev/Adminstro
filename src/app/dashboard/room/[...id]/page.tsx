"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PropertiesDataType } from "@/util/type";
import axios from "axios";
import { House, LucideLoader2, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import Pusher from "pusher-js";
import { useEffect, useRef, useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa6";

interface pageProps {
  params: {
    id: string;
  };
}

const Page = ({ params }: pageProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const roomId = params.id[0].split("-")[0];
  const propertyIdRef = useRef<HTMLInputElement>(null);
  const [showcaseProperties, setShowcaseProperties] = useState<
    Partial<PropertiesDataType>[]
  >([]);
  const [favouriteProperties, setFavouriteProperties] = useState(
    Array.from({ length: showcaseProperties.length }, () => false)
  );

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
        console.log("all properties: ", response.data.data);
        setShowcaseProperties(response.data.data);
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
    });

    return () => {
      pusher.unsubscribe(`room-${roomId}`);
    };
  }, [roomId]);

  const addProperty = async () => {
    if (!propertyIdRef?.current?.value) return;

    try {
      const response = await axios.post("/api/room/addPropertyInRoom", {
        propertyId: propertyIdRef?.current?.value,
        roomId: roomId,
      });
      console.log("response: ", response);
    } catch (err: any) {
      console.log("error in adding property: ", err);
    }
  };

  const removeProperty = async (index: number, propertyId: string) => {
    try {
      const response = await axios.post("/api/room/deletePropertyFromRoom", {
        propertyIndex: index,
        propertyId: propertyId,
      });
      console.log("property deleted: ", response);
    } catch (err: any) {
      console.log("Error in removing property: ", err);
    }
  };

  return (
    <div className=" w-full h-full p-2">
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
              <House /> Add Property
            </Button>
          </div>
          <div className=" flex flex-wrap gap-x-4 mt-4">
            {showcaseProperties?.map((item, index: number) => (
              <div className=" my-1 flex flex-col items-center" key={index}>
                <Link
                  href={{
                    pathname: `https://www.vacationsaga.com/listing-stay-detail/${item._id}`,
                  }}
                  target="_blank"
                >
                  <img
                    src={item?.propertyImages?.[0]}
                    alt="PropertyImage"
                    className=" w-32 h-32 rounded-lg"
                  />
                </Link>
                <div className=" flex gap-x-2 my-2">
                  <Button
                    variant={"outline"}
                    onClick={() =>
                      setFavouriteProperties((prev) => {
                        const newFavourites = [...prev];
                        newFavourites[index] = !newFavourites[index];
                        return newFavourites;
                      })
                    }
                  >
                    {favouriteProperties[index] ? (
                      <FaRegStar className=" text-base" />
                    ) : (
                      <FaStar className=" text-yellow-600 text-base" />
                    )}
                  </Button>
                  <Button
                    variant={"outline"}
                    onClick={() => removeProperty(index, item._id!)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
