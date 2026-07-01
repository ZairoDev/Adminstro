import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { buildAllLeadsMatchQuery } from "@/lib/leads/buildAllLeadsMatchQuery";
import { LeadQueryService } from "@/lib/leads/LeadQueryService";

connectDb();

export async function POST(req: NextRequest) {
  const reqBody = await req.json();
  const token = await getDataFromToken(req);
  const assignedArea = (
    Array.isArray(token.allotedArea)
      ? token.allotedArea.map((a) => String(a))
      : token.allotedArea
        ? [String(token.allotedArea)]
        : []
  ) as string[];

  try {
    const { sortBy } = reqBody.filters;
    const PAGE = reqBody.page;

    const buildResult = await buildAllLeadsMatchQuery({
      token: token as Record<string, unknown>,
      filters: reqBody.filters,
    });

    if (!buildResult.ok) {
      return NextResponse.json(buildResult.emptyResponse);
    }

    const query = buildResult.query;
    const { allotedArea } = reqBody.filters;

    const result = await LeadQueryService.list({
      matchQuery: query,
      page: PAGE,
      sortBy,
      includeStatusCount: true,
    });

  const pipeline = [
  {
    $match: {
      leadStatus: "fresh",   
      ...(allotedArea
      ? { location: new RegExp(allotedArea, "i") }  
      : (assignedArea && assignedArea.length > 0
          ? { location: { $in: assignedArea } }  
          : {})),
    }
  },
  {
    $group: {
      _id: null,
      "1bhk": {
        $sum: {
          $cond: [
            { 
              $and: [
                { $eq: ["$typeOfProperty", "Apartment"] }, 
                { $eq: ["$noOfBeds", 1] }
              ] 
            },
            1,
            0
          ]
        }
      },
      "2bhk": {
        $sum: {
          $cond: [
            { 
              $and: [
                { $eq: ["$typeOfProperty", "Apartment"] }, 
                { $eq: ["$noOfBeds", 2] }
              ] 
            },
            1,
            0
          ]
        }
      },
      "3bhk": {
        $sum: {
          $cond: [
            { 
              $and: [
                { $eq: ["$typeOfProperty", "Apartment"] }, 
                { $eq: ["$noOfBeds", 3] }
              ] 
            },
            1,
            0
          ]
        }
      },
      "4bhk": {
        $sum: {
          $cond: [
            { 
              $and: [
                { $eq: ["$typeOfProperty", "Apartment"] }, 
                { $eq: ["$noOfBeds", 4] }
              ] 
            },
            1,
            0
          ]
        }
      },
      studio: {
        $sum: {
          $cond: [
            { $in: ["$typeOfProperty", ["Studio", "Studio / 1 bedroom"]] },
            1,
            0
          ]
        }
      },
      sharedApartment: {
        $sum: {
          $cond: [
            { $eq: ["$typeOfProperty", "Shared Apartment"] },
            1,
            0
          ]
        }
      }
    }
  },
  {
    $project: {
      _id: 0,
      "1bhk": 1,
      "2bhk": 1,
      "3bhk": 1,
      "4bhk": 1,
      studio: 1,
      sharedApartment: 1
    }
  }
]


    const wordsCount = await Query.aggregate(pipeline);

    return NextResponse.json({
      ...result,
      wordsCount,
    });
    
  } catch (error: any) {
    console.log("error in getting filtered leads: ", error);
    return NextResponse.json(
      {
        message: "Failed to fetch properties from the database",
        error: error.message,
      },
      { status: 500 }
    );
  }
}