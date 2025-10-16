// components/SmallCard.tsx
import React from "react";
import { LucideIcon } from "lucide-react";

interface CardLineProps {
  icon?: React.ElementType; // icon component from lucide-react
  text: string;
}

const CardLine: React.FC<CardLineProps> = ({ icon: Icon, text }) => {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-gray-500" />}
      <span className="text-gray-800 dark:text-gray-200 text-sm">{text}</span>
    </div>
  );
};

interface SmallCardProps {
  title: string;
  lines: CardLineProps[]; // lines inside the card
  className?: string; // for additional customization
}

const SmallCard: React.FC<SmallCardProps> = ({ title, lines, className }) => {
  return (
    <div
      className={`bg-white dark:bg-stone-800 rounded-lg shadow p-4 space-y-2 ${className}`}
    >
      <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <div className="space-y-1">
        {lines.map((line, index) => (
          <CardLine key={index} {...line} />
        ))}
      </div>
    </div>
  );
};

export default SmallCard;
