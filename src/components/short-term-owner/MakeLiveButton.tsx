"use client";

import { useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface MakeLiveButtonProps {
  propertyMongoId: string;
  readyToGoLive?: boolean;
  missingSteps?: string[];
  forceLive?: boolean;
  size?: "sm" | "default";
  variant?: "default" | "destructive" | "outline";
  label?: string;
  onSuccess?: () => void;
  className?: string;
}

export function MakeLiveButton({
  propertyMongoId,
  readyToGoLive = false,
  missingSteps = [],
  forceLive = false,
  size = "sm",
  variant = "default",
  label,
  onSuccess,
  className,
}: MakeLiveButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (forceLive) {
      const confirmed = window.confirm(
        "Force live without completed onboarding?",
      );
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      await axios.post("/api/visibiltychange", {
        id: propertyMongoId,
        isLive: true,
        forceLive,
      });
      toast({ title: "Property is now live on Vacation Saga" });
      onSuccess?.();
    } catch (err: unknown) {
      const data = (err as {
        response?: { data?: { message?: string; missingSteps?: string[] } };
      })?.response?.data;
      const missing = data?.missingSteps?.length
        ? ` Missing: ${data.missingSteps.join(", ")}`
        : "";
      toast({
        variant: "destructive",
        title: data?.message ?? "Could not make property live",
        description: missing || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || (!forceLive && !readyToGoLive);
  const buttonLabel = label ?? (forceLive ? "Force live" : "Make live");

  const button = (
    <Button
      size={size}
      variant={variant}
      disabled={disabled}
      onClick={() => void handleClick()}
      className={className}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : buttonLabel}
    </Button>
  );

  if (!forceLive && !readyToGoLive && missingSteps.length > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">{button}</span>
          </TooltipTrigger>
          <TooltipContent>{missingSteps.join(", ")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
