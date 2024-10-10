"use client";
import React from "react";

import { AnimatePresence, motion } from "framer-motion";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface WebsiteCardProps {
  title: string;
  description: string;
  link: string;
}

export function WebsiteCard({ title, description, link }: WebsiteCardProps) {
  return (
    <>
      <div className="py-5 flex flex-col lg:flex-row items-center justify-center  w-full gap-4 mx-auto px-8">
        <Card
          title={title}
          description={description}
          link={link}
          icon={<LinkIcon />}
        >
          <CanvasRevealEffect
            animationSpeed={5.1}
            containerClassName="bg-emerald-900"
          />
        </Card>
      </div>
    </>
  );
}

const Card = ({
  title,
  icon,
  children,
  description,
  link,
}: {
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  description?: string;
  link?: string;
}) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="border  group/canvas-card flex items-center justify-center dark:border-white/[0.2]  max-w-sm w-full mx-auto p-4 relative h-[30rem] "
    >
      <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full absolute inset-0"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-20">
        <div className="text-center group-hover/canvas-card:-translate-y-4 group-hover/canvas-card:opacity-0 transition duration-200 w-full  mx-auto flex items-center justify-center">
          {icon}
        </div>
        <h2 className=" text-xl inline-block  opacity-0 group-hover/canvas-card:opacity-100 relative z-10  mt-4  group-hover/canvas-card:text-white group-hover/canvas-card:-translate-y-2 transition duration-200">
          {title}
        </h2>
        <p className="text-sm opacity-0 group-hover/canvas-card:opacity-100 relative z-10  mt-2  font-thin group-hover/canvas-card:text-white group-hover/canvas-card:-translate-y-2 transition duration-200">
          {description}
        </p>
        <Link
          className=" opacity-0 flex text-xl font-semibold  items-center  group-hover/canvas-card:opacity-100 relative z-10  mt-2  group-hover/canvas-card:text-white group-hover/canvas-card:-translate-y-2 transition duration-200"
          href={link || ""}
        >
          Visit <ArrowUpRight size={18} />
        </Link>
      </div>
    </div>
  );
};

const LinkIcon = () => {
  return (
    <div className="flex flex-col items-center">
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          className="lucide lucide-link-2"
        >
          <path d="M9 17H7A5 5 0 0 1 7 7h2" />
          <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
          <line x1="8" x2="16" y1="12" y2="12" />
        </svg>
      </div>
      <div>Hover to know more</div>
    </div>
  );
};

export const Icon = ({ className, ...rest }: any) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={className}
      {...rest}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
};
