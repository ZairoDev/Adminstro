# WhatsApp CRM

## Surfaces

Inbox: `/whatsapp`. Channels admin: `/whatsapp/channels`, `/dashboard/whatsapp/channels`. Retarget: `/whatsapp/retarget`. Analytics: `/dashboard/whatsapp-analytics`. Calls: `/whatsapp/calls`.

## Access rules

WhatsApp access is role- and location-scoped (see `docs/whatsapp-architecture-specification.md` and `lib/whatsapp/*`). Advert may only see certain conversation types. Initiation limits apply per role via `/api/whatsapp/initiation-limit`.

## Search

Unified conversation search exists under `/api/whatsapp/search/unified`. Copilot searchWhatsApp finds conversations by phone/name for allowed roles.

## Summaries

Copilot can load recent messages for a conversation and summarize them. It never auto-sends WhatsApp. Draft replies must be copied into the composer by staff.

## Phone masking

Employees may have `whatsappPhoneMask` flags to mask owner or guest phones in UI and Copilot outputs.
