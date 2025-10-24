import { type NextRequest, NextResponse } from "next/server"
import Visits from "@/models/visit"
import Query from "@/models/query" // Add this import

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      ownerName = "",
      ownerPhone = "",
      customerName = "",
      customerPhone = "",
      vsid = "",
      commissionFrom = "",
      commissionTo = "",
    } = body

    const filterQuery: any = {}

    if (ownerName) {
      filterQuery.ownerName = { $regex: ownerName, $options: "i" }
    }

    if (ownerPhone) {
      filterQuery.ownerPhone = { $regex: ownerPhone, $options: "i" }
    }

    // Handle customer name and phone filtering
    if (customerName || customerPhone) {
      const leadQuery: any = {}
      
      if (customerName) {
        leadQuery.name = { $regex: customerName, $options: "i" }
      }
      
      if (customerPhone) {
        leadQuery.phoneNo = { $regex: customerPhone, $options: "i" }
      }

      // Find matching lead IDs
      const matchingLeads = await Query.find(leadQuery).select("_id")
      const leadIds = matchingLeads.map(lead => lead._id)
      
      // Add lead IDs to the filter query
      filterQuery.lead = { $in: leadIds }
    }

    if (vsid) {
      filterQuery.VSID = { $regex: vsid, $options: "i" }
    }

    if (commissionFrom || commissionTo) {
      const commissionConditions = []

      if (commissionFrom) {
        commissionConditions.push({
          $gte: [
            { $add: ["$ownerCommission", "$travellerCommission", "$agentCommission"] },
            Number.parseInt(commissionFrom),
          ],
        })
      }

      if (commissionTo) {
        commissionConditions.push({
          $lte: [
            { $add: ["$ownerCommission", "$travellerCommission", "$agentCommission"] },
            Number.parseInt(commissionTo),
          ],
        })
      }

      if (commissionConditions.length > 0) {
        filterQuery.$expr = commissionConditions.length === 1 ? commissionConditions[0] : { $and: commissionConditions }
      }
    }

    const visits = await Visits.find(filterQuery)
      .populate({
        path: "lead",
        select: "name phoneNo email",
      })
      .sort({ createdAt: -1 })

    const totalVisits = await Visits.countDocuments(filterQuery)
    const totalPages = Math.ceil(totalVisits / 50)

    return NextResponse.json({ data: visits, totalPages, totalVisits }, { status: 200 })
  } catch (err: any) {
    console.log("err in getting visits: ", err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}