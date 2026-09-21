"use client";

import Link from "next/link";

import { useAuthStore } from "@/AuthStore";
import { Navbar } from "@/components/navbar";
import { defaultRoutes } from "@/middleware";
import FadeInBlur from "@/components/FadeInBlur";
import DashboardCard from "@/components/DashBoardCard";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";
import { CloudShader } from "@/components/ui/cloud-shader";
import ScrollToTopButton from "@/components/dragButton/ScrollToTop";
import { useRouter } from "next/navigation";
// import CrashErrorPage from "./dashboard/cr%%5E$ghzdkkxjuhgy789/page";

export default function HomePage() {
  const people = [
    {
      id: 1,
      name: "Zaid Bin Hashmat",
      designation: "CEO",
      image: "https://github.com/shadcn.png",
    },
    {
      id: 2,
      name: "Ankita Nigam",
      designation: "COO",
      image: "https://github.com/shadcn.png",
    },
    // {
    //   id: 3,
    //   name: "Ayushi Gupta",
    //   designation: "Sales Head",
    //   image: "https://github.com/shadcn.png",
    // },
    // {
    //   id: 4,
    //   name: "Vikas Gurele",
    //   designation: "H.O.S",
    //   image: "https://github.com/shadcn.png",
    // },
  ];

  const { token } = useAuthStore();
  const router = useRouter();

  const handleDashboard = () => {
    if (!token || !token.id) {
      router.push("/login");
      return;
    }

    router.push(defaultRoutes[token.role || "Default"]);
  };


  return (
    <div className="relative min-h-dvh text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <CloudShader className="h-full min-h-full w-full" />
      </div>
      <div className="relative z-10">
      <Navbar />
      <FadeInBlur>
        <h1 className="max-w-3xl m-auto mt-20 text-center p-2 font-semibold text-5xl sm:text-6xl lg:text-7xl">
          Welcome to the Zairo International
        </h1>
      </FadeInBlur>
      {/* <FadeInBlur> */}
        {/* <p className="max-w-3xl m-auto p-2 text-center text-lg leading-relaxed md:text-xl">
          Oh, you think you belong here? If you&apos;re one of us here at Zairo,
          congrats! Otherwise, feel free to close this window...or try to get in
          if you dare. If you&apos;re actually an employee, tap the button
          below, enter your credentials, and we&apos;ll route you to your
          designated workspace.
        </p> */}
      {/* </FadeInBlur> */}
      <FadeInBlur>
        <div className="my-6">
          <p className="text-center mb-1 text-lg">Managed by</p>
          <div className="flex flex-row items-center justify-center  w-full">
            <AnimatedTooltip items={people} />
          </div>
        </div>
      </FadeInBlur>

      <div className="relative z-20 flex items-center mt-2 justify-center">
        {/* <>
          {token ? (
            token.role === "Sales" ? (
              <Link href="/dashboard/rolebaseLead">
                <RainbowButton className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Dashboard
                </RainbowButton>
              </Link>
            ) : token.role === "Content" ? (
              <Link href="/dashboard/remainingproperties">
                <RainbowButton className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Dashboard
                </RainbowButton>
              </Link>
            ) : token.role === "HR" ? (
              <Link href="/dashboard/employee">
                <RainbowButton className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Dashboard
                </RainbowButton>
              </Link>
            ) : token.role === "Agent" ? (
              <Link href={"/dashboard/sales-offer"}>
                <RainbowButton className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Dashboard
                </RainbowButton>
              </Link>
            ) : token.role === "Subscription-Sales" ? (
              <Link href="/dashboard/sales-offer">
                <RainbowButton className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Dashboard
                </RainbowButton>
              </Link>
            ) : (
              <Link href="/dashboard/user">
                <RainbowButton className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Dashboard
                </RainbowButton>
              </Link>
            )
          ) : (
            <Link href="/login">
              <RainbowButton>Login</RainbowButton>
            </Link>
          )}
        </> */}

        <>
          {token ? (
            <RainbowButton
              onClick={handleDashboard}
              disabled={!token?.id}
              className="h-12 bg-white px-10 text-lg text-black shadow-md [background-image:none] [text-shadow:none] hover:bg-white/90 before:hidden"
            >
              Dashboard
            </RainbowButton>
          ) : (
            <Link href="/login">
              <RainbowButton className="h-12 bg-white px-10 text-lg text-black shadow-md [background-image:none] [text-shadow:none] hover:bg-white/90 before:hidden">
                Login
              </RainbowButton>
            </Link>
          )}
        </>
      </div>

      <div className="max-w-5xl m-auto mt-4 p-2">
        {/* <div className=" relative flex  w-full flex-col items-center justify-center overflow-hidden rounded-lg  border-[10px]  md:shadow-xl">
          <FadeInBlur>
            <img
              src="https://vacationsaga.b-cdn.net/assets/dashboard.PNG"
              alt="image"
              className="w-full   h-full object-cover "
            />
          </FadeInBlur>
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background to-transparent"></div>
        </div> */}
      </div>
      <div className="max-w-7xl m-auto p-2">
        <DashboardCard />
      </div>
      <ScrollToTopButton />
      </div>
    </div>
  );
}

