import { Suspense } from "react";
import TravellerBookingsPage from "./traveller-bookings-page";

export default function TravellerBookingsRoute() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <TravellerBookingsPage />
    </Suspense>
  );
}
