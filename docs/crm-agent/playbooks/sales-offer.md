# Sales offer pipeline

## Stages and boards

**Example questions**

- What are sales offer pending leads?
- Where is sales offer payment complete?

**Answer in brief**

- New `/dashboard/sales-offer`
- Pending `/dashboard/sales-offer/pending-leads`
- Callbacks `/dashboard/sales-offer/callbacks`
- Rejected `/dashboard/sales-offer/rejected-leads`
- Blacklisted `/dashboard/sales-offer/blacklisted-leads`
- Payment complete `/dashboard/sales-offer/payment-complete`
- Templates `/dashboard/sales-offer/templates`
- Import `/dashboard/sales-offer/leads/import`

## Phone already in sales offer

**Example questions**

- Is this phone already in sales offer?
- Check number in offers

**Answer in brief**

- `POST /api/sales-offer/checkNumberInOffers` checks Offer collection + platform availability.
- Ask with a phone runs `findOfferByPhone` for allowed roles.

**Live Ask tools**

- `findOfferByPhone`

## Offer versus Query

**Example questions**

- Difference between Offer and Query?

**Answer in brief**

- Offer = subscription / sales-offer pipeline.
- Query = traveller guest leads on createquery boards.
- Ambiguous phones often need both searches.
