"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Loader2, Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDateToLocalString, parseLocalDateString, getTodayLocalMidnight, normalizeToLocalMidnight } from "@/lib/utils";

function InterviewRescheduleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token");
  const candidateId = searchParams?.get("candidateId");
  const interviewType = searchParams?.get("type");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [candidateData, setCandidateData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [requestedTime, setRequestedTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !candidateId || !interviewType) {
      setError("Invalid or missing reschedule link parameters");
      setLoading(false);
      return;
    }

    const fetchCandidateData = async () => {
      try {
        const response = await fetch(
          `/api/candidates/${candidateId}/request-reschedule?token=${token}&type=${interviewType}`
        );
        const result = await response.json();

        if (result.success) {
          setCandidateData(result.data);
          // Check if already submitted
          if (result.data.rescheduleRequest?.status === "pending") {
            setSubmitted(true);
          }
        } else {
          setError(result.error || "Failed to load reschedule request data");
        }
      } catch (err) {
        console.error("Error fetching candidate data:", err);
        setError("Failed to load reschedule request data");
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [token, candidateId, interviewType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !requestedTime) {
      toast.error("Please select both date and time");
      return;
    }

    // Validate date is not in the past
    const today = getTodayLocalMidnight();
    const normalizedSelectedDate = normalizeToLocalMidnight(selectedDate);
    if (normalizedSelectedDate < today) {
      toast.error("Selected date cannot be in the past");
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(requestedTime)) {
      toast.error("Invalid time format. Please use HH:MM format (e.g., 14:30)");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const dateString = formatDateToLocalString(selectedDate);
      const response = await fetch(`/api/candidates/${candidateId}/request-reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedDate: dateString,
          requestedTime: requestedTime,
          reason: reason || undefined,
          token: token,
          interviewType: interviewType,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSubmitted(true);
        toast.success("Reschedule request submitted successfully! HR will review your request shortly.");
      } else {
        setError(result.error || "Failed to submit reschedule request");
        toast.error(result.error || "Failed to submit reschedule request");
      }
    } catch (err) {
      console.error("Error submitting reschedule request:", err);
      setError("Failed to submit reschedule request");
      toast.error("Failed to submit reschedule request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !candidateData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-foreground">Invalid Link</h2>
          </div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">
            Please contact HR if you need to reschedule your interview.
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Request Submitted</h2>
          <p className="text-muted-foreground mb-4">
            Your reschedule request has been submitted successfully. HR will review your request and get back to you shortly.
          </p>
          {candidateData?.rescheduleRequest && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-left">
              <p className="text-sm font-medium mb-2">Your Request:</p>
              <p className="text-sm text-muted-foreground">
                <strong>Date:</strong>{" "}
                {candidateData.rescheduleRequest.requestedDate
                  ? new Date(candidateData.rescheduleRequest.requestedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Time:</strong> {candidateData.rescheduleRequest.requestedTime || "N/A"}
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <Card className="p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Request Interview Reschedule</h1>
            <p className="text-muted-foreground">
              Hello {candidateData?.candidateName || "Candidate"}, please provide your preferred date and time for the interview.
            </p>
          </div>

          {candidateData?.currentDate && candidateData?.currentTime && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium mb-2 text-blue-900 dark:text-blue-300">Current Interview Schedule:</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-900 dark:text-blue-300">
                    {new Date(candidateData.currentDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-900 dark:text-blue-300">{candidateData.currentTime}</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="date" className="mb-2 block">
                Preferred Date <span className="text-red-500">*</span>
              </Label>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => {
                  const today = getTodayLocalMidnight();
                  const normalizedDate = normalizeToLocalMidnight(date);
                  return normalizedDate < today;
                }}
                className="rounded-md border"
              />
              {selectedDate && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="time" className="mb-2 block">
                Preferred Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="time"
                type="text"
                placeholder="HH:MM (e.g., 14:30 for 2:30 PM)"
                value={requestedTime}
                onChange={(e) => setRequestedTime(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Please use 24-hour format (e.g., 09:00 for 9:00 AM, 14:30 for 2:30 PM)
              </p>
            </div>

            <div>
              <Label htmlFor="reason" className="mb-2 block">
                Reason (Optional)
              </Label>
              <Textarea
                id="reason"
                placeholder="Please provide a brief reason for rescheduling..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={submitting || !selectedDate || !requestedTime}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function InterviewReschedulePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <InterviewRescheduleContent />
    </Suspense>
  );
}

