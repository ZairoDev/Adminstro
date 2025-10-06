"use client";
import React, { useEffect } from "react";
import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Route } from "@/routers/types";

export interface CommonLayoutProps {
  children: React.ReactNode;
  params: {
    stepIndex: string;
  };
}

const CommonLayout: FC<CommonLayoutProps> = ({ children, params }) => {
  const index = Number(params.stepIndex) || 1;
  const nextHref = (
    index < 10
      ? `/dashboard/add-listing/${index + 1}`
      : `/dashboard/add-listing/${1}`
  ) as Route;
  const backtHref = (
    index > 1
      ? `/dashboard/add-listing/${index - 1}`
      : `/dashboard/add-listing/${1}`
  ) as Route;
  const nextBtnText = index > 9 ? "Publish listing" : "Continue";

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
        <div className="space-y-11">
          <div className="text-center">
            <span className="text-4xl font-semibold">{index}</span>{" "}
            <span className="text-lg ">/ 10</span>
          </div>

          <div className="">{children}</div>
        </div>
      </div>
    </>
  );
};

export default CommonLayout;
