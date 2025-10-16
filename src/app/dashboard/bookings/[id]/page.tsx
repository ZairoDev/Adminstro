"use client";

import {
  User,
  Edit,
  Send,
  Home,
  Mail,
  Phone,
  Clock,
  Users,
  MapPin,
  XCircle,
  Calendar,
  FileText,
  Download,
  CreditCard,
  DollarSign,
  CheckCircle,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import axios from "axios";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { BookingInterface, IQuery, VisitInterface } from "@/util/type";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import InvoicePdfButton from "../../invoice/components/invoice-pdf-button";
import { computeTotals } from "../../invoice/components/format";
import PaymentLinkButton from "@/components/razorpayButton";

interface PageProps {
  params: {
    id: string;
  };
}

interface ExtendedBookingInterface
  extends Omit<BookingInterface, "lead" | "visit"> {
  lead: IQuery;
  visit: VisitInterface;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
    case "completed":
    case "confirmed":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "failed":
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    case "partial":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
    case "completed":
      return <CheckCircle className="w-4 h-4" />;
    case "pending":
      return <AlertCircle className="w-4 h-4" />;
    case "failed":
      return <XCircle className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

const BookingPage = ({ params }: PageProps) => {
  const [booking, setBooking] = useState<ExtendedBookingInterface>();
  const [isLoading, setIsLoading] = useState(false);

  const fetchBooking = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post("/api/bookings/getBookingById", {
        bookingId: params.id,
      });

      setBooking(response.data.data);
    } catch (err) {
      toast({
        title: "Unable to fetch booking details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, []);

  // ✅ Create invoice data from booking
  // ✅ Create invoice data from booking
  const invoiceData = useMemo(() => {
    return {
      name: booking?.lead.name ?? "",
      email: booking?.lead.email ?? "",
      phoneNumber: booking?.lead.phoneNo?.toString() ?? "",
      address: booking?.lead.location ?? "",
      amount: booking?.travellerPayment.finalAmount ?? 0,
      sgst: 0,
      igst: 0,
      cgst: 0,
      totalAmount: booking?.travellerPayment.finalAmount ?? 0,
      status: (booking?.travellerPayment.status?.toLowerCase() === "paid"
        ? "paid"
        : "unpaid") as "paid" | "unpaid",

      date: booking?.createdAt ? format(booking.createdAt, "yyyy-MM-dd") : "",
      nationality: "Indian",
      checkIn: booking?.checkIn?.date
        ? format(booking.checkIn.date, "yyyy-MM-dd")
        : "",
      checkOut: booking?.checkOut?.date
        ? format(booking.checkOut.date, "yyyy-MM-dd")
        : "",
      bookingType: "Booking Commission",
      companyAddress: "117/N/70, 3rd Floor Kakadeo, Kanpur - 208025, UP, India",
      invoiceNumber: booking?._id ? `ZI-${booking._id.slice(-5)}` : "ZI-XXXXX",
      sacCode: 9985,
      description: `Booking commission for ${booking?.visit.VSID ?? ""}`,
    };
  }, [booking]);
  

  const computed = useMemo(() => {
    return computeTotals({
      amount: invoiceData.amount,
      sgst: invoiceData.sgst,
      igst: invoiceData.igst,
      cgst: invoiceData.cgst,
    });
  }, [invoiceData]);

  if (!booking) {
    return <div>No Booking</div>;
  }

  return (
    <div className="min-h-screenp-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold ">Booking Details</h1>
            <p className=" mt-1">Booking ID: {booking._id?.toString()}</p>
          </div>
          <div>
            <InvoicePdfButton value={invoiceData} computed={computed} />
          </div>
          <div>
            <PaymentLinkButton
              amount={booking.travellerPayment.finalAmount}
              amountRecieved={booking.travellerPayment.amountReceived}
              finalPrice={booking.travellerPayment.finalAmount}
              name={booking.lead.name}
              email={booking.lead.email}
              phone={booking.lead.phoneNo?.toString()}
              description={booking.visit.VSID}
              numberOfPeople={booking.lead.guest}
              bookingId={booking._id}
              booking_Id={booking.bookingId}
              propertyOwner={booking.visit.ownerName}
              address={booking.lead.area}
              checkIn={
                booking.checkIn.date
                  ? format(booking.checkIn.date, "yyyy-MM-dd")
                  : ""
              }
              checkOut={
                booking.checkOut.date
                  ? format(booking.checkOut.date, "yyyy-MM-dd")
                  : ""
              }
            />
          </div>
          {/* <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit Booking
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button size="sm">
              <Send className="w-4 h-4 mr-2" />
              Send Details
            </Button>
          </div> */}
        </div>

        {/* Status Overview */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm ">Payment Status</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(booking?.travellerPayment?.status ?? "")}
                    <Badge
                      className={getStatusColor(
                        booking.travellerPayment.status ?? ""
                      )}
                    >
                      {booking.travellerPayment.status?.toUpperCase() ?? ""}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm ">Total Amount</p>
                  <p className="font-semibold text-lg">
                    €{booking.travellerPayment.finalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm ">Duration</p>
                  <p className="font-semibold">{booking.lead.duration}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm ">Guests</p>
                  <p className="font-semibold">{booking.lead.guest} guests</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </CardTitle>
                <CardTitle className="flex items-center gap-2">
                  Payment Type : {booking?.travellerPayment?.paymentType}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {Array.isArray(booking.travellerPayment?.guests) &&
                booking.travellerPayment.guests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {booking.travellerPayment.guests.map(
                      (guest: any, index: number) => (
                        <Card
                          key={index}
                          className="shadow-sm border "
                        >
                          <CardHeader className="flex flex-row items-center gap-3 pb-2">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src="/placeholder-user.jpg" />
                              <AvatarFallback>
                                {guest.name
                                  ?.split(" ")
                                  .map((n: string) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-lg">
                                {guest.name}
                              </h3>
                              <div className="text-sm text-gray-600 flex flex-col">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-4 h-4" />{" "}
                                  {guest.email || "N/A"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-4 h-4" />{" "}
                                  {guest.phone || "N/A"}
                                </span>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Amount Due:</span>
                              <span className="font-medium">
                                €{guest.amountDue ?? 0}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Amount Paid:</span>
                              <span className="font-medium">
                                €{guest.amountPaid ?? 0}
                              </span>
                            </div>

                            <Badge
                              className={getStatusColor(
                                guest.status ?? "pending"
                              )}
                              variant="outline"
                            >
                              {guest.status?.toUpperCase() ?? "PENDING"}
                            </Badge>

                            {/* Documents section */}
                            {guest.documents && guest.documents.length > 0 && (
                              <div className="mt-3 space-y-1">
                                <p className="font-medium text-sm flex items-center gap-1">
                                  <FileText className="w-4 h-4" />
                                  Uploaded Documents:
                                </p>
                                {guest.documents.map(
                                  (doc: string, i: number) => (
                                    <Button
                                      key={i}
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start  hover:bg-gray-800"
                                      onClick={() => window.open(doc, "_blank")}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Document {i + 1}
                                    </Button>
                                  )
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>
                ) : (
                  // ✅ Default lead display when no guests present
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>
                        {booking.lead.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {booking.lead.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {booking.lead.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" /> +91{" "}
                          {booking.lead.phoneNo}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Lead summary info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Location Preference</p>
                    <p className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {booking.lead.location}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Budget Range</p>
                    <p>
                      € {booking.lead.minBudget} - € {booking.lead.maxBudget}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Property Type</p>
                    <p>
                      {booking.lead.propertyType} {booking.lead.typeOfProperty}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Bedrooms</p>
                    <p>{booking.lead.noOfBeds} BHK</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property & Visit Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Property & Visit Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className=" rounded-lg">
                  <p className="text-gray-600">
                    <span className=" font-medium text-gray-300">VSID:</span>
                    {"  "}
                    {booking.visit.VSID}
                    <br />
                    <span className=" font-medium text-gray-300">
                      BookingId:
                    </span>
                    {"  "}
                    {booking.visit.propertyId}
                    <br />
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm ">Visit ID</p>
                    <p className="font-medium">{booking.visit._id}</p>
                  </div>
                  <div>
                    <p className="text-sm ">Visit Type</p>
                    <Badge variant="outline" className="capitalize">
                      {booking.visit.visitType}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm ">Owner</p>
                    <p className="font-medium">{booking.visit.ownerName}</p>
                    <p className="text-sm text-gray-500">
                      {booking.visit.ownerPhone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm ">Agent</p>
                    <p className="font-medium">{booking.visit.agentName}</p>
                    <p className="text-sm text-gray-500">
                      {booking.visit.agentPhone}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Visit Notes</h4>
                  <p className=" p-3 rounded-lg">{booking.visit.note}</p>
                </div>
              </CardContent>
            </Card>

            {/* Check-in/Check-out Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Check-in & Check-out
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <h4 className="font-semibold">Check-in</h4>
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-medium">
                        {format(booking.checkIn.date, "EEEE, MMMM d, yyyy")}
                      </p>
                      <p className=" flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {booking.checkIn.time}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <h4 className="font-semibold">Check-out</h4>
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-medium">
                        {format(booking.checkOut.date, "EEEE, MMMM d, yyyy")}
                      </p>
                      <p className=" flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {booking.checkOut.time}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="">Owner Commission</span>
                    <span className="font-medium">
                      €{booking.visit.ownerCommission.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="">Traveller Commission</span>
                    <span className="font-medium">
                      €{booking.visit.travellerCommission.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="">Agent Commission</span>
                    <span className="font-medium">
                      €{booking.visit.agentCommission.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="">Documentation</span>
                    <span className="font-medium">
                      €{booking.visit.documentationCharges.toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Pitched Amount</span>
                    <span>€{booking.visit.pitchAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">
                      Payment Completed
                    </span>
                  </div>
                  <div className="text-sm text-green-700">
                    <p>
                      Order ID:{" "}
                      {booking?.travellerPayment?.history?.[0]?.linkId ?? "N/A"}
                    </p>
                    <p>
                      Payment ID:{" "}
                      {booking?.travellerPayment?.history?.[0]?.paymentId ??
                        "N/A"}
                    </p>
                    <p>
                      Paid on:{" "}
                      {booking?.travellerPayment?.history?.[0]?.date
                        ? format(
                            new Date(booking.travellerPayment?.history[0].date),
                            "MMM d, yyyy"
                          )
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Commission Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Commission Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="">Owner Commission</span>
                  <span className="font-medium">
                    €{booking.visit.ownerCommission.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="">Traveller Commission</span>
                  <span className="font-medium">
                    €{booking.visit.travellerCommission.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="">Agent Commission</span>
                  <span className="font-medium">
                    €{booking.visit.agentCommission.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.contract && (
                  <div>
                    <p className="text-sm  mb-1">Contract</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {booking.contract}
                    </Button>
                  </div>
                )}

                {booking.note && (
                  <div>
                    <p className="text-sm  mb-1">Booking Notes</p>
                    <p className="text-sm p-3 rounded-lg border border-yellow-200">
                      {booking.note}
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <p>
                    Created: {format(booking.createdAt!, "MMM d, yyyy h:mm a")}
                  </p>
                  <p>
                    Updated: {format(booking.updatedAt!, "MMM d, yyyy h:mm a")}
                  </p>
                  <p>Created by: {booking.createdBy}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
export default BookingPage;
