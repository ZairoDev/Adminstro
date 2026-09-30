# WhatsApp CRM

## Open inbox and related surfaces

**Example questions**

- Where is the WhatsApp inbox?
- Where is retarget / analytics / calls?

**Answer in brief**

- Inbox `/whatsapp`
- Channels `/whatsapp/channels`, `/dashboard/whatsapp/channels`
- Retarget `/whatsapp/retarget`
- Analytics `/dashboard/whatsapp-analytics`
- Calls `/whatsapp/calls`

## Access and initiation limit

**Example questions**

- Who can use WhatsApp?
- What is WhatsApp initiation limit?

**Answer in brief**

- Access is role- and location-scoped. Advert sees limited conversation types.
- Initiation limit caps new outbound conversations per role in a window.

**Open in dashboard**

- `/whatsapp`

## Search and summarize

**Example questions**

- Find WhatsApp for 98XXXXXXXX
- Summarize this WhatsApp conversation

**Answer in brief**

- Ask can search by phone/name and summarize recent messages for allowed roles.
- Never auto-sends. Drafts must be copied into the composer.
- Phones may be masked via employee `whatsappPhoneMask` flags.

**Live Ask tools**

- `searchWhatsApp`, `getConversationSummary`, `draftText`

## Inbox backlog (Ask)

**Example questions**

- Inbox backlog
- WhatsApp inbox counts

**Answer in brief**

- Org-level totals (total / owner / guest) for WhatsApp-capable roles.
- Your area-scoped badges in the WhatsApp UI remain the personal source of truth.

**Live Ask tools**

- `getWhatsAppInboxCounts`
