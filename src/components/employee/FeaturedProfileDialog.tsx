"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  missingFeaturedFields,
  type FeaturedProfileValues,
  type FeaturedPublicField,
} from "@/lib/employee/featuredProfile";

const FIELD_LABELS: Record<FeaturedPublicField, string> = {
  name: "Name",
  position: "Position",
  department: "Department",
  description: "Description",
};

type FeaturedProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: FeaturedProfileValues;
  saving: boolean;
  onSave: (values: FeaturedProfileValues) => void;
};

export function FeaturedProfileDialog({
  open,
  onOpenChange,
  values,
  saving,
  onSave,
}: FeaturedProfileDialogProps) {
  const [draft, setDraft] = useState<FeaturedProfileValues>(values);
  const [error, setError] = useState("");
  const wasOpen = useRef(false);
  const missingFields = missingFeaturedFields({
    name: values.name,
    jobTitle: values.position,
    department: values.department,
    description: values.description,
  });

  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraft(values);
      setError("");
    }
    wasOpen.current = open;
  }, [open, values]);

  const updateField = (field: FeaturedPublicField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    const next: FeaturedProfileValues = { ...values };
    for (const field of missingFields) {
      next[field] = draft[field].trim();
    }
    const stillMissing = missingFeaturedFields({
      name: next.name,
      jobTitle: next.position,
      department: next.department,
      description: next.description,
    });
    if (stillMissing.length > 0) {
      setError(
        `Fill ${stillMissing.map((field) => FIELD_LABELS[field].toLowerCase()).join(", ")} before featuring this employee.`,
      );
      return;
    }
    setError("");
    onSave(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete featured profile</DialogTitle>
          <p className="text-sm text-muted-foreground">
            The company site shows name, position, department, and a short
            description. Fill in what is missing before featuring this employee.
          </p>
        </DialogHeader>
        <div className="space-y-4">
          {missingFields.map((field) => (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={`featured-${field}`}>{FIELD_LABELS[field]}</Label>
              {field === "description" ? (
                <Textarea
                  id={`featured-${field}`}
                  value={draft.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Short bio for the company website"
                  rows={4}
                  disabled={saving}
                />
              ) : (
                <Input
                  id={`featured-${field}`}
                  value={draft[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  disabled={saving}
                />
              )}
            </div>
          ))}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save and feature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
