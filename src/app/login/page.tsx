"use client";
import React, { useState, useEffect } from "react";
import { CgSpinner } from "react-icons/cg";
import axios, { AxiosResponse } from "axios";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import Cookies from "js-cookie";
import { parseCookies } from "nookies";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/themeChangeButton";
import { useUserRole } from "@/context/UserRoleContext";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import FadeInAnimation from "@/components/fadeinAnimation";
interface LoginResponse {
  message?: string;
  token?: string;
  error?: string;
}

const PageLogin: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const router = useRouter();
  const { toast } = useToast();

  const { refreshUserRole } = useUserRole();

  useEffect(() => {
    const { token } = parseCookies();
    if (token) {
      router.push("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const response: AxiosResponse<LoginResponse> = await axios.post(
        "/api/employeelogin",
        {
          email,
          password,
        }
      );

      if (response?.data?.message === "Verification OTP sent") {
        router.push(`/login/verify-otp/${email}`);
        return;
      }

      if (response.status === 200 && response.data.token) {
        Cookies.set("token", response.data.token, { expires: 1 });
        router.push("/");

        // Call refreshUserRole after successful login and token setting
        refreshUserRole();
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        toast({
          title: "Oh no! Something went wrong.",
          description: err.response.data.error,
        });
      } else {
        toast({
          title: "Oh no! Something went wrong.",
          description:
            "Looks like some error occurred, please try again later.",
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <FadeInAnimation>
      <div className="h-screen overflow-hidden flex">
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

        <div className="md:w-1/2 w-full flex items-center justify-center ">
          <div className="w-full max-w-sm px-6 py-8 border  rounded-lg shadow-lg">
            <h1 className="text-3xl font-semibold text-center mb-6">
              Employee Login
            </h1>
            <form onSubmit={handleSubmit}>
              <Label>
                <span>Email address</span>
                <Input
                  type="email"
                  placeholder="dummyemail@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-2 w-full"
                />
              </Label>
              <Label className="mt-4">
                <span className="flex mt-2 justify-between">
                  Password
                  <Link
                    href="/authentication/forgotpassword"
                    className="font-semibold underline"
                  >
                    Forgot Password
                  </Link>
                </span>
                <div className="relative mt-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-xl text-neutral-800 dark:text-neutral-200">
                    {showPassword ? (
                      <AiFillEyeInvisible
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    ) : (
                      <AiFillEye
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    )}
                  </span>
                </div>
              </Label>
              <Button
                type="submit"
                className="w-full mt-6"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <div className="flex justify-center items-center gap-2">
                    Logging in.. <CgSpinner className="animate-spin text-xl" />
                  </div>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </FadeInAnimation>
  );
};

export default PageLogin;
