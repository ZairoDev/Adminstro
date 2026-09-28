# Optional CI job fragment for CRM Copilot
# Run on PRs that touch src/services/crm-agent or docs/crm-agent:
#
# - npm run test:crm-agent
# - npm run crm-agent:eval
# - npm run crm-agent:export-roles
#
# Live RAG eval (nightly staging only):
# CRM_AGENT_EVAL_LIVE=true npm run crm-agent:eval
#
# Kill switch drill: CRM_AGENT_ENABLED=false → /api/crm-agent/status returns enabled:false
