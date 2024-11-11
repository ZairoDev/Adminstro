"use client";

import axios from "axios";
import { LucideLoader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface pageProps {
  params: {
    id: string;
  };
}

const page = ({ params }: pageProps) => {
  const [isLoading, setIsLoading] = useState(false);

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

    checkRoomCredentials(roomId, roomPassword);
  }, []);

  return (
    <div className=" w-full h-full border border-white">
      {isLoading ? (
        <div className=" w-full h-full flex justify-center items-center">
          <LucideLoader2 className=" animate-spin" size={32} />
        </div>
      ) : (
        <div>User Details: {params.id[0]}</div>
      )}
    </div>
  );
};

export default page;
