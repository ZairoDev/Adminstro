import { MapPin } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

interface PageProps {
  leadsByLocation: {
    _id: string;
    count: number;
  }[]
}

export function LeadsByLocation({ leadsByLocation }: PageProps) {

  const totalLeads = leadsByLocation.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-muted-foreground">Total Leads</h3>
        <span className="text-3xl font-bold">{totalLeads}</span>
      </div>

      <div className="h-px bg-border my-4" />

      <ScrollArea className=" w-full h-80">
        <div className="space-y-3 px-3">
          {leadsByLocation.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <Link href={`/dashboard/lead-location-group/${item._id}`}>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{item._id.charAt(0).toUpperCase() + item._id.slice(1)}</span>
                </div></Link>
              <span className="font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
