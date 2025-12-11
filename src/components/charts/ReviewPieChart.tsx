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
  "Not Reviewed": {
    label: "Not Reviewed",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

type QualityKey = "Good" | "Very Good" | "Average" | "Below Average" | "Not Reviewed";

interface Data{
  label:String;
  count: number;
  fill: string;
}
 
export const ReviewPieChart = ({chartData}:{chartData:any})=>{
   // Handle null/undefined/empty data
   if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
     return (
       <Card className="flex flex-col">
         <CardHeader className="items-center pb-4">
           <CardTitle>Reviews Dashboard</CardTitle>
         </CardHeader>
         <CardContent className="flex-1 p-2 flex items-center justify-center min-h-[270px]">
           <p className="text-muted-foreground">No review data available</p>
         </CardContent>
       </Card>
     );
   }

   const data = chartData.map((item: any) => {
     // Label null/undefined as "Not Reviewed"
     const label: QualityKey = item._id ?? "Not Reviewed";
     return {
       label,
       count: item.count ?? 0,
       fill: charconfig[label]?.color ?? "gray",
     };
   });
   const total = data.reduce((acc: number, item:Data) => acc + item.count, 0);
   // Usable = reviewed leads that are not "Below Average" (excluding "Not Reviewed")
   const usable = data.filter((item:Data) => item.label !== "Below Average" && item.label !== "Not Reviewed").reduce((acc: number, item:Data) => acc + item.count, 0);
   const reviewed = data.filter((item:Data) => item.label !== "Not Reviewed").reduce((acc: number, item:Data) => acc + item.count, 0);
   // Calculate usable percentage from reviewed leads only
   const usablePercentage = reviewed > 0 ? Math.round((usable / reviewed) * 100) : 0;

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
         <div className="absolute top-12 right-4 text-xs">
           Total: {total}
         </div>
         <div className="absolute top-8 right-4 text-xs">
           Reviewed: {reviewed}
         </div>
         <div className="absolute top-4 right-4 text-xs">
          Usable: {usable} ({usablePercentage}%)
         </div>
       </CardFooter>
     </Card>
   ); 
}                                                                                                                                       