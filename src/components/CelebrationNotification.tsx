"use client";

import React, { useState } from "react";
import { Cake, Calendar, ChevronDown, ChevronUp, PartyPopper, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CelebrationEvent {
  employeeId: string;
  firstName: string;
  fullName: string;
  eventType: "birthday" | "anniversary";
  years?: number;
}

interface CelebrationNotificationProps {
  birthdays: CelebrationEvent[];
  anniversaries: CelebrationEvent[];
  onDismiss: () => void;
  onViewDetails?: () => void;
}

/**
 * CelebrationNotification Component
 * Non-intrusive banner notification showing today's celebrations
 */
export const CelebrationNotification: React.FC<CelebrationNotificationProps> = ({
  birthdays,
  anniversaries,
  onDismiss,
  onViewDetails,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalCount = birthdays.length + anniversaries.length;
  const hasMultiple = totalCount > 1;

  // Show summary for collapsed view
  const getSummary = () => {
    if (birthdays.length > 0 && anniversaries.length > 0) {
      return `${birthdays.length} Birthday${birthdays.length !== 1 ? "s" : ""} & ${anniversaries.length} Anniversary${anniversaries.length !== 1 ? "ies" : ""} today`;
    } else if (birthdays.length > 0) {
      return `${birthdays.length} Birthday${birthdays.length !== 1 ? "s" : ""} today`;
    } else {
      return `${anniversaries.length} Work Anniversary${anniversaries.length !== 1 ? "ies" : ""} today`;
    }
  };

  // Show first event for single event view
  const getSingleEventMessage = () => {
    if (birthdays.length === 1 && anniversaries.length === 0) {
      return `Today is ${birthdays[0].firstName}'s birthday`;
    } else if (anniversaries.length === 1 && birthdays.length === 0) {
      return `Today is ${anniversaries[0].firstName}'s ${anniversaries[0].years}-year work anniversary`;
    }
    return null;
  };

  const singleEventMessage = getSingleEventMessage();

  return (
    <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-pink-50 via-purple-50 to-rose-50 dark:from-pink-950/40 dark:via-purple-950/40 dark:to-rose-950/40 border-2 border-pink-300 dark:border-pink-700 shadow-md animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {singleEventMessage && !hasMultiple ? (
            // Single event - simple message
            <p className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
              {birthdays.length > 0 ? (
                <Cake className="h-5 w-5 shrink-0 text-pink-600" aria-hidden />
              ) : (
                <Calendar className="h-5 w-5 shrink-0 text-purple-600" aria-hidden />
              )}
              {singleEventMessage}
            </p>
          ) : (
            // Multiple events - summary with expand option
            <>
              <div className="flex items-center gap-2">
                <p className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
                  <PartyPopper className="h-5 w-5 shrink-0 text-pink-600" aria-hidden />
                  {getSummary()}
                </p>
                {hasMultiple && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 rounded hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                )}
              </div>

              {/* Expanded view */}
              {isExpanded && (
                <div className="mt-3 space-y-2 pl-2 border-l-2 border-pink-300 dark:border-pink-700">
                  {/* Birthdays */}
                  {birthdays.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-pink-700 dark:text-pink-300 flex items-center gap-1">
                        <Cake className="w-4 h-4" />
                        Birthdays:
                      </p>
                      <div className="pl-5 space-y-0.5">
                        {birthdays.map((bday) => (
                          <p
                            key={bday.employeeId}
                            className="text-sm text-gray-700 dark:text-gray-300"
                          >
                            <Cake className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                            {bday.firstName}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Anniversaries */}
                  {anniversaries.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Work Anniversaries:
                      </p>
                      <div className="pl-5 space-y-0.5">
                        {anniversaries.map((anniv) => (
                          <p
                            key={anniv.employeeId}
                            className="text-sm text-gray-700 dark:text-gray-300"
                          >
                            <PartyPopper className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                            {anniv.firstName} - {anniv.years} year{anniv.years !== 1 ? "s" : ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="text-xs"
            >
              View Details
            </Button>
          )}
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

