import { connectDb } from "@/util/db";
import { unregisteredOwner } from "@/models/unregisteredOwner";

export async function POST(req: Request) {
  try {
    await connectDb();
    const { location } = await req.json();
    if (!location) {
      return new Response(
        JSON.stringify({ error: "Location is required" }),
        { status: 400 }
      );
    }
    const pipeline = [
      {
        $match: {
          location: location,
        },
      },
      {
        $group: {
          _id: "$area",
          oneBedroom: {
            $sum: { $cond: [{ $eq: ["$propertyType", "1 Bedroom"] }, 1, 0] },
          },
          twoBedroom: {
            $sum: { $cond: [{ $eq: ["$propertyType", "2 Bedroom"] }, 1, 0] },
          },
          threeBedroom: {
            $sum: { $cond: [{ $eq: ["$propertyType", "3 Bedroom"] }, 1, 0] },
          },
          fourBedroom: {
            $sum: { $cond: [{ $eq: ["$propertyType", "4 Bedroom"] }, 1, 0] },
          },
          studio: {
            $sum: { $cond: [{ $eq: ["$propertyType", "Studio"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          area: "$_id",
          oneBedroom: 1,
          twoBedroom: 1,
          threeBedroom: 1,
          fourBedroom: 1,
          studio: 1,
        },
      },
      {
        $sort: { area: 1 as 1 },
      },
    ];
    const result = await unregisteredOwner.aggregate(pipeline);
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
