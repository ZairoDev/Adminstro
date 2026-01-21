"use client";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { FC, useEffect, useState } from "react";

export interface PageAddListing6Props {}

interface Page6State {
  reviews: string[];
}

const PageAddListing6: FC<PageAddListing6Props> = () => {
  const params = useSearchParams() ?? null;
  const userId = params?.get("userId") ?? null;


  let portions = 0;
  const data = localStorage.getItem("page1") || "";
  if (data) {
    const value = JSON.parse(data)["numberOfPortions"];
    if (value) {
      portions = parseInt(value, 10);
    }
  }

  const [myArray, setMyArray] = useState<number[]>(Array(portions).fill(1));

  const [portionNames, setPortionNames] = useState<string[]>(() => {
    const savedPage = localStorage.getItem("page3") || "";
    if (!savedPage) {
      return [];
    }
    const value = JSON.parse(savedPage)["portionName"];
    return value || [];
  });

  const [reviews, setReviews] = useState<string[]>(() => {
    const savedPage = localStorage.getItem("page6") || "";
    if (!savedPage) {
      return [];
    }
    const value = JSON.parse(savedPage)["reviews"];
    return value || [];
  });

  const [page6, setPage6] = useState<Page6State>({
    reviews: reviews,
  });

  useEffect(() => {
    const newReviews: Page6State = {
      reviews: reviews,
    };
    setPage6(newReviews);
    localStorage.setItem("page6", JSON.stringify(newReviews));
  }, [reviews]);

  // Function to check if any review field is empty
  const isAnyReviewEmpty = () => {
    if (reviews.length === 0) return true;
    return reviews.some((review) => !review || review.trim() === "");
  };

  return (
    <>
      <Heading
        heading="Description"
        subheading="Add a description that suits the property"
      />
      <div className="flex flex-col gap-8">
        {myArray.map((item, index) => (
          <div key={index}>
            <div className="mb-2">
              <h2 className="text-2xl font-semibold">{portionNames[index]}</h2>
            </div>

            <Textarea
              placeholder="Enter your reviews"
              rows={14}
              value={reviews[index] || ""}
              onChange={(e) =>
                setReviews((prev) => {
                  const newReviews = [...prev];
                  newReviews[index] = e.target.value;
                  return newReviews;
                })
              }
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-x-4 ml-2 mb-4">
        <Link
          href={{
            pathname: `/dashboard/add-listing/5`,
            query: { userId: userId },
          }}
        >
          <Button>Go back</Button>
        </Link>
        <Link
          href={{
            pathname: `/dashboard/add-listing/7`,
            query: { userId: userId },
          }}
        >
          <Button disabled={isAnyReviewEmpty()}>Continue</Button>
        </Link>
      </div>
    </>
  );
};

export default PageAddListing6;
