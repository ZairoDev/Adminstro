# Visits and bookings

## Visits

Visits are scheduled against leads/properties. Dashboard: `/dashboard/visits`, detail `/dashboard/visits/[id]`. Overdue visits are exposed by `GET /api/visits/overdue` for the logged-in user’s email and shown in the VisitStatusGate.

## Status meanings

Visit status enums live under visit schemas / `lib/visits/visitStatus`. Typical ops questions: scheduled, completed, cancelled, no-show, overdue.

## Bookings

Bookings: `/dashboard/bookings`, `/dashboard/bookings/[id]`. Payment state is tracked with booking and finance services — do not invent payment amounts; use finance tools or the booking UI.

## Guest rooms

Collaborative property showcase rooms: `/dashboard/room/roomlist`, join `/dashboard/room/joinroom`. Guest window: `/dashboard/guest-window`.
