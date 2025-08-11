"use client";

import { Pie, PieChart } from "recharts";
import { useRouter } from "next/navigation";

import {
  Card,
  CardTitle,
  CardFooter,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartTooltip,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Average } from "next/font/google";

const charconfig = {
  Good: {
    label: "Good",
    color: "hsl(var(--chart-1))",
  },
  "Below Average": {
    label: "Below Average",
    color: "hsl(var(--chart-2))",
  },
  "Very Good": {
    label: "Very Good",
    color: "hsl(var(--chart-3))",
  },
  Average: {
    label: "Average",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

type QualityKey = "Good" | "Very Good" | "Average" | "Below Average";
 
export const ReviewPieChart = ({chartData}:{chartData:any})=>{
   const data = chartData.map((item: any) => {
     const label: QualityKey = item._id ?? "Unknown" ;
     return {
       label,
       count: item.count,
       fill: charconfig[label]?.color ?? "gray", // fallback if unknown
     };
   });
   return (
     <Card className="flex flex-col">
       <CardHeader className="items-center pb-4">
         <CardTitle>Reviews Dashboard</CardTitle>
         {/* <CardDescription>{subHeading}</CardDescription> */}
       </CardHeader>
       <CardContent className="flex-1 p-2 ">
         <ChartContainer
           config={charconfig}
           className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[270px] p-0 w-[300px]"
         >
           <PieChart>
             <ChartTooltip content={<ChartTooltipContent hideLabel />} />
             <Pie
               data={data}
               dataKey="count"
               label
               nameKey="label"
               // onClick={handlePieClick}
             />
           </PieChart>
         </ChartContainer>
       </CardContent>
       <CardFooter className="flex-col gap-1 text-sm my-2">
         <div className="flex flex-wrap gap-3">
           {data.map(( { label,count,fill }: any) => (
             <div key={label} className="flex items-center gap-1">
               <span
                 className="w-2 h-2 rounded-full"
                 style={{ backgroundColor: fill }}
               />
               <span className="text-xs font-medium">{label + "(" + count+")"}</span>
             </div>
           ))}
         </div>
         <div className="absolute top-8 right-4">
           Total :{" "}
           {chartData?.reduce((acc: number, item: any) => acc + item.count, 0)}
         </div>
         <div className="absolute top-4 right-4">
          Usable Leads:{" "}
          {chartData
            ?.filter((item: any) => item._id === "Good" || item._id === "Very Good" || item._id === "Average")
            .reduce((acc: number, item: any) => acc + item.count, 0)}
         </div>
       </CardFooter>
     </Card>
   );
}