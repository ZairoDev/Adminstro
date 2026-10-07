# Payment to booking mapping

The operating procedure is:

1. Create the booking in Adminstro.
2. In Razorpay, create a manual payment link and email that link to the customer.
3. The customer pays.
4. The Razorpay webhook captures the payment and creates the finance entry.
5. Someone manually maps that payment to the booking.

The webhook entry works. The manual map is the step that is supposed to connect the money to the booking, and that step is the one that fails for a link created in Razorpay.

The email does not carry the booking into our database. The webhook only receives what Razorpay sends about the payment. A link made by hand in Razorpay does not contain our booking number unless someone typed it into Razorpay’s notes. The booking itself never stores that link id. So when the paid entry appears, the system has a payment and, separately, a booking, and nothing has joined them yet.

No production data was queried. This is from the code path only.

## The flow, step by step

### 1. Create the booking

This works. The booking gets a number, `BI-xxxx`, and a long database id.

The form does not save a guest. The “Final Amount” box on the form is ignored. A new booking therefore has an amount and a person only if those were typed into the traveller fields that the database actually keeps. For the map step later, the missing guest matters more than the amount.

### 2. Create the manual payment link in Razorpay and email it

Razorpay creates the link and the email sends it to the customer. Our app is not in this step when the link is made in the Razorpay dashboard.

Nothing on the booking is updated. The link id is not saved on the booking. The booking number is not saved on the link. The customer can still pay. We just cannot tell, from the link alone, which booking it was for.

There is a second button on the booking page that creates a Razorpay link from inside Adminstro and sends its own email. That button does write the booking id onto the link and the link id onto the booking. The procedure above does not use that button. A dashboard link skips it.

### 3. Webhook captures the payment and creates the entry

This works. `payment_link.paid` or `payment.captured` is stored as a finance transaction. The amount, the Razorpay payment id, and the link id are on that row.

The row is always saved as unmapped. The webhook deletes any booking id before it writes the entry, so the capture never attaches the booking by itself.

The webhook then looks for a booking that already has this link id on a guest. A manual Razorpay link was never written onto a guest, so that lookup finds nothing. The booking stays unpaid. The finance entry is the only record of the money.

### 4. Manually map the booking to that payment

This is the join. It does not work reliably for this procedure.

The map screen has to pick a guest on a booking. It cannot attach a payment to a booking id with no guest. Search only lists guests. A booking created in step 1 has no guests, so searching `BI-xxxx` finds the booking and then shows nobody. The map cannot be saved.

When a guest does exist, the suggestion list still will not offer that booking from the payment itself. The link id is not on the booking, and the Razorpay notes do not contain our booking id. The list falls through to phone, then name and email. Those match a guest only if the phone or email on the Razorpay payment was already typed onto a guest. The lead’s phone and email were not copied onto the booking.

The id printed at the top of the booking page is the long database id, not `BI-xxxx`. Pasting that id into the map search does not find the booking.

If a guest is selected and the map succeeds, only the finance row changes. It stores `BI-xxxx` and that guest. The booking’s paid total stays where the webhook left it, which for a manual link is unpaid. The map click does not post the amount onto the booking. The invoice step is what later writes the amount, and it needs the guest id the map stored. If another link is generated from the booking page after that, the guest id is replaced and the invoice says the guest was not found.

## Verdict

| Step | Status |
| --- | --- |
| Create the booking | Works. No guest is saved, so the later map has nobody to select. |
| Manual Razorpay link, emailed to the customer | Works in Razorpay. Our booking is not updated, and the link does not store `BI-xxxx`. |
| Webhook captures the payment | Works. A finance entry is created, unmapped. The booking stays unpaid. |
| Manually map that payment to the booking | Fails when the booking has no guest. When a guest exists, the payment does not suggest the booking on its own, and a successful map still does not mark the booking paid. |

The capture-and-then-map procedure is the right operations sequence. The code only completes it when the booking already has a guest whose phone or email matches the Razorpay payment, and someone selects that guest. The paid amount still has to be written onto the booking by a later invoice, not by the map itself.

## What staff see when a flaw hits

- The webhook entry appears in Finance as unmapped. That part matches the current code. The map is required.
- Opening that payment shows no booking suggestion.
- Searching the id from the booking page shows no guest.
- Searching `BI-xxxx` shows no guest when the booking was created without one, so Map stays disabled.
- After a map that does go through, the booking still says pending.
- Invoice generation says “Guest not found” if a new in-app payment link replaced the guests after the map.

## The outcome we want

One payment belongs to one booking and one guest, and it is counted once.

The traveller on the lead is already a guest on the booking before anyone is emailed a link. The webhook still creates the finance entry. The manual map is what attaches that entry to `BI-xxxx` and to that guest, and the same action posts the amount onto the booking once. A later invoice must not add it again. A link created in the Razorpay dashboard has no booking number on it, so the map has to find the booking by `BI-xxxx`, phone, or email.

## Changes

