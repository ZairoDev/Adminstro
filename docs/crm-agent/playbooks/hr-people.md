# HR and People

## Hiring update today

**Example questions**

- Hiring update
- What’s new in hiring?
- Candidate pipeline / funnel stats
- How many candidates in onboarding?

**Answer in brief**

- Ask returns counts by candidate status: pending, interview, shortlisted, selected, rejected, onboarding.
- Also linked active employees vs exited (from candidate records).
- Numbers come only from the hiring pipeline tool — never invent totals.

**Open in dashboard**

- `/dashboard/people`

**Live Ask tools**

- `getHiringPipelineSummary`

## Lifecycle in plain language

**Example questions**

- What are candidate lifecycle phases?
- When can HR create an employee from a candidate?

**Answer in brief**

- **Applicant** — in pipeline, not employed, not exited.
- **Onboarding** — status onboarding, not yet an employee.
- **Active** — employeeId set, exitedAt empty.
- **Exited** — exitedAt set.
- Status enum: pending, interview, shortlisted, selected, rejected, onboarding.
- Create employee only when onboarding is complete, verified by HR, and no employeeId yet.

**Open in dashboard**

- `/dashboard/people`, `/dashboard/people/[candidateId]`, `/dashboard/candidatePortal/[id]`

## Hiring gates

**Example questions**

- Can I schedule an interview?
- Can I start onboarding?
- When can I reject after interview?

**Answer in brief**

- Schedule interview: pending, no first interview date.
- Select/reject while in interview: needs interview remarks (`evaluatedBy`).
- Start onboarding: status selected.
- Separate staff: has employeeId and not exited.

**Open in dashboard**

- `/dashboard/people`, hiring workspace under `/dashboard/candidatePortal/[id]`

## Find a candidate

**Example questions**

- Find candidate Priya
- Search candidate by phone or email

**Answer in brief**

- Ask returns narrow profile fields only (name, contact, status, position) — no bank/ID secrets.
- Prefer “who is …” which also checks employees when your role allows.

**Open in dashboard**

- `/dashboard/people`

**Live Ask tools**

- `findCandidate`, and often `findEmployee` on the same “who is” question

## PIP and warnings

**Example questions**

- What is PIP acknowledgment?
- Why is someone locked for PIP?

**Answer in brief**

- Active employees may get warnings, PIPs, appreciations.
- Unacknowledged PIP can block the app; overdue PIP can lock the account.
- Ask does not change PIP state — use employee / People UI.

**Open in dashboard**

- `/dashboard/employee`, `/dashboard/people`

## What Copilot will not do in Ask

**Answer in brief**

- No create employee, schedule interview, start onboarding, or separate staff from chat.
- No passwords, mobile PINs, Aadhaar, PAN, bank/IFSC, OTP, JWT.
