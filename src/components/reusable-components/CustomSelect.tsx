import * as React from "react";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SelectProps {
  triggerClassName?: string;
  contentClassName?: string;
  itemsClassName?: string;
  defaultValue?: string;
  triggerText: string;
  labelHeader?: string;
  itemList: string[];
  value?: string;
  onValueChange: (value: string) => void;
}

export function CustomSelect({
  itemList,
  defaultValue,
  triggerClassName,
  contentClassName,
  itemsClassName,
  triggerText,
  labelHeader,
  value,
  onValueChange,
}: SelectProps) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
    >
      <SelectTrigger className={cn(triggerClassName)}>
        <SelectValue placeholder={triggerText} />
      </SelectTrigger>
      <SelectContent className={cn(contentClassName)}>
        <SelectGroup>
          {labelHeader && (
            <SelectLabel className="pl-2">{labelHeader}</SelectLabel>
          )}
          {itemList?.map((item, index) => (
            <SelectItem key={index} value={item} className={cn(itemsClassName)}>
              {item}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
