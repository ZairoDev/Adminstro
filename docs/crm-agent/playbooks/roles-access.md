# Roles and access

## How access works

Next.js middleware (`src/middleware.ts`) maps each employee `role` to allowed path patterns (`roleAccess`). Unauthorized navigations redirect to the role default route.

Sidebar (`src/components/sidebar.tsx`) shows nav items per role. UI hide is not enough — APIs must also authorize.

## Pilot Copilot roles

Default pilot roles for CRM Copilot: SuperAdmin, Sales-TeamLead, HR (override with `CRM_AGENT_PILOT_ROLES`).

## Common role homes

- SuperAdmin — full `/dashboard/*`, WhatsApp, sheets
- HR — people, employees, office-addresses, candidate portal
- Sales / Sales-TeamLead — leads, visits, WhatsApp, sales-offer (team lead broader)
- LeadGen — lead creation and boards
- Advert — owners, properties, invoices, limited WhatsApp retarget
- HAdmin — HolidaySera + limited employee/people
- HCollaborator — HousingSaga collaborator createquery only

## UI flags

Employee `uiFlags.hideGuestManagement` / `hideOwnerManagement` block additional path prefixes even when the role would otherwise allow them.

## Appendix

Run `npm run crm-agent:export-roles` to regenerate a machine-readable role→routes dump into `docs/crm-agent/generated/role-access.json`.
