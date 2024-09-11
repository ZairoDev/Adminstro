"use client";
import Link from "next/link";
import { WebsiteCard } from "@/components/websiteCard";
import { Navbar } from "@/components/navbar";

const cardData = [
  {
    title: "Vacation Saga",
    steps: [
      "You can edit things",
      "You need to had id password",
      "You need to permit by admin",
      "Only superadmin can give you access",
    ],
    description: "This route belong to Vacation saga",
    link: "/dashboard/user",
  },
  {
    title: "Housing Saga",
    steps: [
      "You can edit things",
      "You need to had id password",
      "You need to permit by admin",
      "Only superadmin can give you access",
    ],
    description: "This route belong to Housing saga",
    link: "/dashboard/user",
  },
  {
    title: "Tect Tune",
    steps: [
      "You can edit things",
      "You need to had id password",
      "You need to permit by admin",
      "Only superadmin can give you access",
    ],
    description: "This route belong to Tect tune",

    link: "/dashboard/user",
  },
  {
    title: "Coworking space",
    steps: [
      "You can edit things",
      "You need to had id password",
      "You need to permit by admin",
      "Only superadmin can give you access",
    ],
    description: "This route belong to Coworking space",

    link: "/dashboard/user",
  },
  {
    title: "Future website",
    steps: [
      "You can edit things",
      "You need to had id password",
      "You need to permit by admin",
      "Only superadmin can give you access",
    ],
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
                  steps={card.steps}
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
