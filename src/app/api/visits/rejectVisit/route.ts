import Visits from "@/models/visit";
import { connectDb } from "@/util/db";

export async function POST(req: Request) {
  try {
    const { id, rejectionReason, status } = await req.json();


    if (!id || !rejectionReason || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    await connectDb();

    const visit = await Visits.findByIdAndUpdate(
      id,
      { visitStatus: status, rejectionReason },
      { new: true }
    );

    if (!visit) {
      return new Response(JSON.stringify({ error: "Visit not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ success: true, data: visit }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error updating visit:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
