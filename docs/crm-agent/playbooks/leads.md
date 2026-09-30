# Leads and queries

## Find a guest lead by phone

**Example questions**

- Status of 98XXXXXXXX
- Find lead by phone
- How do I use global lead search?

**Answer in brief**

- Guest leads live in the Query model. Ask with a phone to get live status via lookup tools.
- Header Lead Search uses `POST /api/leads/globalLeadSearch` (regex on phoneNo).
- Deep link after find: `/dashboard/createquery/[id]`.

**Open in dashboard**

- `/dashboard/createquery`, `/dashboard/createquery/[id]`

**Live Ask tools**

- `findLeadByPhone` (also may run offer/owner phone tools)

## Boards and statuses

**Example questions**

- Which board is good to go?
- Where are declined / rejected / reminder leads?

**Answer in brief**

- Create/edit: `/dashboard/createquery`
- Role-base: `/dashboard/rolebaseLead`
- Good to go: `/dashboard/goodtogoleads`
- Declined / rejected / closed / not replying / review: matching `/dashboard/*leads` routes
- Reminders: `/dashboard/reminders` (personal: `/dashboard/my-reminders`)
- Website leads: `/dashboard/website-leads`

## Mark progress (Agent only)

**Example questions**

- How do I mark good to go?
- Move this lead to reject / decline

**Answer in brief**

- Good To Go: fresh → active. Reject from fresh. Decline from active.
- Quality required: Good / Average / Below Average.
- Ask never changes status — switch to **Agent**, confirm plan.
- Executor uses shared disposition rules (not the naive disposition API).

**Agent for writes**

- `apply_disposition` workflow

## Team today and lead stats

**Example questions**

- My team today
- What’s new in leads?
- Lead stats today / this week
- How many fresh leads?

**Answer in brief**

- Team today: overdue visits + today’s counts by status (scoped to your role/email).
- Lead stats: last ~7 days by day and by status — never invent totals.

**Open in dashboard**

- `/dashboard/visits`, `/dashboard/goodtogoleads`, `/dashboard/compareLeads`

**Live Ask tools**

- `getTeamTodayReport`, `getDailyLeadStats`, `getLeadStatusCounts`

## Duplicates

**Example questions**

- Can I create another lead for the same phone?

**Answer in brief**

- Check phone first (global search / checkNumber). Prefer merging into the existing Query.
