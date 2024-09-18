"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { CgSpinner } from "react-icons/cg";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

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
      <div className="w-1/2  sm:flex hidden items-center justify-center">
        <img
          src="https://images.pexels.com/photos/3254754/pexels-photo-3254754.jpeg?auto=compress&cs=tinysrgb&w=600"
          alt="Login Background"
          className="object-cover w-full h-full"
        />
      </div>
      <div className=" sm:w-1/2 w-full flex-col flex items-center justify-center">
        <div className="w-full max-w-sm px-6 py-8 border  rounded-lg shadow-lg">
          <h1>Enter OTP</h1>
          <Input
            type="text"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
          />
          <Button
            disabled={verifyLoading}
            onClick={handleOTPverification}
            className=" w-full mt-4 mb-4"
          >
            {verifyLoading ? (
              <div className="flex items-center gap-x-2 after: ">
                Verifying...
                <CgSpinner className="animate-spin ml-1 text-lg" />
              </div>
            ) : (
              "Verify"
            )}
          </Button>
          {verifyClick && (
            <div className="text-xs">
              <Button
                className="text-base  "
                variant="link"
                disabled={disabledButton}
                onClick={handleRetryOTP}
              >
                retry
              </Button>{" "}
              after {remainingTime} sec
            </div>
          )}
          <Button className="absolute top-0 left-0">
            <Link href="/login">Back</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Page;
