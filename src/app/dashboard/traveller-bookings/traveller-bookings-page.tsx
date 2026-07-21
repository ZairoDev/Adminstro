"use client";

import Heading from "@/components/Heading";
import { Toaster } from "@/components/ui/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HandLoader from "@/components/HandLoader";
import { useTravellerBookingsPoll } from "@/hooks/useTravellerBookingsPoll";
import type { TravellerBookingListItem } from "@/types/traveller-booking";
import { Bell, RefreshCw } from "lucide-react";

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStay(start?: string, end?: string) {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "—";
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${s.toLocaleDateString("en-GB", opts)} → ${e.toLocaleDateString("en-GB", opts)}`;
}

function statusClass(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-amber-100 text-amber-900 border-amber-200";
  }
}

function BookingRow({ booking }: { booking: TravellerBookingListItem }) {
  const guest =
    booking.primaryGuestName ||
    booking.traveller?.name ||
    booking.travellers?.[0]?.name ||
    "Guest";
  const service =
    booking.propertyLabel ||
    booking.property?.placeName ||
    booking.property?.propertyName ||
    "Property";

  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50/80 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-stone-900">{guest}</div>
        {booking.traveller?.email ? (
          <div className="text-xs text-stone-500 mt-0.5">{booking.traveller.email}</div>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <div className="text-stone-800">{service}</div>
        {(booking.property?.city || booking.property?.country) && (
          <div className="text-xs text-stone-500 mt-0.5">
            {[booking.property?.city, booking.property?.country]
              .filter(Boolean)
              .join(", ")}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-stone-700 whitespace-nowrap">
        {formatStay(booking.startDate, booking.endDate)}
        {booking.totalNights ? (
          <div className="text-xs text-stone-500 mt-0.5">
            {booking.totalNights} night{booking.totalNights === 1 ? "" : "s"}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusClass(booking.bookingStatus)}`}
        >
          {booking.bookingStatus}
        </span>
        <div className="text-xs text-stone-500 mt-1 capitalize">
          pay: {booking.paymentStatus}
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-stone-900 whitespace-nowrap">
        €{Number(booking.price || 0).toLocaleString("en-IN")}
      </td>
      <td className="px-4 py-3 text-sm text-stone-600 whitespace-nowrap">
        {formatDate(booking.createdAt)}
      </td>
    </tr>
  );
}

export default function TravellerBookingsPage() {
  const {
    bookings,
    totalCount,
    newCount,
    clearNewBadge,
    isLoading,
    isFetching,
    isError,
    refetch,
    polledAt,
  } = useTravellerBookingsPoll({
    enableNotifications: true,
    markSeenOnLoad: true,
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Toaster />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Heading
            heading="Mobile Bookings"
            subheading="Live requests from the Vacation Saga app · polls every 5s"
          />
        </div>
        <div className="flex items-center gap-2">
          {newCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="relative gap-2"
              onClick={clearNewBadge}
            >
              <Bell className="h-4 w-4" />
              New
              <Badge className="ml-1 bg-orange-500 hover:bg-orange-500">
                {newCount}
              </Badge>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh bookings"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
        <span>
          {totalCount} total · showing {bookings.length}
        </span>
        {polledAt ? <span>Last poll {formatDate(polledAt)}</span> : null}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Auto-refresh on
        </span>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <HandLoader />
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-stone-600">
            Couldn&apos;t load traveller bookings.{" "}
            <button
              type="button"
              className="text-orange-600 underline underline-offset-2"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-stone-500">
            No mobile bookings yet. New app reservations will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr className="text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Property</th>
                  <th className="px-4 py-3 font-semibold">Stay dates</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <BookingRow key={String(b._id)} booking={b} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
