"use client";

import axios from "axios";
import Link from "next/link";
import { ArrowLeft, Timer } from "lucide-react";
import { CgSpinner } from "react-icons/cg";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/themeChangeButton";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
interface PageProps {
  params: {
    email: string;
  };
}
const Page = ({ params }: PageProps) => {
  const { setToken } = useAuthStore();

  const { toast } = useToast();
  const router = useRouter();
  const [otpInput, setOtpInput] = useState("");
  const email = params.email;
  console.log("email in verify otp page: ", email);
  const [remainingTime, setRemainingTime] = useState(10);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [disabledButton, setDisabledButton] = useState(true);
  const [verifyClick, setVerifyClick] = useState(true);

  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<number | null>(null);
  const timeRef = useRef(10);

  useEffect(() => {
    // Start the interval when the component mounts
    timerRef.current = window.setInterval(() => {
      if (timeRef.current > 0) {
        timeRef.current -= 1;
        setTimeLeft(timeRef.current);
      } else {
        clearTimer();
      }
    }, 1000);

    return () => clearTimer();
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // useEffect(() => {
  //   if (remainingTime > 0) {
  //     const timerId = setTimeout(() => {
  //       setRemainingTime((prev) => prev - 1);
  //     }, 1000);

  //     return () => {
  //       clearTimeout(timerId);
  //     };
  //   }
  //   if (remainingTime == 0) {
  //     setDisabledButton(false);
  //   }
  // }, [remainingTime]);

  const handleOTPverification = async () => {
    setVerifyLoading(true);
    if (otpInput.length !== 6) {
      setVerifyLoading(false);

      return toast({
        description: "Please enter a valid OTP",
      });
    }
    try {
      const response = await axios.post("/api/verify-otp", {
        otp: otpInput,
        email,
      });
      setToken(response.data.tokenData);
      toast({
        description: "You have successfully logged in as Superadmin",
      });
      // window.location.reload();
      router.refresh();
      router.push("/");
    } catch (err: any) {
      console.log(err);
      toast({
        variant: "destructive",
        description: `${err.response.data.error}`,
      });
    }
    setVerifyLoading(false);
  };
  const handleRetryOTP = async () => {
    setVerifyLoading(true);
    try {
      const response = await axios.post("/api/resend-otp", { email });
      toast({
        description: "Otp send sucessfully to your entered email address",
      });
      setRemainingTime(10);
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: `err`,
      });
    }
    setVerifyLoading(false);
  };

  return (
    <div className="h-dvh overflow-hidden flex">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-1/2 md:flex hidden items-center justify-center">
        <video className="w-full  h-screen object-cover" autoPlay muted loop>
          <source
            src="https://vacationsaga.b-cdn.net/loginvideo.mp4"
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="md:w-1/2 w-full flex-col flex items-center justify-center">
        <div className="w-full max-w-sm px-6 py-8 border rounded-lg shadow-lg">
          <h1>Verify OTP</h1>
          <p className=" text-neutral-700 text-sm mb-4">
            Enter the 6-digit code sent to your Email
          </p>

          <div className=" w-full flex justify-center">
            <InputOTP maxLength={6} onChange={setOtpInput}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            disabled={verifyLoading}
            onClick={handleOTPverification}
            className=" mt-4 mb-4 w-full"
          >
            {verifyLoading ? (
              <div className="flex items-center gap-x-2">
                Verifying...
                <CgSpinner className="animate-spin ml-1 text-lg" />
              </div>
            ) : (
              "Submit"
            )}
          </Button>
          {verifyClick && (
            <div className="text-center text-sm sm:text-base mt-4">
              <p className="">Didn’t receive the OTP ? </p>
              <p className=" mt-1 flex w-full justify-center items-center gap-x-2 text-sm text-gray-400">
                <Timer size={18} />
                {timeLeft != 0 && `You can retry after ${timeLeft} seconds.`}
                {!timeLeft && (
                  <Button
                    variant="link"
                    disabled={timeLeft != 0}
                    onClick={handleRetryOTP}
                    className=" text-sm"
                  >
                    Resend OTP
                  </Button>
                )}
              </p>
            </div>
          )}
          <Link
            className=" flex items-center justify-center gap-x-1"
            href="/login"
          >
            <Button className="absolute top-4 left-4">
              <ArrowLeft size={18} /> Back
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Page;
