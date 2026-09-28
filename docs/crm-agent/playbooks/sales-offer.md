# Sales offer pipeline

## Stages

Sales offer leads flow through:

- New lead `/dashboard/sales-offer`
- Pending `/dashboard/sales-offer/pending-leads`
- Callbacks `/dashboard/sales-offer/callbacks`
- Rejected `/dashboard/sales-offer/rejected-leads`
- Blacklisted `/dashboard/sales-offer/blacklisted-leads`
- Payment complete `/dashboard/sales-offer/payment-complete`
- Templates `/dashboard/sales-offer/templates`
- Import `/dashboard/sales-offer/leads/import`

## Phone check

`POST /api/sales-offer/checkNumberInOffers` checks whether a phone/email already exists in the Offer collection and returns platform availability.

## Offer vs Query leads

Sales offer uses the `Offer` model (subscription / HousingSaga style pipelines). Traveller Query leads are a separate pipeline under createquery boards. Searching both is often required when a phone is ambiguous.
