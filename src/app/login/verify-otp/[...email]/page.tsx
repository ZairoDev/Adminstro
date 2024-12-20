"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { CgSpinner } from "react-icons/cg";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
        description: "You have successfully logged in as Superadmin",
      });
      router.push("/");
    } catch (err: any) {
      console.log(err);
      console.log(err.response.data.error);
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
      setRemainingTime(60);
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
          <h1>Enter OTP</h1>

          {/* shadcn OTP input */}
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