Do them in this order. Later changes assume the earlier ones are in place.

### 1. Put the traveller on the booking when the booking is created

**Problem.** Good to go and the visit never copy the traveller forward. The booking form then saves fields the database ignores, so a new booking has no guest, no property, and often an amount due of 0.

**Change.**

- In `src/app/dashboard/visits/booking-modal.tsx`, send the schema’s real fields:
  - `travellerPayment.finalAmount` from the Final Amount the agent types (stop sending a separate top-level `finalAmount`).
  - `ownerPayment.totalAmount` and `ownerPayment.amountReceived` (today the form sends `finalAmount` and `amountRecieved`, which the schema drops).
  - `propertyName` and `address` from the visit / lead.
  - `propertyId` copied from the visit.
  - One guest built from the lead: `name`, `email`, `phone` (from `phoneNo`).
- In `src/models/booking.ts`, add `propertyId` (string, same as the visit). Keep `propertyName` and `address`.
- In `src/app/api/bookings/addBooking/route.ts`, reject the create when `travellerPayment.finalAmount` is missing or not greater than 0, and when the lead guest has no name. Keep storing `Query.bookingId` as the booking’s Mongo id so the lead still points at the booking document. Also store the human number on the lead only as a display helper if needed later; do not replace the existing ObjectId reference.

**What this fixes.** A booking exists with a real amount and a real person before any payment link is sent. Phone and email search in finance can find that person. Property can be copied onto the payment when it is mapped.

### 2. Make the payment link about one guest

**Problem.** The payment dialog is given the lead’s phone and email, then ignores them. The guest row starts empty. For a full or partial payment, every guest is saved with the same link and the full amount due. History records only the first guest’s email. A failed split link shifts the remaining links onto the wrong people.

**Change.**

- In `src/components/razorpayButton.tsx`, open the dialog with guests already filled from the booking. If the booking has no guests yet, start with the lead (name, email, phone). Do not start from a blank row.
- In `src/app/api/payment-link/route.ts`:
  - Full, partial, and remaining: attach the link to the guest who is being charged (the lead guest, or the guest the agent selected). Leave the other guests’ existing links alone. Set `amountDue` on that guest to the amount this link is collecting, not a copy of the whole charge on every guest.
  - Write one history row whose `paidBy` is that guest’s email.
  - Update guests in place. Match an existing guest by email, then by phone. Keep their `_id`. Do not replace the whole `guests` array.
  - Split: one link per guest, and only save a guest’s link after Razorpay returns an id. If one guest fails, do not assign another guest’s link to them.
  - Stop sending `paymentType: "remaining"` into the booking enum. Store `partial` on the booking when the link is for the leftover balance. The button can still say “Remaining” in the UI.
  - Keep Razorpay notes as strings: `bookingObjectId` (Mongo id), `bookingId` (`BI-xxxx`), `guestEmail`, `guestName`, and `guestId` (the guest subdocument id).

**What this fixes.** One link points at one person. Suggestions stop listing every guest as an exact match. Generating a second link does not erase the guest id finance already stored. A remaining-balance link can be saved later, because the booking no longer holds a value its schema rejects.

### 3. Let Razorpay payments arrive already pointing at the booking

**Problem.** When a payment comes in, we delete `bookingId`, `bookingObjectId`, and `guestId` before saving. Every payment looks unmapped. If the payment’s own notes are an empty object, we never read the notes on the payment link, which are the ones that contain the booking. A `payment.captured` event often has no payment-link object, so the booking is not updated even though we could read the link id from the payment description.

**Change.**

- In `src/services/finance/razorpayWebhookParser.ts`, if `payment.notes` has no `bookingObjectId`, use the payment-link notes. Read `guestName` as the customer name when `customer_name` is absent. Treat an empty email on the payment the same way: use the email on the link customer.
- In `src/services/finance/razorpayWebhookService.ts`, when the parsed notes contain `bookingObjectId` and that booking exists, set `bookingId`, `bookingObjectId`, and `guestId` on the finance payment and set `mapped: true` with `mappedBy: "razorpay-notes"`. Do this only when the payment is not already mapped, so a human remap is not overwritten by a later webhook.
- Pass the parsed link id (including one recovered from the description) into `syncBookingFromPaymentLink`, not only `payment_link.entity.id`.

**What this fixes.** A payment created from our link shows up in finance already attached to `BI-xxxx` and the guest. Staff only open the map dialog when the notes are missing or wrong. Capture events update the booking as well as the finance row.

### 4. Suggest one guest, and accept the id staff can see

**Problem.** “Exact payment link” returns every guest who shares the link. Search does not understand the Mongo id printed on the booking page. The payer email stored in notes is ignored whenever a link match exists.

**Change.** In `src/services/finance/financePaymentService.ts`:

