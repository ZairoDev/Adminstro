"use client";
import { ModeToggle } from "@/components/themeChangeButton";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const NoRolePage = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    try {
      await axios.get("/api/employeelogout", { withCredentials: true });
      setLoading(false);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setLoading(false);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen ">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="text-center p-8  rounded-lg shadow-lg border max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-base  mb-4">
          It appears you don't have the necessary permissions to access the
          dashboard. Please contact your Superadmin to request the appropriate
          access
        </p>

        <Button
          onClick={handleLogout}
          className={` ${loading ? "" : ""}`}
          disabled={loading}
        >
          {loading ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </div>
  );
};

export default NoRolePage;
