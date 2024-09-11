import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReactNode } from "react";

interface CustomToolTipProps{
  icon: ReactNode;
  content?: number|undefined;
  desc?: string;
}

// const CustomTooltip = ({ icon, content, desc }: CustomToolTipProps) => {
//   return (
//     <TooltipProvider>
//       <Tooltip>
//         <TooltipTrigger>{icon}</TooltipTrigger>
//         <TooltipTrigger>{content}</TooltipTrigger>
//         <TooltipContent>
//           <p>{desc}</p>
//         </TooltipContent>
//       </Tooltip>
//     </TooltipProvider>
//   );
// };

// export default CustomTooltip;

const CustomTooltip = ({ icon, content, desc }: CustomToolTipProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{icon}</TooltipTrigger>
        <TooltipContent>
          <p>{desc}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CustomTooltip;