- If notes include `guestId` or `guestEmail`, rank that guest first and do not mark the others as the same exact match.
- When several guests still share a link, label only the matching guest as the exact match. Show the others as weaker matches.
- In manual search, also match a 24-character hex string against the booking `_id`, and match `BI-xxxx` as today.
- On `src/app/dashboard/bookings/[id]/page.tsx`, show `booking.bookingId` (`BI-xxxx`) as the booking id. The Mongo id can stay as a secondary detail. Staff then search with the same number finance uses.

**What this fixes.** The map dialog opens on the person who was sent the link. Pasting the id from the booking page finds that booking.

### 5. Count each payment once, on the guest who was mapped

**Problem.** Mapping updates only the finance record. The booking’s pre-save hook assigns money by email, so the first guest is marked paid even when finance mapped someone else. Invoice generation adds another paid history row for the same Razorpay payment, and the hook adds both.

**Change.**

- In `src/models/booking.ts`, build `amountPaid` from history rows with status `paid`, and skip a row when the same `paymentId` or the same `linkId` was already counted. Apply a row to the guest whose email matches `paidBy`. If `paidBy` is missing, do not spread that money across guests.
- In `src/services/finance/bookingLedgerService.ts`, before pushing a history row, look for an existing row with the same `paymentId` or `linkId`. Update that row to `paid` and set `paidBy` to the mapped guest’s email. Do not push a second row.
- After `mapPayment` in `src/services/finance/financePaymentService.ts`, if this payment id or link id is already on the booking history, set that history row’s `paidBy` to the mapped guest and save the booking so the pre-save hook moves the money to that guest. If the payment is not on the booking yet, leave the booking alone until the webhook or the invoice step writes it. Mapping must not invent a second copy.

**What this fixes.** The guest finance selected is the guest the booking shows as paid. The received total equals the Razorpay amount, including after an invoice is generated.

### 6. Store the booking id on the invoice, and the property on the payment

**Problem.** The finance invoice saves the guest’s id in `bookingObjectId`, so an invoice cannot be looked up by booking. The booking has no `propertyId` or `ownerId`, so a mapped payment never receives them. The visit already has `propertyId`.

**Change.**

- In `src/services/finance/invoiceGenerationService.ts`, set `bookingObjectId` to the booking’s Mongo id (`payment.bookingObjectId`). Keep `guestId` in `guestId`.
- Once change 1 has copied `propertyId` onto the booking, `mapPayment` can keep copying `propertyId` onto the finance payment. Owner id stays empty until the booking has an owner id; do not invent one from the owner name string.

**What this fixes.** Invoices join back to the booking. A mapped payment carries the property the visit was for.

## What each change is responsible for

| Change | Staff-visible result |
| --- | --- |
| 1. Traveller on the booking | The booking has a guest and a real amount before any link is sent. |
| 2. One link, one guest | Suggestions point at the person who was asked to pay. Guest ids survive the next link. Remaining-balance links can be saved. |
| 3. Auto-map from Razorpay notes | Payments from our links arrive already attached to `BI-xxxx`. |
| 4. One suggestion, visible booking number | The map dialog and the booking page use the same id, and one guest is the exact match. |
| 5. Count the payment once | Booking received amount matches Razorpay, on the mapped guest, after invoice generation too. |
| 6. Invoice and property ids | An invoice can be opened from the booking, and the payment knows the property. |

## Done when

- Creating a booking from a visit saves the lead as a guest, the visit’s property id, and `travellerPayment.finalAmount` greater than 0.
- A full payment link updates only that guest’s `linkId`. Other guests do not get the same link.
- Regenerating a link keeps the same guest `_id` when the email matches.
- A Razorpay `payment_link.paid` or `payment.captured` for that link sets the finance payment to mapped, with `bookingId` equal to `BI-xxxx`.
- The booking received total equals that payment once, and the mapped guest’s `amountPaid` includes it.
- Generating an invoice does not increase the booking total a second time.
- The invoice’s `bookingObjectId` is the booking Mongo id.
- The booking page heading shows `BI-xxxx`, and finance search finds the booking from that number and from the Mongo id.

## Files to touch

- `src/app/dashboard/visits/booking-modal.tsx`
- `src/app/api/bookings/addBooking/route.ts`
- `src/models/booking.ts`
- `src/models/visit.ts` (read `propertyId`; no schema change required if the string is only copied)
- `src/components/razorpayButton.tsx`
- `src/app/api/payment-link/route.ts`
- `src/services/finance/razorpayWebhookParser.ts`
- `src/services/finance/razorpayWebhookService.ts`
- `src/services/finance/syncBookingFromPaymentLink.ts`
- `src/services/finance/financePaymentService.ts`
- `src/services/finance/bookingLedgerService.ts`
- `src/services/finance/invoiceGenerationService.ts`
- `src/app/dashboard/bookings/[id]/page.tsx`

## Out of scope

This plan does not backfill old payments. Existing finance rows stay unmapped until someone maps them, or until a later one-off script reads Razorpay notes and applies change 3 to rows that are still unmapped. Guest ids already thrown away by an old link cannot be recovered; those payments have to be mapped again by `BI-xxxx` and email.
