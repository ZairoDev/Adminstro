"use client";
import { MinusIcon, PlusIcon } from "lucide-react";
import React, { FC, useEffect, useState } from "react";
import { Button } from "./ui/button";

export interface NcInputNumberProps {
  className?: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  label?: string;
  desc?: string;
}

const NcInputNumber: FC<NcInputNumberProps> = ({
  className = "w-full",
  defaultValue = 0,
  min = 0,
  max,
  onChange,
  label,
  desc,
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleClickDecrement = () => {
    if (min >= value) return;
    setValue((state) => {
      return state - 1;
    });
    onChange && onChange(value - 1);
  };
  const handleClickIncrement = () => {
    if (max && max <= value) return;
    setValue((state) => {
      return state + 1;
    });
    onChange && onChange(value + 1);
  };

  const renderLabel = () => {
    return (
      <div className="flex flex-col">
        <span className="font-medium ">{label}</span>
        {desc && <span className="text-xs ">{desc}</span>}
      </div>
    );
  };

  return (
    <div
      className={`nc-NcInputNumber flex items-center justify-between space-x-5 ${className}`}
      data-nc-id="NcInputNumber"
    >
      {label && renderLabel()}

      <div
        className={`nc-NcInputNumber flex items-center justify-between w-28`}
      >
        <Button
          className=" px-2 "
          type="button"
          onClick={handleClickDecrement}
          disabled={min >= value}
        >
          <MinusIcon size={18} />
        </Button>
        <span>{value}</span>
        <Button
          className="px-2"
          onClick={handleClickIncrement}
          disabled={max ? max <= value : false}
        >
          <PlusIcon className="w-4 h-4 " />
        </Button>
      </div>
    </div>
  );
};

export default NcInputNumber;
