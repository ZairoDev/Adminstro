"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import axios from "axios";
import { AlertCircle, Loader, Mail } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/themeChangeButton";

export default function NoRolePage() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogout = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/employeelogout", {
        withCredentials: true,
      });
      setLoading(false);
      router.push("/login");
    } catch (error) {
      setLoading(false);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <>
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/10 to-primary/65">
        <Card className="w-full max-w-md mx-4 overflow-hidden shadow-xl">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-red-600/20  p-3 ">
                <AlertCircle className="w-8 h-8 text-red-600 " />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold ">
                Session Expired!
              </h1>
              <p className="text-muted-foreground max-w-sm">
                Your session has expired due to inactivity. Please log in again.
                If you do not have an assigned role, kindly contact your
                organization for assistance
              </p>
              <div className="w-full max-w-[240px] h-[180px] relative my-8">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-24 h-24 text-primary "
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                disabled={loading}
                className="w-full max-w-sm group flex items-center justify-center"
                size="lg"
              >
                {loading ? (
                  <>
                    Redirecting...
                    <Loader className="animate-spin" size={18} />
                  </>
                ) : (
                  "Login again"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
