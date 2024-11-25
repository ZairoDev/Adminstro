"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { LucideLoader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const Page = () => {
  const { toast } = useToast();
  const router = useRouter();
  const roomIdRef = useRef<HTMLInputElement>(null);
  const roomPasswordRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinRoom = async () => {
    if (!roomIdRef.current?.value || !roomPasswordRef.current?.value) {
      return;
    }
    const roomId = roomIdRef?.current.value;
    const roomPassword = roomPasswordRef?.current.value;
    try {
      setIsLoading(true);
      const response = await axios.post("/api/room/joinRoom", {
        roomId,
        roomPassword,
      });
      toast({
        title: "Success",
        description: "You will be redirected to the Room",
      });
      router.push(`/dashboard/room/${roomId}-${roomPassword}`);
      setIsLoading(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Unable to Join Room",
        description: `${err.response.data.error}`,
      });
    }
    setIsLoading(false);
  };
  return (
    <div className=" w-full h-[93vh] flex items-center justify-center">
      <Card className=" w-80  shadow-lg rounded-lg relative overflow-hidden">
        <div className="absolute -bottom-20 -left-28 w-full h-40 bg-[url('https://vacationsaga.b-cdn.net/assets/couch.png')] bg-no-repeat bg-bottom bg-contain overflow-hidden opacity-80 pointer-events-none" />
        <div className="relative z-10">
          <CardHeader className="text-xl p-4 font-semibold">
            Join a Room
          </CardHeader>
          <CardContent className="flex flex-col gap-y-3">
            <Input
              placeholder="Room ID"
              className="px-4 py-2 border rounded-lg"
              ref={roomIdRef}
            />
            <Input
              placeholder="Room Password"
              type="text"
              className="px-4 py-2 border rounded-lg"
              ref={roomPasswordRef}
            />
            <div className="flex items-end justify-end">
              <Button
                className=" mt-2 flex items-center font-semibold py-2 rounded-lg"
                disabled={isLoading}
                onClick={handleJoinRoom}
              >
                {isLoading ? (
                  <LucideLoader2 size={18} className=" animate-spin" />
                ) : (
                  "Join Room"
                )}
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
};

export default Page;
