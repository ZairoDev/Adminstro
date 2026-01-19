import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Candidate } from "../types";
import { SelectionData } from "../../components/select-candidate-dialog";
import { ShortlistData } from "../../components/shortlist-candidate-dialog";
import { RejectionData } from "../../components/reject-candidate-dialog";

export function useCandidateActions(
  candidateId: string,
  onSuccess?: (updatedCandidate: Candidate) => void
) {
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectCandidate = async (data: SelectionData) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `/api/candidates/${candidateId}/action`,
        {
          status: "selected",
          selectionDetails: {
            positionType: data.positionType,
            trainingDate: data.trainingDate,
            trainingPeriod: data.trainingPeriod,
            role: data.role,
            salary: data.salary,
            duration: data.duration,
          },
        }
      );

      const result = response.data;
      if (result.success) {
        onSuccess?.(result.data);
        return { success: true, data: result.data };
      } else {
        const errorMsg = result.error || "Failed to select candidate";
        setError(errorMsg);
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "An error occurred while selecting the candidate";
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setActionLoading(false);
    }
  };

  const handleShortlistCandidate = async (data: ShortlistData) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `/api/candidates/${candidateId}/action`,
        {
          status: "shortlisted",
          shortlistDetails: {
            suitableRoles: data.suitableRoles,
            notes: data.notes,
          },
        }
      );

      const result = response.data;
      if (result.success) {
        onSuccess?.(result.data);
        return { success: true, data: result.data };
      } else {
        const errorMsg = result.error || "Failed to shortlist candidate";
        setError(errorMsg);
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "An error occurred while shortlisting the candidate";
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCandidate = async (data: RejectionData) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `/api/candidates/${candidateId}/action`,
        {
          status: "rejected",
          rejectionDetails: {
            reason: data.reason,
          },
        }
      );

      const result = response.data;
      if (result.success) {
        onSuccess?.(result.data);
        return { success: true, data: result.data };
      } else {
        const errorMsg = result.error || "Failed to reject candidate";
        setError(errorMsg);
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "An error occurred while rejecting the candidate";
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscontinueTraining = async (data: RejectionData) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `/api/candidates/${candidateId}/action`,
        {
          status: "rejected",
          rejectionDetails: {
            reason: data.reason,
          },
          isTrainingDiscontinuation: true,
        }
      );

      const result = response.data;
      if (result.success) {
        onSuccess?.(result.data);
        return { success: true, data: result.data };
      } else {
        const errorMsg = result.error || "Failed to discontinue training";
        setError(errorMsg);
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "An error occurred while discontinuing training";
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setActionLoading(false);
    }
  };

  const handleOnboarding = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `/api/candidates/${candidateId}/action`,
        {
          status: "onboarding"
        }
      );
      const result = response.data;
      if (result.success) {
        onSuccess?.(result.data);
        return { success: true, data: result.data };
      } else {
        const errorMsg = result.error || "Failed to update candidate";
        setError(errorMsg);
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "An error occurred while updating the candidate";
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setActionLoading(false);
    }
  };

  return {
    actionLoading,
    error,
    handleSelectCandidate,
    handleShortlistCandidate,
    handleRejectCandidate,
    handleDiscontinueTraining,
    handleOnboarding,
  };
}

