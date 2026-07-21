"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Smartphone } from "lucide-react";
import { useTravellerBookingsPoll } from "@/hooks/useTravellerBookingsPoll";
import { cn } from "@/lib/utils";

/**
 * Compact sidebar entry with live unread badge for mobile traveller bookings.
 * Drop into Booking Management routes or render beside the Hotel bookings link.
 */
export function TravellerBookingsNavItem({
  showText = true,
  onNavigate,
}: {
  showText?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname?.startsWith("/dashboard/traveller-bookings");
  const { newCount, clearNewBadge } = useTravellerBookingsPoll({
    enableNotifications: !active,
    markSeenOnLoad: false,
  });

  return (
    <Link
      href="/dashboard/traveller-bookings"
      onClick={() => {
        clearNewBadge();
        onNavigate?.();
      }}
      className={cn(
        "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-orange-50 text-orange-700 font-semibold"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
      )}
    >
      <Smartphone size={18} />
      {showText ? <span>Mobile Bookings</span> : null}
      {newCount > 0 && !active ? (
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
          {newCount > 9 ? "9+" : newCount}
        </span>
      ) : null}
    </Link>
  );
}
