# People lookup (who is …)

Use this playbook when staff ask about a **person**: employee, hiring candidate, or guest lead by phone.

## Who is this person

**Example questions**

- Who is Priya?
- Find Rahul Sharma
- Lookup staff with email …
- Who is employee ZI-1234?

**Answer in brief**

- Prefer live tool results: name, role or candidate status, email, phone (may be masked), employeeCode, allottedArea, isActive.
- If both an employee and a candidate match, say so and give both deep links.
- Never invent job titles, areas, or status. Never return passwords, PINs, Aadhaar, PAN, bank, OTP, or tokens.

**Open in dashboard**

- Employees: `/dashboard/employee`
- Candidates / People: `/dashboard/people`
- Guest lead (when phone given): `/dashboard/createquery/[id]`

**Live Ask tools**

- `findEmployee` — name, email, phone, employeeCode (role-gated)
- `findCandidate` — HR / SuperAdmin / related roles
- Phone number → lead / offer / owner tools (not this section)

## Employee versus candidate

**Example questions**

- Is this person an employee or still a candidate?
- Difference between employee and candidate?

**Answer in brief**

- **Candidate** — hiring pipeline (pending → interview → … → onboarding). Profile under People.
- **Employee** — has staff login / employeeCode; may still link back to a candidate record.
- **Guest / lead** — traveller Query by phone; not staff.

**Open in dashboard**

- `/dashboard/people`, `/dashboard/employee`

## What Ask never returns about a person

**Example questions**

- Show me their PAN / Aadhaar / bank details

**Answer in brief**

- Copilot refuses secrets and ID/bank fields even if present in Mongo.
- Suggest the secured People / Employee UI for privileged ops that require those fields.

**Agent for writes**

- Hiring actions (schedule interview, create employee, separate) are **not** Ask writes — use People UI.
