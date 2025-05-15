import { User } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

interface PageProps {
  leadsByAgent: {
    _id: string;
    count: number;
  }[]
}

export function LeadsByAgent({ leadsByAgent }: PageProps) {

  const totalLeads = leadsByAgent.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-muted-foreground">Total Leads</h3>
        <span className="text-3xl font-bold">{totalLeads}</span>
      </div>

      <div className="h-px bg-border my-4" />

      <ScrollArea className=" w-full h-80">
        <div className="space-y-3 md:px-3">
          {leadsByAgent.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <Link href={`/dashboard/lead-agent-group/${item._id?.split("@")[0]}`}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{item._id ?? "Null"}</span>
                </div>
              </Link>
              <span className="font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
