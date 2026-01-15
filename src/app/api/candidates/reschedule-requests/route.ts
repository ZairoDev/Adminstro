import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await connectDb();
    
    // Verify database connection
    const mongoose = require("mongoose");
    const connectionState = mongoose.connection.readyState;
    console.log("🔍 [Reschedule Requests API] Database connection state:", connectionState, "(0=disconnected, 1=connected, 2=connecting, 3=disconnecting)");
    
    if (connectionState !== 1) {
      console.error("❌ [Reschedule Requests API] Database not connected!");
      return NextResponse.json(
        { 
          success: false, 
          error: "Database connection not established",
          debug: { connectionState },
        },
        { status: 503 }
      );
    }
    
    console.log("🔍 [Reschedule Requests API] Starting query...");
    console.log("🔍 [Reschedule Requests API] Environment:", process.env.NODE_ENV);
    
    // Test query: Check total candidates count
    const totalCandidates = await Candidate.countDocuments({});
    console.log("🔍 [Reschedule Requests API] Total candidates in database:", totalCandidates);
    
    // Try multiple query strategies to handle different data structures
    // Strategy 1: Direct status match with case variations
    let query = {
      $or: [
        { "interviewDetails.rescheduleRequest.status": { $in: ["pending", "Pending", "PENDING"] } },
        { "secondRoundInterviewDetails.rescheduleRequest.status": { $in: ["pending", "Pending", "PENDING"] } },
      ],
    };

    console.log("🔍 [Reschedule Requests API] Query Strategy 1:", JSON.stringify(query, null, 2));

    let candidates = await Candidate.find(query)
      .select("_id name email phone position interviewDetails secondRoundInterviewDetails status")
      .lean();

    console.log(`🔍 [Reschedule Requests API] Strategy 1 found ${candidates.length} candidates`);

    // Strategy 2: If no results, try checking for existence of rescheduleRequest first
    if (candidates.length === 0) {
      console.log("🔍 [Reschedule Requests API] Trying Strategy 2: Check for rescheduleRequest existence");
      const query2 = {
        $or: [
          { "interviewDetails.rescheduleRequest": { $exists: true, $ne: null } },
          { "secondRoundInterviewDetails.rescheduleRequest": { $exists: true, $ne: null } },
        ],
      };
      
      const candidatesWithRequests = await Candidate.find(query2)
        .select("_id name email phone position interviewDetails secondRoundInterviewDetails status")
        .lean();
      
      console.log(`🔍 [Reschedule Requests API] Strategy 2 found ${candidatesWithRequests.length} candidates with rescheduleRequest objects`);
      
      // Log sample data structure for debugging
      if (candidatesWithRequests.length > 0) {
        const sample = candidatesWithRequests[0];
        console.log("🔍 [Reschedule Requests API] Sample candidate structure:", {
          name: sample.name,
          hasFirstRound: !!sample.interviewDetails?.rescheduleRequest,
          firstRoundStatus: sample.interviewDetails?.rescheduleRequest?.status,
          hasSecondRound: !!sample.secondRoundInterviewDetails?.rescheduleRequest,
          secondRoundStatus: sample.secondRoundInterviewDetails?.rescheduleRequest?.status,
        });
      }
      
      candidates = candidatesWithRequests;
    }

    const pendingRequests: Array<{
      candidateId: string;
      candidateName: string;
      interviewType: "first" | "second";
      requestedDate: string;
      requestedTime: string;
      reason?: string;
      currentDate?: string;
      currentTime?: string;
    }> = [];

    candidates.forEach((candidate: any) => {
      // Check first round interview reschedule request
      const firstRoundRequest = candidate.interviewDetails?.rescheduleRequest;
      if (firstRoundRequest) {
        const status = firstRoundRequest.status?.toLowerCase();
        console.log(`🔍 [Reschedule Requests API] Candidate ${candidate.name} - First round status:`, firstRoundRequest.status, "Normalized:", status);
        
        if (status === "pending") {
          pendingRequests.push({
            candidateId: candidate._id.toString(),
            candidateName: candidate.name,
            interviewType: "first",
            requestedDate: firstRoundRequest.requestedDate || "",
            requestedTime: firstRoundRequest.requestedTime || "",
            reason: firstRoundRequest.reason,
            currentDate: candidate.interviewDetails?.scheduledDate,
            currentTime: candidate.interviewDetails?.scheduledTime,
          });
        }
      }

      // Check second round interview reschedule request
      const secondRoundRequest = candidate.secondRoundInterviewDetails?.rescheduleRequest;
      if (secondRoundRequest) {
        const status = secondRoundRequest.status?.toLowerCase();
        console.log(`🔍 [Reschedule Requests API] Candidate ${candidate.name} - Second round status:`, secondRoundRequest.status, "Normalized:", status);
        
        if (status === "pending") {
          pendingRequests.push({
            candidateId: candidate._id.toString(),
            candidateName: candidate.name,
            interviewType: "second",
            requestedDate: secondRoundRequest.requestedDate || "",
            requestedTime: secondRoundRequest.requestedTime || "",
            reason: secondRoundRequest.reason,
            currentDate: candidate.secondRoundInterviewDetails?.scheduledDate,
            currentTime: candidate.secondRoundInterviewDetails?.scheduledTime,
          });
        }
      }
    });

    console.log(`✅ [Reschedule Requests API] Returning ${pendingRequests.length} pending requests`);

    return NextResponse.json({
      success: true,
      data: pendingRequests,
      count: pendingRequests.length,
      debug: {
        candidatesFound: candidates.length,
        requestsProcessed: pendingRequests.length,
      },
    });
  } catch (error: any) {
    console.error("❌ [Reschedule Requests API] Error fetching pending reschedule requests:", error);
    console.error("❌ [Reschedule Requests API] Error stack:", error?.stack);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch pending reschedule requests",
        debug: {
          message: error?.message,
          stack: error?.stack,
        },
      },
      { status: 500 }
    );
  }
}

