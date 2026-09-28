# How to use CRM Copilot

## Enable

1. Copy `.env.crm-agent.example` keys into your environment.
2. Set `CRM_AGENT_ENABLED=true` on staging (keep `false` in production until pilot).
3. Set `GOOGLE_GENERATIVE_AI_API_KEY` and optional `CRM_AGENT_PILOT_ROLES`. Chat model defaults to `gemini-2.5-flash`.
4. Index playbooks: `npm run crm-agent:index`
5. Optional: `npm run crm-agent:export-roles`

## Use in the dashboard

Pilot roles see an orange chat button (bottom-right). Ask:

- How-to: “How do I find a lead by phone?”
- Lookup: “Status of 98XXXXXXXX”
- Access: “Who can open finance?”
- Draft: “Draft a WhatsApp reply thanking the guest”
- Propose write: “Please create a reminder to call this lead tomorrow” (confirm modal)

## Kill switch

Set `CRM_AGENT_ENABLED=false` and restart — chat API returns 403 and the drawer hides via `/api/crm-agent/status`.

## Audit

SuperAdmin/Developer: `GET /api/crm-agent/audit?limit=50`

## Eval

`npm run crm-agent:eval` — heuristic how-to suite (30 cases, ≥70% pass).
Live RAG: `CRM_AGENT_EVAL_LIVE=true npm run crm-agent:eval` after indexing (needs `GOOGLE_GENERATIVE_AI_API_KEY` in `.env`).

## Tests

`npm run test:crm-agent`
