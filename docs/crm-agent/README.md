# CRM Copilot

Internal Adminstro assistant for staff: answer CRM questions, look up live data, and run **Agent Mode** workflows that ask clarifying questions, confirm, then change the CRM.

| Doc | Purpose |
|-----|---------|
| [HOW-TO-USE.md](./HOW-TO-USE.md) | Enable, use, kill switch, eval commands |
| [QUESTION-TYPES.md](./QUESTION-TYPES.md) | **Ask Mode catalog** — what questions Copilot can answer |
| [CI.md](./CI.md) | Test / eval gates |
| [playbooks/](./playbooks/) | RAG knowledge corpus (includes `people-lookup.md`) |
| This README | Product vision, Ask foundation, **Agent Mode v1** |

---

## Principles (do not break these)

1. **RAG for how / who / why** — playbooks and docs, not bulk CRM rows.
2. **Live tools for status / find / counts** — wrap existing APIs; never invent numbers.
3. **Same auth as the UI** — JWT + role + area; tool-level checks.
4. **No silent writes** — Ask mode never mutates; Agent mode always Confirm before write.
5. **Kill switch** — `CRM_AGENT_ENABLED=false` disables chat and drawer.

Embedding the whole Mongo CRM (leads, WhatsApp, finance) is explicitly out of scope.

**LLM stack:** Groq chat (`GROQ_API_KEY`, default `openai/gpt-oss-120b`) + local playbook embeddings (`npm run crm-agent:index`).

---

## What exists today

### Ask foundation (v2)

- Feature flag + pilot roles (`SuperAdmin`, `Sales-TeamLead`, `HR` by default).
- Playbook RAG + in-process cosine retrieval (`CrmAgentKnowledge`), including `reminders.md`.
- Read-only tools: lead/phone, VSID, owner, offer, overdue visits, candidate, employee, access, WhatsApp search/summary/inbox counts, finance overview + txn, reminders list.
- **Report intent:** my team today, hiring pipeline, lead stats, inbox backlog — metric cards + Gemini narrative.
- Drafts (no send).
- Dashboard chat drawer, audit API, rate limits, unit tests + how-to / Agent eval.
- Question catalog: [QUESTION-TYPES.md](./QUESTION-TYPES.md).

### Agent Mode v1

- Ask | Agent toggle in the chat drawer (`mode` on every chat request).
- Multi-turn workflows with slot filling + choice chips + plan Confirm.
- Writes via shared `applyLeadDisposition` (uses `leadDisposition.ts` rules — **not** the naive `/api/leads/disposition` route).
- Workflows: `apply_disposition`, `set_reminder`, `report_my_team_today`.
- Agent **writes** limited to lead-capable roles; HR keeps Ask.

**Stack:** `src/services/crm-agent/`, `src/app/api/crm-agent/`, `src/components/crm-agent/`.

---

## Long-term vision (Cursor for CRM)

| Cursor | Adminstro Copilot |
|--------|-------------------|
| Ask | Read-only Q&A + lookup + summarize |
| Agent | Multi-step workflows + Confirm + execute |
| Diff / accept | Plan card + Confirm / Cancel |
| Tools | Registered CRM tools only (no arbitrary Mongo) |

Eventually: page context, more workflows, report builder, schedules. **Not first:** auto-send WhatsApp, finance/HR exits, bulk updates.

---

# Agent Mode v1

## Modes

| Mode | User can | System will not |
|------|----------|-----------------|
| **Ask** (default) | How-to, lookup, summarize, draft | Change lead status, create reminders via Agent executors |
| **Agent** | Run allowed workflows after Q&A + Confirm | Skip Confirm, invent required fields, exceed role |

Pass `mode: "ask" | "agent"` on `POST /api/crm-agent/chat`. No second env flag for Agent.

## Disposition rules (source of truth)

From `src/lib/leads/leadDisposition.ts`:

- Good To Go = `leadStatus` → `active` (from `fresh`)
- Reject = `rejected` (from `fresh`)
- Decline = `declined` (from `active`)
- Quality **always** required for good_to_go / reject / decline: `Good` | `Average` | `Below Average`
- Executor: `src/services/leads/applyLeadDisposition.ts`

## Workflows

| Id | Slots | Confirm? |
|----|-------|----------|
| `apply_disposition` | phone or leadId; action; leadQualityByReviewer; reason for reject/decline | Yes |
| `set_reminder` | target personal\|lead; phone/leadId if lead; scheduledAt; note | Yes |
| `report_my_team_today` | optional location | No (read-only card) |

### Report metrics

- Overdue visit count for caller email
- Today lead counts by status (fresh / active / reminder / closed / rejected / declined) scoped like sales stats
- Deep links: `/dashboard/visits`, `/dashboard/goodtogoleads`, `/dashboard/reminders`

## API contracts

**Chat** `{ message, conversationId?, mode: "ask"|"agent" }`  
Response may include `ui` (`choices` | `plan` | `report`) and `activeWorkflow`.

**Confirm** `{ conversationId, confirmed: true | false }` — server loads workflow from DB; client cannot forge slots.

## Out of Agent Mode v1

Auto-send WhatsApp, finance mutations, HR separation/PIP, bulk updates, arbitrary Mongo, page context, CSV/PDF, scheduled agents.

## Security checklist

- [x] Auth via `getDataFromToken` on chat + confirm-write
- [x] Ask mode cannot call write executors
- [x] Disposition/reminder role allowlists (lead-capable roles)
- [x] Confirm requires `awaiting_confirm` workflow on conversation
- [x] Audit workflowId / before / after / actor
- [x] Kill switch `CRM_AGENT_ENABLED`

## Agent Mode v1 — shipped

- [x] Ask | Agent toggle + `mode` on chat API
- [x] `apply_disposition` / `set_reminder` / `report_my_team_today`
- [x] Shared `applyLeadDisposition` executor (not naive disposition route)
- [x] Confirm-write executes from conversation `activeWorkflow`
- [x] Unit tests + `npm run crm-agent:eval:agent` (≥80%)
- [x] Pilot write roles via `CRM_AGENT_WRITE_ROLES` (default SuperAdmin,Sales-TeamLead)

## After v1

1. Page context (“this lead”)
2. Draft → WhatsApp composer (no auto-send)
3. More workflows (e.g. revert_to_fresh)
4. Report builder / schedules

---

## Quick links

- [HOW-TO-USE.md](./HOW-TO-USE.md)
- [QUESTION-TYPES.md](./QUESTION-TYPES.md)
- [CI.md](./CI.md)
- [playbooks/](./playbooks/)
- [../../.env.crm-agent.example](../../.env.crm-agent.example)
