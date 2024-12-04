import { Label } from "@/components/ui/label";
import React from "react";
import { FC } from "react";
 
export interface FormItemProps {
  className?: string;
  label?: string;
  desc?: string;
  children?: React.ReactNode;
}

const FormItem: FC<FormItemProps> = ({ children, label, desc }) => {
  return (
    <div className="ml-2">
      {Label && <Label>{label}</Label>}
      <div className="mt-1">{children}</div>
      {desc && <span className=" text-xs ml-1">{desc}</span>}
    </div>
  );
};

export default FormItem;
