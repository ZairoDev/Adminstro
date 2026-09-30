# Finance and payments

## Finance dashboard

**Example questions**

- Where is finance?
- Where are webhook logs?

**Answer in brief**

- Overview `/dashboard/finance`
- Transactions `/dashboard/finance/transactions`
- Webhook logs `/dashboard/finance/webhook-logs`
- Legacy invoices `/dashboard/invoice`, coupons `/dashboard/coupons`

## Finance overview (Ask)

**Example questions**

- Finance overview
- Today’s collection / week collection

**Answer in brief**

- Live aggregates: today / week / month collection, pending mapping, mapped, failed, refunded, revenue, total payments.
- Never invent amounts — only tool results.
- SuperAdmin, Admin, Developer only in Copilot.

**Live Ask tools**

- `getFinanceOverview`

## Transaction or webhook lookup

**Example questions**

- Status of transaction …
- Find Razorpay webhook for event …

**Answer in brief**

- Transaction by id via finance transaction tool.
- Webhook logs by event or payload id (narrow fields).

**Open in dashboard**

- `/dashboard/finance/transactions`, `/dashboard/finance/webhook-logs`

**Live Ask tools**

- `getFinanceTransaction`, `getWebhookLogHint`

## Mapping payments

**Example questions**

- How do we map Razorpay payments?

**Answer in brief**

- Ops map payments to bookings in finance services / UI.
- Failed webhooks: inspect webhook-logs page.
