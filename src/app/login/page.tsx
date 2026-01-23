"use client";

import Cookies from "js-cookie";
import { parseCookies } from "nookies";
import { CgSpinner } from "react-icons/cg";
import { useRouter } from "next/navigation";
import axios, { AxiosResponse } from "axios";
import React, { useState, useEffect } from "react";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";

import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";
import { TokenInterface } from "@/util/type";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/themeChangeButton";
import FadeInAnimation from "@/components/fadeinAnimation";
import { AnimatedLoginCharacters } from "@/components/AnimatedLoginCharacters";

interface LoginResponse {
  otpRequired?: boolean;
  message?: string;
  token?: string;
  tokenData: TokenInterface;
  error?: string;
}

type EmotionType = 'neutral' | 'happy' | 'sad' | 'wrong';

const PageLogin: React.FC = () => {
  const { token, setToken } = useAuthStore();
  const { toast } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emotion, setEmotion] = useState<EmotionType>("neutral");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  
  useEffect(() => {
    const { token } = parseCookies();
    if (token) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    router.refresh();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setEmotion("neutral");

    try {
      const response: AxiosResponse<LoginResponse> = await axios.post(
        "/api/employeelogin",
        { email, password }
      );

      // OTP required
      if (response.data.otpRequired === true) {
        router.push(`/login/verify-otp/${email}`);
        return;
      }

      // Direct login
      if (response.data.otpRequired === false && response.data.token) {
        setToken(response.data.tokenData);
        Cookies.set("token", response.data.token, { expires: 1 });
        setEmotion("happy"); // Show happy mascots on success

        toast({
          description: "You have successfully logged in",
        });

        // Keep happy emotion visible before redirect
        setTimeout(() => {
          router.push("/");
        }, 800);
        return;
      }

      // Normal login
      if (response.status === 200 && response.data.token) {
        setToken(response.data.tokenData);
        Cookies.set("token", response.data.token, { expires: 1 });
        setEmotion("happy"); // Show happy mascots on success
        
        // Keep happy emotion visible before redirect
        setTimeout(() => {
          router.push("/");
        }, 800);
        return;
      }
    } catch (err) {
      setEmotion("sad"); // Show sad mascots on error
      
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

      // Reset emotion after animation
      setTimeout(() => {
        setEmotion("neutral");
      }, 2000);
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  return (
    <FadeInAnimation>
      <div className="h-dvh flex">
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>
        <div className="w-1/2 md:flex hidden items-center justify-center bg-gradient-to-br from-primary/90 via-primary to-primary/80">
          <AnimatedLoginCharacters 
            isTyping={isTyping}
            password={password}
            showPassword={showPassword}
            emotion={emotion}
            isLoggingIn={isLoggingIn}
          />
        </div>
        <div className="md:w-1/2 w-full flex items-center justify-center ">
          <div className="w-full max-w-sm px-6 py-8 border rounded-lg shadow-lg">
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
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  required
                  className="mt-2 w-full"
                />
              </Label>
              <Label className="mt-4">
                <span>Password</span>
                <div className="relative mt-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
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