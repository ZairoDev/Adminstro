"use client";
import { Navbar } from "@/components/navbar";
import ScrollToTopButton from "@/components/dragButton/ScrollToTop";
import FadeInBlur from "@/components/FadeInBlur";
import { RainbowButton } from "@/components/ui/rainbow-button";
import Link from "next/link";
import { useUserRole } from "@/context/UserRoleContext";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";
import DashboardCard from "@/components/DashBoardCard";

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
		{
			id: 3,
			name: "Ayushi Gupta",
			designation: "Sales Head",
			image: "https://github.com/shadcn.png",
		},
		{
			id: 4,
			name: "Vikas Gurele",
			designation: "H.O.S",
			image: "https://github.com/shadcn.png",
		},
	];

	const { userRole } = useUserRole();

	return (
		<>
			<Navbar />
			<FadeInBlur>
				<h1 className="max-w-2xl m-auto mt-20 text-center p-2 lg:text-6xl  sm:text-5xl text-4xl  ">
					Welcome to the Zairo Office Portal!
				</h1>
			</FadeInBlur>
			<FadeInBlur>
				<p className="max-w-3xl m-auto p-2 md:text-base text-center text-sm">
					Oh, you think you belong here? If you&apos;re one of us here
					at Zairo, congrats! Otherwise, feel free to close this
					window...or try to get in if you dare. If you&apos;re
					actually an employee, tap the button below, enter your
					credentials, and we&apos;ll route you to your designated
					workspace.
				</p>
			</FadeInBlur>
			<FadeInBlur>
				<div className="my-6">
					<p className="text-center mb-1">Managed by</p>
					<div className="flex flex-row items-center justify-center  w-full">
						<AnimatedTooltip items={people} />
					</div>
				</div>
			</FadeInBlur>

			<div className="flex items-center mt-2 justify-center">
				<>
					{userRole ? (
						userRole === "Sales" ? (
							<Link href="/dashboard/rolebaseLead">
								<RainbowButton className="bg-primary text-primary-foreground hover:bg-primary/90">
									Dashboard
								</RainbowButton>
							</Link>
						) : userRole === "Content" ? (
							<Link href="/dashboard/remainingproperties">
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
				</>
			</div>
			<div className="max-w-5xl m-auto mt-4 p-2">
				<div className=" relative flex  w-full flex-col items-center justify-center overflow-hidden rounded-lg  border-[10px]  md:shadow-xl">
					<FadeInBlur>
						<img
							src="https://vacationsaga.b-cdn.net/assets/dashboard.PNG"
							alt="image"
							className="w-full   h-full object-cover "
						/>
					</FadeInBlur>
					<div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background to-transparent"></div>
				</div>
			</div>
			<div className="max-w-7xl m-auto p-2">
				<DashboardCard />
			</div>
			<ScrollToTopButton />
		</>
	);
}
