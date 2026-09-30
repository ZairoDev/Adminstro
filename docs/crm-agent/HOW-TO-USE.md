# How to use CRM Copilot

## Enable

1. Copy `.env.crm-agent.example` keys into your environment.
2. Set `CRM_AGENT_ENABLED=true` on staging (keep `false` in production until pilot).
3. Set `GROQ_API_KEY` and optional `CRM_AGENT_PILOT_ROLES`. Chat model defaults to `openai/gpt-oss-120b` (`CRM_AGENT_MODEL`). Restart the server after changing `.env` — Next.js does not hot-reload env vars.
4. Index playbooks: `npm run crm-agent:index` (re-run after any playbook edit so Ask RAG stays fresh).
5. Optional: `npm run crm-agent:export-roles`

## Ask vs Agent

Use the **Ask | Agent** toggle in the orange chat drawer (bottom-right).

### Ask (default)

- How-to: “How do I find a lead by phone?”
- Person: “Who is Priya?” / “Find Rahul”
- Lookup: “Status of 98XXXXXXXX”
- Access: “Who can open finance?”
- Reports: “My team today”, “hiring update”, “lead stats this week”, “finance overview”, “inbox backlog”, “my reminders”
- Draft: “Draft a WhatsApp reply thanking the guest”

Ask **never** changes lead status. If you say “move to good to go” in Ask, Copilot tells you to switch to Agent.

Full catalog: [QUESTION-TYPES.md](./QUESTION-TYPES.md).

### Agent (write roles via `CRM_AGENT_WRITE_ROLES`)

- “Move lead to good to go” → asks phone → quality (Good / Average / Below Average) → Confirm
- “Reject this lead” / “Decline this lead” → reason chips → Confirm
- “Set a reminder…” → personal or lead reminder → Confirm
- “My team today” also works in Ask (report tools); Agent can still run the same report workflow

Confirm loads the workflow from the server conversation. HR can use Ask; disposition writes require roles in `CRM_AGENT_WRITE_ROLES` (default SuperAdmin, Sales-TeamLead).

## Kill switch

Set `CRM_AGENT_ENABLED=false` and restart — chat API returns 403 and the drawer hides via `/api/crm-agent/status`.

## Audit

SuperAdmin/Developer: `GET /api/crm-agent/audit?limit=50`

## Eval

`npm run crm-agent:eval` — how-to suite (30 cases, ≥70% pass).  
`npm run crm-agent:eval:agent` — Agent Mode golden checks.  
Live RAG: `CRM_AGENT_EVAL_LIVE=true npm run crm-agent:eval` after indexing.

## Tests

`npm run test:crm-agent`
