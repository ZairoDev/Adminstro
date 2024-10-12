"use client";
import { WebsiteCard } from "@/components/websiteCard";
import { Navbar } from "@/components/navbar";
import ScrollToTopButton from "@/components/dragButton/ScrollToTop";

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
    description: "This route belong to Future space",
    link: "/dashboard/user",
  },
];

export default function HomePage() {
  return (
    <>
      <div className="max-w-7xl m-auto p-2  ">
        <div>
          <Navbar />
          <div className=" ">
            <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4">
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
        <ScrollToTopButton />
      </div>
    </>
  );
}
