"use client";
import React from "react";
import { BackgroundGradient } from "./ui/background-gradient";
// import { IconAppWindow } from "@tabler/icons-react";
import Image from "next/image";

interface PageProps {
  imageUrl: string;
}

export function BackgroundGradientBox({ imageUrl }: PageProps) {
  return (
    <div>
      <BackgroundGradient className="rounded-[22px] max-w-sm p-4 sm:p-10 bg-white dark:bg-zinc-900">
        <img
          src={imageUrl}
          alt="dummy"
          height="400"
          width="400"
          className="object-contain"
        />
      </BackgroundGradient>
    </div>
  );
}
