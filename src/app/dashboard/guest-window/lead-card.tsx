"use client";

import {
  Tag,
  Home,
  Mail,
  User,
  Clock,
  Phone,
  MapPin,
  Calendar,
  ChevronUp,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IQuery } from "@/util/type";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LeadCardProps {
  lead: IQuery;
}

export function LeadCard({ lead }: LeadCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Format dates if they're valid
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  // Get quality badge color based on quality value
  const getQualityColor = (quality: string | null) => {
    if (!quality) return "bg-gray-200 text-gray-700";

    switch (quality.toLowerCase()) {
      case "very good":
        return "bg-green-400 text-green-900";
      case "good":
        return "bg-green-100 text-green-800";
      case "average":
        return "bg-yellow-100 text-yellow-800";
      case "poor":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card
      className=" w-[70vw] mb-4 overflow-hidden border-l-4 hover:shadow-md transition-shadow duration-200"
      style={{
        borderLeftColor:
          lead.priority.toLowerCase() === "high"
            ? "#ef4444"
            : lead.priority.toLowerCase() === "medium"
            ? "#f97316"
            : "#3b82f6",
      }}
    >
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left section - Primary info */}
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500 dark:text-white" />
                    <p className=" text-gray-500 dark:text-white">{lead.name}</p>
                    {lead.leadQualityByReviwer && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reviewed</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-white">
                    {lead.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{lead.email}</span>
                      </div>
                    )}

                    {lead.phoneNo && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{lead.phoneNo}</span>
                      </div>
                    )}

                    {lead.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>
                          {lead.location} {lead.zone && `(${lead.zone})`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Badge className={getPriorityColor(lead.priority)}>
                    {lead.priority}
                  </Badge>

                  {lead.leadQualityByCreator && (
                    <Badge className={getQualityColor(lead.leadQualityByCreator)}>
                      Quality: {lead.leadQualityByCreator}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Middle section - Key details */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500 dark:text-white" />
              <div>
                <p className="text-xs text-gray-500 dark:text-white">Stay Period</p>
                <p className="text-sm font-medium">
                  {formatDate(lead.startDate)} - {formatDate(lead.endDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 ">
              <DollarSign className="h-4 w-4 text-gray-500 dark:text-white" />
              <div>
                <p className="text-xs text-gray-500 dark:text-white">Budget</p>
                <p className="text-sm font-medium">{lead.budget}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-gray-500 dark:text-white" />
              <div>
                <p className="text-xs text-gray-500 dark:text-white">Property</p>
                <p className="text-sm font-medium">{lead.typeOfProperty}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-500 dark:text-white" />
              <div>
                <p className="text-xs text-gray-500 dark:text-white">Booking Term</p>
                <p className="text-sm font-medium">{lead.bookingTerm}</p>
              </div>
            </div>
          </div>

          {/* Expandable section */}
          {expanded && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-white" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white">Duration</p>
                    <p className="text-sm font-medium">{lead.duration}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500 dark:text-white" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white">Guests</p>
                    <p className="text-sm font-medium">{lead.guest}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-gray-500 dark:text-white" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white">Beds</p>
                    <p className="text-sm font-medium">{lead.noOfBeds}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-500 dark:text-white" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white">Bill Status</p>
                    <p className="text-sm font-medium">{lead.billStatus}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm">
                  <p className="text-gray-500 dark:text-white">Created by:</p>
                  <p className="font-medium">{lead.createdBy}</p>
                </div>

                <div className="flex items-center gap-2 text-sm mt-1">
                  <p className="text-gray-500 dark:text-white">Created at:</p>
                  <p className="font-medium">
                    {/* {formatDate(new Date(lead.createdAt ?? ""))} */}
                    {/* {lead?.createdAt?.toLocaleDateString().split("T")} */}
                    {lead.createdAt &&
                      format(
                        new Date(lead.createdAt)?.toLocaleDateString(),
                        "dd-MM-yyyy"
                      )}
                  </p>
                </div>

                {/* {lead. && lead.salesPerson !== "None" && (
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <p className="text-gray-500">Sales Person:</p>
                    <p className="font-medium">{lead.salesPerson}</p>
                  </div>
                )} */}
              </div>
            </div>
          )}
        </div>

        {/* Card footer with expand/collapse button */}
        <div className="bg-black/40 backdrop-blur-md opacity-40 px-4 py-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-black dark:text-white"
          >
            {expanded ? (
              <span className="flex items-center gap-1">
                <ChevronUp className="h-4 w-4" />
                Show Less
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <ChevronDown className="h-4 w-4" />
                Show More
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
