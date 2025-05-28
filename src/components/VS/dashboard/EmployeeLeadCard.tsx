import { Mail, MapPin } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomBarChart } from "@/components/charts/BarChart"
import { CustomLabelledBarChart } from "@/components/charts/LabelledBarChart"
// import { Chart, ChartContainer, ChartBar, ChartGroup } from "@/components/ui/chart"

interface LeadQualityCounts {
  Average: number
  "Below Average": number
  Good: number
  "Very Good": number
}

interface EmployeeLeadData {
  athensCount: number
  chaniaCount: number
  employee: string
  leadQualityCounts: LeadQualityCounts
  totalLeads: number
  _id: string
}

export function EmployeeLeadCard({ data }: { data: EmployeeLeadData }) {
  // Transform lead quality data for the chart
  const qualityData = Object.entries(data.leadQualityCounts).map(([quality, count]) => ({
    label: quality,
    count: count,
  }))
  // console.log("qualityData: ", qualityData);

  // Calculate percentages for Athens and Chania
  const athensPercentage = Math.round((data.athensCount / data.totalLeads) * 100) || 0
  const chaniaPercentage = Math.round((data.chaniaCount / data.totalLeads) * 100) || 0

  // Calculate other leads (if any)
  const otherLeads = data.totalLeads - (data.athensCount + data.chaniaCount)
  const otherPercentage = Math.round((otherLeads / data.totalLeads) * 100) || 0

  const totalReviewedLeads = qualityData.reduce((acc, item) => acc + item.count, 0)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm sm:text-base font-medium truncate" title={data.employee}>
              {data.employee}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="w-fit">
            {data.totalLeads.toLocaleString()} Total Leads
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Location breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Location Breakdown</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">Athens</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{data.athensCount.toLocaleString()}</span>
                  <Badge variant="outline" className="text-xs">
                    {athensPercentage}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">Chania</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{data.chaniaCount.toLocaleString()}</span>
                  <Badge variant="outline" className="text-xs">
                    {chaniaPercentage}%
                  </Badge>
                </div>
              </div>

              {otherLeads > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">Other</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{otherLeads.toLocaleString()}</span>
                    <Badge variant="outline" className="text-xs">
                      {otherPercentage}%
                    </Badge>
                  </div>
                </div>
              )}

              <div className=" text-xs">
                <h3>Reviewed: {totalReviewedLeads.toLocaleString()}</h3>
                <h3>UnReviewed: {(data.totalLeads - totalReviewedLeads).toLocaleString()}</h3>
              </div>

            </div>
          </div>

          {/* Lead quality visualization */}
          <div className="space-y-4">
            {/* <h3 className="text-sm font-medium text-muted-foreground">Lead Quality</h3> */}
            <div className="flex flex-wrap gap-2 mt-2">
              {qualityData.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getQualityColor(item.label) }} />
                  <span className="text-xs">
                    {item.label}: {item.count}
                  </span>
                </div>
              ))}
            </div>
            <div>
              {qualityData.length > 0 && <CustomLabelledBarChart heading="Lead Quality" subHeading="Quality Breakdown" chartData={qualityData} />}
            </div>

          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to get color based on quality
function getQualityColor(quality: string): string {
  switch (quality) {
    case "Very Good":
      return "#10b981" // green-500
    case "Good":
      return "#60a5fa" // blue-400
    case "Average":
      return "#f59e0b" // amber-500
    case "Below Average":
      return "#ef4444" // red-500
    default:
      return "#94a3b8" // slate-400
  }
}
