"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { CgSpinner } from "react-icons/cg";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ArrowLeft } from "lucide-react";
import { ModeToggle } from "@/components/themeChangeButton";

interface PageProps {
  params: {
    email: string;
  };
}

const Page = ({ params }: PageProps) => {
  const { toast } = useToast();
  const router = useRouter();
  const [otpInput, setOtpInput] = useState("");
  const email = params.email;
  console.log(email);
  const [remainingTime, setRemainingTime] = useState(60);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [disabledButton, setDisabledButton] = useState(true);
  const [verifyClick, setVerifyClick] = useState(true);

  useEffect(() => {
    if (remainingTime > 0) {
      const timerId = setTimeout(() => {
        setRemainingTime((prev) => prev - 1);
      }, 1000);

      return () => {
        clearTimeout(timerId);
      };
    }
    if (remainingTime == 0) {
      setDisabledButton(false);
    }
  }, [remainingTime]);

  const handleOTPverification = async () => {
    setVerifyLoading(true);
    if (otpInput.length !== 6) {
      setVerifyLoading(false);

      return toast({
        title: "Verify error",
        description: "Please enter a valid OTP",
      });
    }
    try {
      const response = await axios.post("/api/verify-otp", {
        otp: otpInput,
        email,
      });
      toast({
        title: "Verification Successful",
        description: "You have successfully logged in as Superadmin",
      });
      router.push("/");
    } catch (err: any) {
      console.log(err);
      console.log(err.response.data.error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
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
        title: "Verification otp sent",
        description: "Otp send sucessfully to your entered email address",
      });
      setRemainingTime(60);
    } catch (err: any) {
      toast({
        title: "Verification otp sent",
        description: `err`,
      });
    }
    setVerifyLoading(false);
  };

  return (
    <div className="h-screen flex">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-1/2 sm:flex hidden items-center justify-center">
        <Carousel className="w-full h-full">
          <CarouselContent>
            <CarouselItem>
              <img
                src="https://images.pexels.com/photos/3254754/pexels-photo-3254754.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Carousel Image 1"
                className="object-cover w-full h-full"
              />
            </CarouselItem>
            <CarouselItem>
              <img
                src="https://images.pexels.com/photos/4817608/pexels-photo-4817608.png?auto=compress&cs=tinysrgb&w=600"
                alt="Carousel Image 2"
                className="object-cover w-full h-full"
              />
            </CarouselItem>
            <CarouselItem>
              <img
                src="https://images.pexels.com/photos/2222839/pexels-photo-2222839.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Carousel Image 3"
                className="object-cover w-full h-full"
              />
            </CarouselItem>
            <CarouselItem>
              <img
                src="https://images.pexels.com/photos/2897548/pexels-photo-2897548.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Carousel Image 4"
                className="object-cover w-full h-full"
              />
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
      <div className="sm:w-1/2 w-full flex-col flex items-center justify-center">
        <div className="w-full max-w-sm px-6 py-8 border rounded-lg shadow-lg">
          <h1>Enter OTP</h1>

          {/* shadcn OTP input */}
          <InputOTP maxLength={6} onChange={setOtpInput}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <Button
            disabled={verifyLoading}
            onClick={handleOTPverification}
            className=" mt-4 mb-4"
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
              <p className="">
                Didn’t receive the OTP?{" "}
                <Button
                  variant="link"
                  disabled={disabledButton}
                  onClick={handleRetryOTP}
                >
                  Resend OTP
                </Button>
              </p>
              <p className=" mt-1">
                {disabledButton
                  ? `You can retry after ${remainingTime} seconds.`
                  : "You can now resend the OTP."}
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
