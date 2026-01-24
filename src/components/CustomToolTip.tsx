import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReactNode } from "react";

interface CustomToolTipProps{
  icon?: ReactNode;
  content?: number|undefined;
  text?: string | ReactNode;
  desc?: string;
  className?: string;
  
}

const CustomTooltip = ({ className, icon, content, desc, text  }: CustomToolTipProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className={`flex gap-x-2 items-center `}>{icon} {content || text}</TooltipTrigger>
        <TooltipContent className={`${className}`}>
          <p className="">{desc}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CustomTooltip;
