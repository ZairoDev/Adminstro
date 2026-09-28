# Leads & queries

## Pipeline overview

Adminstro stores guest/traveller leads mainly in the `Query` model. Staff create and edit leads from `/dashboard/createquery` and work boards such as role-base leads, good-to-go, declined, rejected, closed, not-replying, review, and reminders.

## Global lead search

Use the header Lead Search (or ask Copilot with a phone number). It calls `POST /api/leads/globalLeadSearch` and matches `phoneNo` with a case-insensitive regex. Deep link after find: `/dashboard/createquery/[id]`.

## Common statuses and boards

- **Create / edit:** `/dashboard/createquery`, `/dashboard/createquery/[id]`
- **Role-base / location boards:** `/dashboard/rolebaseLead`
- **Good to go:** `/dashboard/goodtogoleads`
- **Declined / rejected / closed / not replying / review:** matching `/dashboard/*leads` routes
- **Reminders:** `/dashboard/reminders`, personal `/dashboard/my-reminders`
- **Website leads:** `/dashboard/website-leads`
- **Low budget:** `/dashboard/lowBudget`

## How to mark progress

Disposition and status updates go through sales/lead APIs (`queryStatusUpdate`, disposition routes). Only roles with lead access (Sales, Sales-TeamLead, LeadGen, Advert, SuperAdmin, etc.) should change status. Copilot will not auto-change status without a confirmed write proposal.

## Claiming and duplicates

Before creating a lead, check the phone with sales `checkNumber` flows and global search. Duplicate phones should be merged into the existing query instead of creating a second record.

## What Copilot can answer

- How to find a lead by phone
- Which board a disposition belongs on
- What global search does
- Live status when a phone is provided (via lookup tools)
