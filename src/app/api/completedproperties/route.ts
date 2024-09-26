import { NextRequest, NextResponse } from "next/server";
import { Property } from "@/models/listing";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";

connectDb();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "VSID";

    let wordsCount = 0;
    const { email } = await getDataFromToken(request);
    console.log("email: ", email);
    const employee = await Employees.findOne({ email });
    console.log("employee: ", employee);

    if (employee.role === "Content") {
      wordsCount = employee.extras.get("wordsCount") || 0;
      console.log(employee.extras);
      console.log(employee.extras.get("wordsCount"));
    }
    console.log("wordsCount: ", wordsCount);
    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};
    if (searchTerm) {
      query[searchType] = regex;
    }

    query["newReviews"] = { $exists: true, $ne: "" };

    let allProperties;

    if (!searchTerm) {
      allProperties = await Property.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 });
    } else {
      allProperties = await Property.find(query).sort({ _id: -1 });
    }

    if (allProperties.length === 0) {
      const totalCount = await Property.countDocuments();
      console.log("Total properties in database:", totalCount);
    }
    const completedProperties = await Property.countDocuments(query);
    const totalPages = Math.ceil(completedProperties / limit);

    const propertiesWithDescriptionsCount = await Property.countDocuments({
      newReviews: { $exists: true, $ne: "" },
    });


    const totalCount = await Property.countDocuments();
    console.log('total: ', totalCount);

    return NextResponse.json({
      data: allProperties,
      page,
      totalPages,
      completedProperties,
      propertiesWithDescriptionsCount,
      wordsCount,
      totalProperties: totalCount,
    });
  } catch (error: any) {
    console.error("Error in GET request:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch properties from the database",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
