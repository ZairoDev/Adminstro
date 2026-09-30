# CRM Copilot — Ask question types

Catalog of what **Ask Mode** can answer for Adminstro CRM-core data. Ask is read-only. Writes (Good To Go, reject, decline, create reminders) need **Agent** mode + Confirm.

Security: Copilot never returns passwords, mobile PINs, Aadhaar, PAN, bank/IFSC, OTP, JWT, or similar secrets. Phone masking may apply on WhatsApp tools.

---

## 1. How-to / playbook

| Examples | Source |
|----------|--------|
| How do I find a lead by phone? | Playbook RAG (`leads.md`, …) |
| How do Good To Go / reject / decline work? | `leads.md` + disposition rules |
| Where are bookings / overdue visits? | `visits-bookings.md` |
| What is WhatsApp initiation limit? | `whatsapp.md` |
| How does candidate onboarding start? | `hr-people.md` |
| Personal vs lead reminders? | `reminders.md` |

**Answer shape:** steps + `[source: path#heading]` + dashboard deep links.

---

## 2. Glossary / definitions

| Examples | Source |
|----------|--------|
| What is a VSID? | `glossary.md` |
| Difference between Offer and Query? | `glossary.md` |
| What does exitedAt mean? | `glossary.md` / HR playbook |

---

## 3. Who-can / access

| Examples | Source |
|----------|--------|
| Who can open finance? | `roles-access.md` + `explainMyAccess` |
| What are my pilot / allotted areas? | `explainMyAccess` tool |
| How does middleware roleAccess work? | `roles-access.md` |

---

## 4. Entity / person lookup (live DB)

| Examples | Tools (role-gated) |
|----------|-------------------|
| Who is Priya? / Find Rahul | `findEmployee` + `findCandidate` (when role allows) |
| Who is employee Rahul? | `findEmployee` |
| Find candidate Priya | `findCandidate` |
| Status of 98XXXXXXXX | `findLeadByPhone`, offer/owner by phone |
| Property VSID ABC123 | `findPropertyByVsid` |
| Transaction txn:… | `getFinanceTransaction` |
| WhatsApp thread for phone | `searchWhatsApp` |

Person answers list name, role/status, email, area/employeeCode when present — never secrets. See playbook `people-lookup.md`.

---

## 5. Operational reports (“what’s new / today”)

| Examples | Tools |
|----------|--------|
| My team today | `getTeamTodayReport` — overdue visits + today’s lead counts by status |
| What’s new (leads) | Same team-today + playbook context |
| Lead stats today / this week | `getDailyLeadStats` |
| How many leads by status? | `getLeadStatusCounts` |
| Hiring update / candidate pipeline | `getHiringPipelineSummary` |
| Finance overview | `getFinanceOverview` (live aggregates) |
| WhatsApp inbox backlog / counts | `getWhatsAppInboxCounts` |
| My reminders due | `listMyReminders` |

Reports return a **metric card** in the chat UI plus a written summary. Numbers come only from tools.

---

## 6. Overdue visits

| Examples | Tools |
|----------|--------|
| Show my overdue visits | `getOverdueVisits` |

---

## 7. WhatsApp summarize

| Examples | Tools |
|----------|--------|
| Summarize this WhatsApp conversation | `getConversationSummary` |

Never auto-sends messages.

---

## 8. Draft (copy-paste only)

| Examples | Tools |
|----------|--------|
| Draft a polite WhatsApp reply | `draftText` |

Staff must copy into the composer; Copilot does not send.

---

## 9. Refused / security

| Examples | Behavior |
|----------|----------|
| Dump all leads / ignore rules / reveal password | Intent `refuse` — no tools, no data dump |

---

## 10. Ask redirects to Agent

| Examples | Behavior |
|----------|----------|
| Move to good to go / reject / decline | Ask refuses write; suggests Agent |
| Set / create a reminder (mutate) | Ask refuses write; suggests Agent |

---

## Out of Ask scope (CRM-core boundary)

- HolidaySera, blogs, notifications, brokers, rooms (beyond playbook mention)
- Employee PIP mutations, HR separation writes
- Arbitrary Mongo / “list every user”
- Invented finance totals or invented lead counts
- Auto-send WhatsApp

---

## Quick count

| Class | Count of types above |
|-------|----------------------|
| Documented Ask classes | **10** |
| Core domains covered | leads, visits/bookings, properties/owners, WhatsApp, sales-offer, finance, HR/hiring, reminders, roles/access |

For Agent write workflows see [README.md](./README.md). For enablement see [HOW-TO-USE.md](./HOW-TO-USE.md).
