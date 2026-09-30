# Glossary

## VSID

**Example questions**

- What is a VSID?
- Meaning of VSID?

**Answer in brief**

- Property identifier on the Properties model used to look up listings.

**Open in dashboard**

- `/dashboard/property`

## Query versus Offer

**Example questions**

- Difference between Offer and Query?
- Is this a Query lead or sales offer?

**Answer in brief**

- **Query** — traveller/guest lead (phoneNo, leadStatus, location).
- **Offer** — sales-offer / subscription pipeline (phoneNumber, offerStatus, platform).
- Searching both is often needed when a phone is ambiguous.

## Good-to-go

**Example questions**

- What does good to go mean?
- Where is the good-to-go board?

**Answer in brief**

- Lead ready for the next commercial step (`leadStatus` active after Good To Go).
- Board: `/dashboard/goodtogoleads`.
- Changing status needs **Agent** mode + Confirm.

## Candidate versus employee

**Example questions**

- Candidate vs employee?
- What is employeeCode?

**Answer in brief**

- **Candidate** — hiring record in People.
- **Employee** — staff account; **employeeCode** is the permanent human id (e.g. ZI-…) set at create.
- **exitedAt** on Candidate marks separation and drives the Exited tab.
- **allottedArea** — locations the employee is allowed to work in CRM boards.

**Open in dashboard**

- `/dashboard/people`, `/dashboard/employee`

## Initiation limit

**Example questions**

- What is WhatsApp initiation limit?

**Answer in brief**

- Cap on how many new outbound WhatsApp conversations a role may start in a window.

**Open in dashboard**

- `/whatsapp`

## PIP

**Example questions**

- What is PIP?

**Answer in brief**

- Performance Improvement Plan on the employee record; may require acknowledgment and can lock access when overdue.

## CRM Copilot

**Example questions**

- What can Copilot do?

**Answer in brief**

- Ask: playbooks for how-to + read-only tools for live lookup and reports.
- Agent: confirm-to-write workflows (disposition, reminders).
- See also `people-lookup.md` for “who is …” questions.
