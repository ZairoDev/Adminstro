import Query from "@/models/query";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { LEAD_STAGES, selectedLeadStage } from "@/lib/leads/stage";

const bodySchema = z.object({
  leadId: z.string().trim().min(1),
  changedStatus: z.enum(LEAD_STAGES),
});

async function actorIdentity(actor: unknown): Promise<{ name: string; id: string }> {
  if (!actor || typeof actor !== "object") return { name: "Unknown", id: "" };
  const record = actor as { name?: unknown; id?: unknown };
  const tokenName =
    typeof record.name === "string" && record.name.trim() ? record.name.trim() : "";
  const id = record.id == null ? "" : String(record.id);

  if (id && mongoose.Types.ObjectId.isValid(id)) {
    const employee = await Employees.findById(id).select("name").lean<{ name?: string }>();
    const employeeName = typeof employee?.name === "string" ? employee.name.trim() : "";
    if (employeeName) return { name: employeeName, id };
  }

  return { name: tokenName || "Unknown", id };
}

function leadObjectId(leadId: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(leadId);
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const actor = await actorIdentity(await getDataFromToken(req));
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose a stage and try again" }, { status: 400 });
    }

    const { leadId, changedStatus } = parsed.data;
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const current = await Query.findById(leadId).select("messageStatus salesPriority");
    if (!current) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const previous = typeof current.messageStatus === "string" ? current.messageStatus : "";
    if (previous === changedStatus) {
      const unchanged = await Query.findById(leadId);
      return NextResponse.json({
        message: "Message status updated successfully",
        data: unchanged,
      });
    }

    const update: { messageStatus: string; salesPriority?: string } = {
      messageStatus: changedStatus,
    };
    const wasNotReplying =
      previous === "Not Replying" ||
      selectedLeadStage(previous) === "Not Replying" ||
      current.salesPriority === "NR";
    if (changedStatus === "Not Replying") {
      update.salesPriority = "NR";
    } else if (wasNotReplying && current.salesPriority === "NR") {
      update.salesPriority = "None";
    }

    const leadObjectIdValue = leadObjectId(leadId);
    const changedAt = new Date();
    // Write through the collection so a stale in-memory schema cannot drop stageHistory.
    await Query.collection.updateOne(
      { _id: leadObjectIdValue },
      {
        $set: { ...update, updatedAt: changedAt },
        $push: {
          stageHistory: {
            $each: [
              {
                fromStage: previous && previous !== "None" ? previous : "",
                toStage: changedStatus,
                changedByName: actor.name,
                changedById: actor.id,
                changedAt,
              },
            ],
            $slice: -100,
          },
        },
      },
    );

    const updatedLead = await Query.findById(leadId);
    const stored = await Query.collection.findOne(
      { _id: leadObjectIdValue },
      { projection: { stageHistory: 1, messageStatus: 1, salesPriority: 1 } },
    );
    const data = updatedLead ? updatedLead.toObject() : stored;
    if (data && stored) {
      data.stageHistory = Array.isArray(stored.stageHistory) ? stored.stageHistory : [];
      if (typeof stored.messageStatus === "string") data.messageStatus = stored.messageStatus;
      if (typeof stored.salesPriority === "string") data.salesPriority = stored.salesPriority;
    }

    return NextResponse.json({
      message: "Message status updated successfully",
      data,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.log("error in status: ", err);
    return NextResponse.json({ error: "Error in updating message status" }, { status: 500 });
  }
}
