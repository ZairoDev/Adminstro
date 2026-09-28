# HR and People

## Lifecycle phases

From `src/lib/people/lifecycle.ts`:

- **applicant** — no employeeId, not exited, not onboarding status
- **onboarding** — status onboarding (or onboarding complete) without employee
- **active** — employeeId set, exitedAt empty
- **exited** — exitedAt set

Candidate status enum: pending, interview, shortlisted, selected, rejected, onboarding.

## Gates

- Schedule interview: pending, no first interview date
- Select/reject while interview: requires interview remarks (`evaluatedBy`)
- Start onboarding: status selected
- Create employee: onboarding + onboardingComplete + verifiedByHR + no employeeId
- Separate: has employeeId and not exited

## People UI

List tabs: Pipeline, Interviews, Shortlisted, Selected for Training, Rejected, Onboarding, Employed, Exited at `/dashboard/people`. Profile `/dashboard/people/[candidateId]`. Hiring workspace `/dashboard/candidatePortal/[id]` with training-agreement, onboarding, offer-letter subpages.

## Public applicant flows

`/application-form`, `/interview-reschedule`, public training-agreement and onboarding pages (tokenized).

## PIP and warnings

Active employees may receive warnings, PIPs, appreciations. Unacknowledged PIP can block the app via PipAcknowledgmentGate. Overdue PIP can lock the account.
