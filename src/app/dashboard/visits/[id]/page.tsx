"use client";

import {
  Eye,
  Edit,
  Mail,
  User,
  Users,
  Video,
  Phone,
  Clock,
  MapPin,
  EuroIcon,
  FileText,
  Calendar,
  ArrowLeft,
  CreditCard,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import axios from "@/util/axios";
import { useCallback, useEffect, useState } from "react";

import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { VisitInterface } from "@/util/type";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HandLoader from "@/components/HandLoader";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { VisitStatusBadge } from "../visit-status-badge";
import { RescheduleVisitModal } from "../reschedule-visit-modal";
import BookingModal from "../booking-modal";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { useVisitCloseActions } from "@/hooks/useVisitCloseActions";
import {
  VISIT_CANCEL_REASONS,
  VISIT_NO_SHOW_REASONS,
  getVisitDaysOverdue,
  isVisitOverdue,
} from "@/lib/visits/visitStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const formatDate = (dateString: Date) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const DetailedVisit = ({ params }: { params: { id: string } }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [visitData, setVisitData] = useState<VisitInterface>();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  const getVisit = useCallback(async (showLoader = true) => {
    if (!params.id) return;
    try {
      if (showLoader) setIsLoading(true);
      const response = await axios.post("/api/visits/getVisitById", {
        visitId: params.id,
      });
      setVisitData(response.data.data);
    } catch {
      toast({ title: "Unable to fetch Visit", variant: "destructive" });
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [params.id]);

  const { loadingId, complete, cancel, noShow } = useVisitCloseActions(() =>
    getVisit(false),
  );

  useEffect(() => {
    void getVisit(true);
  }, [getVisit]);

  const isActionable =
    visitData?.visitStatus === "scheduled" ||
    visitData?.visitStatus === "rescheduled";
  const overdue = visitData
    ? isVisitOverdue(
        visitData.visitStatus,
        visitData.schedule,
        visitData.createdAt,
      )
    : false;
  const daysOverdue = visitData
    ? getVisitDaysOverdue(
        visitData.visitStatus,
        visitData.schedule,
        visitData.createdAt,
      )
    : 0;

  if (isLoading) {
    return (
      <div className="flex mt-2 min-h-screen items-center justify-center">
        <HandLoader />
      </div>
    );
  }

  return (
    <>
      {!visitData ? (
        <div>No Visit for this ID</div>
      ) : (
        <div className=" min-h-screen p-6 mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Link href={"/dashboard/visits"} className=" flex">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Visits
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Visit Details
                </h1>
                <p className="text-gray-600 dark:text-white">
                  Complete information about visit {visitData?.VSID}
                </p>
              </div>
            </div>
            {/* <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Lead
          </Button>
          <Button size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Visit
          </Button>
        </div> */}
          </div>

          {/* Visit Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Visit Overview</span>
                  </CardTitle>
                  <CardDescription>
                    Basic visit information and current status
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <VisitStatusBadge
                    status={visitData.visitStatus}
                    outcome={visitData.outcome}
                  />
                  {overdue && (
                    <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                      {daysOverdue} {daysOverdue === 1 ? "day" : "days"} overdue
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className="flex items-center space-x-1"
                  >
                    {visitData.visitType === "physical" ? (
                      <MapPin className="h-3 w-3" />
                    ) : (
                      <Video className="h-3 w-3" />
                    )}
                    <span>
                      {visitData.visitType.charAt(0).toUpperCase() +
                        visitData.visitType.slice(1)}
                    </span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">VSID</p>
                  <p className="text-lg font-semibold">{visitData.VSID}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Property ID
                  </p>
                  <p className="text-lg font-semibold">
                    {visitData.propertyId}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Created By
                  </p>
                  <p className="text-lg font-semibold">{visitData.createdBy}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isActionable && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setRescheduleOpen(true)}>Reschedule</Button>
              <Button
                variant="secondary"
                disabled={loadingId === visitData._id}
                onClick={() => void complete(visitData._id)}
              >
                Mark Completed
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={loadingId === visitData._id}>
                    Cancel Visit
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {VISIT_CANCEL_REASONS.map((reason) => (
                    <DropdownMenuItem
                      key={reason}
                      className="cursor-pointer"
                      onClick={() => void cancel(visitData._id, reason)}
                    >
                      {reason}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={loadingId === visitData._id}>
                    Mark No-show
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {VISIT_NO_SHOW_REASONS.map((reason) => (
                    <DropdownMenuItem
                      key={reason}
                      className="cursor-pointer"
                      onClick={() => void noShow(visitData._id, reason)}
                    >
                      {reason}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Owner Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Owner Information</span>
                </CardTitle>
                <CardDescription>
                  Property owner contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="font-medium">{visitData.ownerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="font-medium">{visitData.ownerPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="font-medium">{visitData.ownerEmail}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Customer Information</span>
                    </CardTitle>
                    <CardDescription>Customer contact details</CardDescription>
                  </div>
                  {visitData.lead?._id && (
                    <Button
                      size="sm"
                      onClick={() => setBookingOpen(true)}
                    >
                      Create Booking
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="font-medium">{visitData?.lead?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="font-medium">{visitData?.lead?.phoneNo}</p>
                    </div>
                  </div>
                  {/* <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="font-semibold">{visitData.lead}</p>
                    </div>
                  </div> */}
                </div>
              </CardContent>
            </Card>

            {/* Agent Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Agent Information</span>
                </CardTitle>
                <CardDescription>
                  Assigned agent contact details
                </CardDescription>
              </CardHeader>
              <CardContent className=" space-y-4">
                <div className=" flex justify-between items-end space-y-3 ">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Agent Name
                      </p>
                      <p className="font-medium">{visitData.agentName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Agent Phone
                      </p>
                      <p className="font-medium">{visitData.agentPhone}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Schedule Information</span>
              </CardTitle>
              <CardDescription>Planned visit dates and times</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {visitData.schedule.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-3rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{formatDate(new Date(slot.date))}</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{slot.time}</span>
                    </div>
                    {/* {index === 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    Primary
                  </Badge>
                )} */}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {visitData.scheduleHistory && visitData.scheduleHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Schedule History</CardTitle>
                <CardDescription>Previous visit dates before rescheduling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {visitData.scheduleHistory.map((entry, index) => (
                  <div key={index} className="flex items-center gap-4 text-sm">
                    <span>{formatDate(new Date(entry.date))}</span>
                    <span>{entry.time}</span>
                    {entry.reason && (
                      <span className="text-muted-foreground">{entry.reason}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <EuroIcon className="h-5 w-5" />
                <span>Financial Details</span>
              </CardTitle>
              <CardDescription>
                Pricing and commission information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-500">
                      Pitch Amount
                    </p>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(visitData.pitchAmount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <EuroIcon className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-500">
                      Owner Commission
                    </p>
                  </div>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(visitData.ownerCommission)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <EuroIcon className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-500">
                      Traveller Commission
                    </p>
                  </div>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(visitData.travellerCommission)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-500">
                      Agent Commission
                    </p>
                  </div>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(visitData.agentCommission)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-500">
                      Documentation
                    </p>
                  </div>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(visitData.documentationCharges)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          {(visitData.reason || visitData.note) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Additional Information</span>
                </CardTitle>
                <CardDescription>
                  Reason and notes for this visit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {visitData.reason && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-gray-500" />
                      <p className="text-sm font-medium text-gray-500">
                        Reason
                      </p>
                    </div>
                    <p className="text-gray-900  p-3 rounded-lg">
                      {visitData.reason}
                    </p>
                  </div>
                )}
                {visitData.note && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-gray-500" />
                      <p className="text-sm font-medium text-gray-500">Notes</p>
                    </div>
                    <p className="text-gray-900 p-3 rounded-lg">
                      {visitData.note}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <RescheduleVisitModal
        visit={visitData ?? null}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        onSuccess={() => void getVisit(false)}
      />

      <AlertDialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {visitData && (
            <BookingModal
              visit={visitData}
              onOpenChange={() => setBookingOpen(false)}
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default DetailedVisit;
