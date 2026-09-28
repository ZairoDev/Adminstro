"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { CgSpinner } from "react-icons/cg";
import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";
import { TokenInterface } from "@/util/type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/themeChangeButton";

interface LoginResponse {
  message?: string;
  token?: string;
  tokenData: TokenInterface;
  error?: string;
}

export default function HousingCollaboratorLoginPage() {
  const { setToken, token } = useAuthStore();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (token?.role === "HCollaborator") {
      router.replace("/dashboard/createquery");
    }
  }, [token, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const response = await axios.post<LoginResponse>(
        "/api/housingsaga/login",
        { email, password },
        { withCredentials: true },
      );

      if (response.data?.tokenData) {
        setToken(response.data.tokenData);
        toast({ description: "You have successfully logged in" });
        router.push("/dashboard/createquery");
        return;
      }

      toast({
        variant: "destructive",
        title: "Login failed",
        description: response.data?.error || "Please try again",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        variant: "destructive",
        title: "Login failed",
        description: err?.response?.data?.error || "Invalid email or password",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-md border rounded-lg p-6 space-y-6 bg-card shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Housing Saga Login</h1>
          <p className="text-sm text-muted-foreground">
            Sign in as a Housing Saga collaborator
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hs-login-email">Email</Label>
            <Input
              id="hs-login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hs-login-password">Password</Label>
            <div className="relative">
              <Input
                id="hs-login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoggingIn}>
            {isLoggingIn ? (
              <>
                <CgSpinner className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
