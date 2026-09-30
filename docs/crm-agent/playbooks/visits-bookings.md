# Visits and bookings

## Overdue visits

**Example questions**

- Show my overdue visits
- How do overdue visits work?

**Answer in brief**

- Overdue visits for your email appear in VisitStatusGate and `/dashboard/visits`.
- Ask can list your overdue visits via the overdue tool — never invent counts.

**Open in dashboard**

- `/dashboard/visits`, `/dashboard/visits/[id]`

**Live Ask tools**

- `getOverdueVisits` (also included in “my team today”)

## Visit statuses

**Example questions**

- What visit statuses exist?

**Answer in brief**

- Typical ops: scheduled, completed, cancelled, no-show, overdue.
- Exact enums live in visit schemas / visitStatus helpers.

## Bookings

**Example questions**

- Where are bookings?
- What is the payment state of a booking?

**Answer in brief**

- Boards: `/dashboard/bookings`, `/dashboard/bookings/[id]`.
- Payment totals: use finance overview / booking UI — do not invent amounts in Ask.

**Open in dashboard**

- `/dashboard/bookings`, `/dashboard/finance`

## Guest rooms

**Example questions**

- Where is the guest window / room list?

**Answer in brief**

- Room list `/dashboard/room/roomlist`, join `/dashboard/room/joinroom`
- Guest window `/dashboard/guest-window`
