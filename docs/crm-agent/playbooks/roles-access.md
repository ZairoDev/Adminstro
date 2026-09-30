# Roles and access

## Who can open a page

**Example questions**

- Who can open finance?
- Who can open People pages?
- What can my role access?

**Answer in brief**

- Middleware maps each employee `role` to allowed path patterns (`roleAccess`).
- Sidebar hides items by role, but APIs must also authorize.
- Ask `explainMyAccess` for your role, pilot list, and allottedArea.

**Open in dashboard**

- Your role’s default home after login

**Live Ask tools**

- `explainMyAccess`

## Pilot Copilot roles

**Example questions**

- Default pilot roles for CRM Copilot?

**Answer in brief**

- Default: SuperAdmin, Sales-TeamLead, HR (override with `CRM_AGENT_PILOT_ROLES`).
- Agent **writes** use `CRM_AGENT_WRITE_ROLES` (default SuperAdmin, Sales-TeamLead).

## Common role homes

**Example questions**

- What can Sales vs HR open?

**Answer in brief**

- SuperAdmin — full dashboard, WhatsApp, sheets
- HR — people, employees, candidate portal
- Sales / Sales-TeamLead — leads, visits, WhatsApp, sales-offer
- LeadGen — lead creation and boards
- Advert — owners, properties, limited WhatsApp retarget

## UI flags

**Example questions**

- Why can’t I see guest or owner management?

**Answer in brief**

- Employee `uiFlags.hideGuestManagement` / `hideOwnerManagement` block extra path prefixes even if the role would allow them.

## Export role map

**Example questions**

- How does middleware roleAccess work?

**Answer in brief**

- Run `npm run crm-agent:export-roles` for `docs/crm-agent/generated/role-access.json`.
