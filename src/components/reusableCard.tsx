"use client";

import type React from "react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";

interface StatItem {
  icon?: LucideIcon;
  value: string | number;
  label?: string;
  color?: string;
}

interface LocationCardProps {
  title: string;
  address?: string;
  image?: string;
  imageAlt?: string;
  stats: StatItem[];
  className?: string;
  onClick?: () => void;
}

const LocationCard: React.FC<LocationCardProps> = ({
  title,
  address,
  image,
  imageAlt = "Location",
  stats,
  className,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-stone-800 rounded-2xl shadow overflow-hidden transition-transform hover:shadow-lg ${
        onClick ? "cursor-pointer hover:scale-105" : ""
      } ${className}`}
    >
      {image && (
        <div className="relative w-full h-40 bg-gray-200 dark:bg-stone-700">
          <Image
            src={image || "/placeholder.svg"}
            alt={imageAlt}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        <div>
          <h3 className="text-gray-900 dark:text-gray-100 text-base font-semibold">
            {title}
          </h3>
          {address && (
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
              {address}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className="flex items-center gap-1">
                  {Icon && (
                    <Icon
                      className={`w-4 h-4 ${stat.color ?? "text-gray-500"}`}
                    />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      stat.color ?? "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {stat.value}
                  </span>
                </div>
                {stat.label && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {stat.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LocationCard;
