"use client";
import React, { useEffect } from "react";
import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Route } from "@/routers/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CommonLayoutProps {
  children: React.ReactNode;
  params: {
    stepIndex: string;  
  };
}

const CommonLayout: FC<CommonLayoutProps> = ({ children, params }) => {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const index = Number(params.stepIndex) || 1;
  const progress = (index / 10) * 100;
  const nextHref = (
    index < 10
      ? `/dashboard/add-listing/${index + 1}`
      : `/dashboard/add-listing/${1}`
  ) as Route;
  const backHref = (
    index > 1
      ? `/dashboard/add-listing/${index - 1}`
      : `/dashboard/add-listing/${1}`
  ) as Route;
  const nextBtnText = index >= 10 ? "Publish listing" : "Continue";

  useEffect(() => {
    if (index === 9 && nextBtnText === "Publish listing") {
      const data = localStorage.getItem("yourStorageKey");
      if (data) {
        const jsonData = JSON.parse(data);
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "yourData.json";
        document.body.appendChild(a);
        a.click();

        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    }
  }, [index, nextBtnText]);


  return (
    <>
      <div className={`max-w-4xl m-auto sm:p-4 p-2`}>
        <div className="space-y-8">
          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <span className="text-3xl font-semibold">{index}</span>{" "}
                <span className="text-lg text-muted-foreground">/ 10</span>
              </div>
              <div className="flex-1">
                <Progress value={progress} className="h-2" />
              </div>
              <div className="text-sm text-muted-foreground flex-1 text-right">
                {Math.round(progress)}% Complete
              </div>
            </div>
          </div>

          <div className="">{children}</div>
        </div>
      </div>
    </>
  );
};

export default CommonLayout;
