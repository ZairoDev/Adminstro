"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface InterviewRemarks {
  experienceValidation?: string;
  motherTongueInfluence?: string;
  englishSpeaking?: string;
  understandingScale?: string;
  listeningSkills?: string;
  basicProfessionalism?: string;
  stabilitySignals?: string;
  hrNotes?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

interface InterviewRemarksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  existingRemarks?: InterviewRemarks | null;
  onSuccess?: () => void;
}

const EVALUATION_SECTIONS = [
  {
    key: "experienceValidation",
    label: "Experience Validation",
    options: [
      "relevant experience for the role",
      "partial or transferable experience",
      "no experience (fresher)",
      "experience not relevant or exaggerated",
    ],
  },
  {
    key: "motherTongueInfluence",
    label: "Mother Tongue Influence",
    options: [
      "no issue with clear communication",
      "minor manageable influence",
      "moderate influence needing improvement",
      "heavy influence creating a communication barrier",
    ],
  },
  {
    key: "englishSpeaking",
    label: "English Speaking and Vocabulary",
    options: [
      "fluent and professional",
      "understandable with minor gaps",
      "basic with limited vocabulary",
      "poor and difficult to understand",
    ],
  },
  {
    key: "understandingScale",
    label: "Understanding Scale",
    options: [
      "high grasp of concepts",
      "good understanding with explanation",
      "average but manageable understanding",
      "low understanding struggling with basics",
    ],
  },
  {
    key: "listeningSkills",
    label: "Listening Skills",
    options: [
      "active and accurate listening",
      "listening with missed details",
      "frequent interruptions or misunderstandings",
      "poor listening",
    ],
  },
  {
    key: "basicProfessionalism",
    label: "Basic Professionalism",
    options: [
      "punctual and respectful behavior",
      "minor professionalism gaps",
      "casual or inconsistent behavior",
      "unprofessional conduct",
    ],
  },
  {
    key: "stabilitySignals",
    label: "Stability Signals",
    options: [
      "stable with realistic expectations",
      "mostly stable with minor concerns",
      "some red flags such as job hopping or confusion",
      "high risk and unstable",
    ],
  },
] as const;

export function InterviewRemarksDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  existingRemarks,
  onSuccess,
}: InterviewRemarksDialogProps) {
  const [formData, setFormData] = useState<Record<string, string>>({
    experienceValidation: "",
    motherTongueInfluence: "",
    englishSpeaking: "",
    understandingScale: "",
    listeningSkills: "",
    basicProfessionalism: "",
    stabilitySignals: "",
    hrNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);

  // Load existing remarks when dialog opens
  useEffect(() => {
    if (open && existingRemarks) {
      setFormData({
        experienceValidation: existingRemarks.experienceValidation || "",
        motherTongueInfluence: existingRemarks.motherTongueInfluence || "",
        englishSpeaking: existingRemarks.englishSpeaking || "",
        understandingScale: existingRemarks.understandingScale || "",
        listeningSkills: existingRemarks.listeningSkills || "",
        basicProfessionalism: existingRemarks.basicProfessionalism || "",
        stabilitySignals: existingRemarks.stabilitySignals || "",
        hrNotes: existingRemarks.hrNotes || "",
      });
      setCharacterCount(existingRemarks.hrNotes?.length || 0);
    } else if (open && !existingRemarks) {
      // Reset form when opening for new entry
      setFormData({
        experienceValidation: "",
        motherTongueInfluence: "",
        englishSpeaking: "",
        understandingScale: "",
        listeningSkills: "",
        basicProfessionalism: "",
        stabilitySignals: "",
        hrNotes: "",
      });
      setCharacterCount(0);
    }
  }, [open, existingRemarks]);

  const handleSubmit = async () => {
    // Validate all required fields
    const requiredFields = [
      "experienceValidation",
      "motherTongueInfluence",
      "englishSpeaking",
      "understandingScale",
      "listeningSkills",
      "basicProfessionalism",
      "stabilitySignals",
    ];

    const missingFields = requiredFields.filter((field) => !formData[field]);
    if (missingFields.length > 0) {
      toast.error("Please complete all evaluation sections");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/interview-remarks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceValidation: formData.experienceValidation,
          motherTongueInfluence: formData.motherTongueInfluence,
          englishSpeaking: formData.englishSpeaking,
          understandingScale: formData.understandingScale,
          listeningSkills: formData.listeningSkills,
          basicProfessionalism: formData.basicProfessionalism,
          stabilitySignals: formData.stabilitySignals,
          hrNotes: formData.hrNotes || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(existingRemarks ? "Interview remarks updated successfully" : "Interview remarks saved successfully");
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to save interview remarks");
      }
    } catch (error) {
      console.error("Error saving interview remarks:", error);
      toast.error("Failed to save interview remarks");
    } finally {
      setSaving(false);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 200) {
      setFormData((prev) => ({ ...prev, hrNotes: value }));
      setCharacterCount(value.length);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>HR Interview Remarks</DialogTitle>
          <DialogDescription>
            Evaluate {candidateName} across all required categories. All sections are mandatory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {EVALUATION_SECTIONS.map((section) => (
            <div key={section.key} className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">
                {section.label} *
              </Label>
              <RadioGroup
                value={formData[section.key]}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, [section.key]: value }))
                }
                className="space-y-2"
              >
                {section.options.map((option) => (
                  <div key={option} className="flex items-start space-x-2">
                    <RadioGroupItem
                      value={option}
                      id={`${section.key}-${option}`}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`${section.key}-${option}`}
                      className="text-sm font-normal cursor-pointer leading-relaxed"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}

          {/* HR Notes */}
          <div className="space-y-2">
            <Label htmlFor="hrNotes" className="text-sm font-semibold text-foreground">
              HR Remarks (Optional)
            </Label>
            <Textarea
              id="hrNotes"
              value={formData.hrNotes}
              onChange={handleNotesChange}
              placeholder="Add any additional remarks or notes (max 200 characters)..."
              rows={2}
              className="resize-none"
            />
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">
                {characterCount}/200 characters
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : existingRemarks ? (
              "Update Remarks"
            ) : (
              "Save Remarks"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

