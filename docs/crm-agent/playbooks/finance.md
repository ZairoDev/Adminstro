# Finance and payments

## Dashboard

- Overview `/dashboard/finance`
- Transactions `/dashboard/finance/transactions`
- Webhook logs `/dashboard/finance/webhook-logs`
- Legacy advert invoices `/dashboard/invoice`
- Coupons `/dashboard/coupons`

## Models

Finance payments and invoices are stored in finance Mongo models. Razorpay webhook logs capture delivery/processing status. Copilot quotes tool JSON for amounts — never invent totals.

## Mapping payments

Ops map Razorpay payments to bookings via finance services. Failed webhooks are inspected on the webhook-logs page.

## Who can ask

Finance lookup tools are limited to SuperAdmin, Admin, and Developer in Copilot v1.
