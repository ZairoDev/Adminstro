"use client";
import Link from "next/link";
import { WebsiteCard } from "@/components/websiteCard";
import { Navbar } from "@/components/navbar";

const cardData = [
  {
    title: "Vacation Saga",
    description: "This route belong to Vacation saga",
    link: "/dashboard/user",
  },
  {
    title: "Housing Saga",
    description: "This route belong to Housing saga",
    link: "/dashboard/user",
  },
  {
    title: "Tect Tune",
    description: "This route belong to Tect tune",
    link: "/dashboard/user",
  },
  {
    title: "Coworking space",
    description: "This route belong to Coworking space",
    link: "/dashboard/user",
  },
  {
    title: "Future website",
    description: "Will be update in furure",
    link: "/dashboard/user",
  },
];

export default function HomePage() {
  return (
    <>
      <div>
        <div>
          <Navbar />
        </div>
        <div>
          <div className=" max-w-7xl cursor-pointer m-auto p-2 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cardData.map((card, index) => (
                <WebsiteCard
                  key={index}
                  title={card.title}
                  description={card.description}
                  link={card.link}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
