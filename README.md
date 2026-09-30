# WhatsApp and employees

WhatsApp is not a personal inbox. A chat is visible when the logged-in **employee** passes every gate below. The employee document is the source of those gates. `assignedAgent` on a conversation is ownership for retarget handover and analytics. It does not decide who sees the normal inbox.

## How an employee is wired in

Login (`/api/employeelogin`) puts these fields on the session token. Every WhatsApp page and API reads them from that token, then re-checks the employee record where the value can change (phone mask).

| Employee field | What it controls on WhatsApp |
| --- | --- |
| `role` | Which pages open, which channel types appear, which actions exist |
| `allotedArea` | Which cities, and therefore which business phone lines, the employee can use |
| `rentalType` | Short Term vs Long Term threads. Empty means Long Term |
| `whatsappPhoneMask.maskOwnerPhones` | Hide owner phone numbers (last 4 digits stay visible) |
| `whatsappPhoneMask.maskGuestPhones` | Hide guest phone numbers the same way |
| `email` | One coordinator address can assign city and open the admin queue |
| `isActive` | Inactive employees are skipped for inbound notifications |
| `_id` | Stamped as `guestInitiationAgentId` for the daily new-guest cap, and as `assignedAgent` on retarget handover |

`uiFlags.hideGuestManagement` and `hideOwnerManagement` hide CRM pages. They do not filter the WhatsApp inbox.

## End-to-end flow

```
Meta webhook
    → conversation stored (phone line, city, rental type, channel type, handedToSales)
    → active employees in WhatsApp roles are loaded
    → each employee is tested with the same visibility rules as the inbox
    → matching employees get a socket event and a mobile push

Employee opens /whatsapp
    → middleware allows the path only if roleAccess includes it
    → inbox query = phone line AND city AND rental type AND channel type AND LeadGen/Sales handoff
    → opening, sending, calling, and disposition run canAccessConversationAsync again
```

Surfaces:

| Surface | Path | Who can open the page |
| --- | --- | --- |
| Inbox | `/whatsapp` | SuperAdmin, Developer, Sales, sales-intern, Sales-TeamLead, LeadGen, LeadGen-TeamLead, Advert |
| Retarget campaigns | `/whatsapp/retarget` | SuperAdmin, Sales, Advert |
| Retarget-only inbox | `/whatsapp?retargetOnly=1` | Sidebar link for SuperAdmin and Advert |
| Call history page | `/whatsapp/calls` | sales-intern (the call API itself still checks conversation access) |
| Analytics | `/dashboard/whatsapp-analytics` | SuperAdmin, Admin, Sales, Sales-TeamLead. Developer can open it because their middleware allows every `/dashboard` path. The API also allows Developer |
| Channel admin | `/dashboard/whatsapp/channels` and `/whatsapp/channels` | Page: SuperAdmin (Developer can hit the dashboard URL). Create, edit, and migrate: SuperAdmin only |

Roles with no WhatsApp page: HR, Content, Guest, Intern, Subscription-Sales, hSale, HAdmin, Agent, Sales(New), HCollaborator.

Admin is a special case. The access code treats Admin as full inbox access, but middleware does not list `/whatsapp` for Admin. Admin can open analytics. Admin cannot open the inbox unless the path list is changed.

## Visibility rules (every inbox, search, send, call, and notification)

A normal chat is shown only when all of these pass. Code: `src/lib/whatsapp/locationAccess.ts`, `access.ts`, `rentalTypeAccess.ts`, `channelTypeAccess.ts`.

1. **Role is allowed.** `WHATSAPP_ACCESS_ROLES` in `src/lib/whatsapp/config.ts`: SuperAdmin, Admin, Advert, Sales, sales-intern, Sales-TeamLead, LeadGen, LeadGen-TeamLead, Developer. Anyone else is rejected, including Subscription-Sales even though that role appears in a few sales helper lists.
2. **Full-access bypass.** SuperAdmin, Admin, and Developer skip city, rental type, and channel type. They see every chat, including chats with no city.
3. **Business phone line.** The conversation’s `businessPhoneId` (or its `whatsappChannelId` after a number change) must belong to a line mapped to the employee’s `allotedArea`. Area `"all"` or `"both"` means every line.
4. **Empty area exception.** If `allotedArea` is empty, Sales, sales-intern, Sales-TeamLead, LeadGen, and LeadGen-TeamLead are given every line and the city check is skipped. Advert with an empty area gets only the retarget phone.
5. **Participant city.** `participantLocationKey` must be one of the employee’s cities. A chat with no city is hidden from area-scoped staff. Those chats are the Admin Queue.
6. **Rental type.** Short Term employees see Short Term and General. Long Term employees see Long Term and General. No `rentalType` on the employee means Long Term. Legacy chats with no rental type stay visible. `sales-intern` sees both terms. SuperAdmin, Admin, Developer, and HAdmin skip this check in code. HAdmin still cannot open the inbox.
7. **Channel type.** See the role table. Legacy chats with no channel type stay visible. Sales, sales-intern, and Sales-TeamLead may also open **owner** threads in their cities even though their default map is guest-only. That is the owner-sheet / add-owner path.
8. **LeadGen handoff.** Plain LeadGen only sees chats they still own (`handedToSales === false`). Sales, sales-intern, Sales-TeamLead, and Subscription-Sales only see chats already handed over (`handedToSales` missing, null, or true). LeadGen-TeamLead, Advert, and full-access roles are not limited by this flag. A new guest chat created by plain LeadGen is stamped `handedToSales: false`.
9. **Internal “You” notes.** `source === "internal"` or phone id `internal-you` is visible to anyone who can open WhatsApp. Those messages never go to Meta.

Search uses the same filter. `assignedAgent` is not part of it.

## Role restrictions

### SuperAdmin

- Every chat, every line, every rental type, every channel type including backup.
- Admin Queue (chats with no city). Inbox city list comes from monthly targets, not `allotedArea`.
- Creates and edits WhatsApp channels.
- Retarget campaigns and retarget inbox.
- Analytics for the whole organisation.
- Sets phone-visibility rules from the inbox menu. Mask flags on their own account are ignored: full-access roles always see full numbers.
- Conversation-type migration button.
- No daily cap on new guest chats.
- On create, may pick Short Term or Long Term. Other staff cannot.

### Developer

- Same conversation visibility as SuperAdmin (full-access role).
- Can open the inbox and, via the dashboard wildcard, analytics and the channels page.
- Cannot save channel changes. That API is SuperAdmin only.
- Cannot open the phone-visibility form. That menu is HR or SuperAdmin, and HR cannot open `/whatsapp`.
- No daily guest cap. Numbers are never masked.

### Admin

- Treated as full access inside WhatsApp services.
- Middleware does not allow `/whatsapp`, `/whatsapp/retarget`, or channel admin.
- Can open `/dashboard/whatsapp-analytics`. Analytics data is unscoped because Admin is full access.

### Sales

- Inbox, retarget page, analytics, notification summary (expiring and unread).
- Channel types: guest, plus owner threads in their cities.
- Rental type follows the employee. Default Long Term.
- City and phone line follow `allotedArea`. Empty area means every line.
- Does not see LeadGen-owned chats until they are forwarded.
- Retarget chats only after stage `handed_to_sales`. If `assignedAgent` is set, it must be this employee. If it is empty, phone-line access is enough.
- Can set the participant city, limited to their own cities.
- **15 new guest conversations per day** (`DAILY_GUEST_INITIATION_LIMIT`). Counted on this employee id. Owner chats, retarget chats, internal notes, and guests who already replied or were confirmed before do not count. Pending and in-flight sends count. Admins are exempt.
- Outside Meta’s 24-hour customer-care window, free text is blocked and a template is required. This applies to every role.

### sales-intern

- Inbox and `/whatsapp/calls`. No retarget page. No analytics page.
- Sees **both** Short Term and Long Term.
- Same LeadGen handoff rule as Sales: only chats already with Sales.
- Same owner-thread exception and same 15-guest daily cap as Sales.
- Retarget visibility matches Sales (`isSalesWhatsAppRole`).
- Cannot assign participant city. That list is Sales, Sales-TeamLead, LeadGen, LeadGen-TeamLead, full-access roles, and the coordinator email.
- Empty `allotedArea` still unlocks every line.

### Sales-TeamLead

- Inbox and analytics. No `/whatsapp/retarget` in middleware.
- Notification summary is allowed (with SuperAdmin and Sales).
- Guest channels, plus owner threads in their cities.
- Sees Sales-owned chats (`handedToSales` not false). Does not see LeadGen-owned chats.
- **Does not see retarget chats.** Retarget access is only Advert (before handover) and Sales / sales-intern / Subscription-Sales (after handover).
- Can assign participant city inside their cities.
- Inbox city dropdown uses the global monthly-target list only for SuperAdmin and LeadGen-TeamLead. Team leads with two or more allotted cities get a filter of those cities.
- No 15-guest daily cap. That cap is Sales, sales-intern, and Subscription-Sales only, and Subscription-Sales cannot open WhatsApp.
- Can open the Admin Queue in code (`canAccessWhatsAppAdminQueue` includes LeadGen-TeamLead, not Sales-TeamLead). Sales-TeamLead does not get that queue.

### LeadGen

- Inbox only. No retarget, no analytics, no call-history page.
- Channel types: guest and support. Not owner. Not backup.
- **Only chats they still own** (`handedToSales === false`). Creating a new guest chat sets that flag.
- Can forward a chat to Sales. After forward, LeadGen loses it and Sales-family roles gain it.
- Can assign participant city inside their cities.
- Rental type and area rules apply. Empty area means every line.
- No daily guest-initiation cap.

### LeadGen-TeamLead

- Inbox and analytics. No retarget page.
- Channel types: guest and support.
- **Not** limited to LeadGen-owned chats. They keep the wider inbox, including Sales-owned threads that match their city, line, and rental type.
- Can still forward a chat that is marked LeadGen-owned.
- Admin Queue: yes.
- Inbox city list is global (monthly targets), same as SuperAdmin.
- Can assign participant city, filtered to their allotted cities when those are set.
- No daily guest cap.

### Advert

- Inbox and retarget campaigns. Sidebar adds “Retarget WhatsApp” (`?retargetOnly=1`).
- Channel types: guest and support. Not owner.
- **Retarget chats only, and only before handover.** Stages `initiated`, `awaiting_reply`, `engaged`. Stage `handed_to_sales` is forbidden on send, even if another check passed.
- Handover API is Advert-only. It assigns `assignedAgent` to a Sales employee.
- Not part of the LeadGen `handedToSales` split.
- Empty `allotedArea` does **not** unlock every line. It unlocks the retarget phone only.
- No analytics. No daily guest cap. No city-assign permission unless their email is the coordinator address.

### HR

- No WhatsApp route in middleware, so HR cannot open the inbox.
- The inbox menu “Phone visibility rules” is coded for HR or SuperAdmin. In practice only SuperAdmin can reach it.
- HR still owns the employee record. `whatsappPhoneMask` on that record is what other roles see.

### Everyone else

Content, Guest, Intern, Subscription-Sales, hSale, HAdmin, Agent, Sales(New), and HCollaborator have no WhatsApp page. API helpers that mention Subscription-Sales or HAdmin do not grant a session. `requireWhatsAppAccess` still returns null for those roles.

## Actions, and who may take them

| Action | Who |
| --- | --- |
| Read and reply in an allowed chat | Any role that passes visibility |
| Send outside the 24h window | Template only, every role |
| New guest outreach | Sales and sales-intern, 15 confirmed/pending/in-flight per day |
| Forward LeadGen chat to Sales | LeadGen and LeadGen-TeamLead |
| Retarget campaign send | SuperAdmin, Sales, Advert. Max 3 attempts per lead, 24h cooldown, blocked leads excluded |
| Hand a retarget chat to a Sales employee | Advert |
| Set participant city | SuperAdmin, Admin, Developer, Sales, Sales-TeamLead, LeadGen, LeadGen-TeamLead, and `sangeetajain549@gmail.com` |
| Admin Queue (no city) | SuperAdmin, Admin, Developer, LeadGen-TeamLead, and that same email |
| Phone mask rules UI | SuperAdmin (HR is allowed in the component, blocked by middleware) |
| See full phone numbers | Full-access roles always. Others follow `whatsappPhoneMask` on their employee row |
| Create or edit channels | SuperAdmin |
| Analytics API | SuperAdmin, Admin, Sales-TeamLead, Sales, Developer. Scoped to `allotedArea` unless the role is full access |
| In-app notification summary | SuperAdmin, Sales-TeamLead, Sales. Still filtered by that employee’s visibility |
| Inbound socket and push | Active employees in WhatsApp roles who pass `canAccessConversationAsync` |
| CRM Copilot WhatsApp search and summary | Same lookup set as the inbox roles, plus Admin. Results are masked when the caller’s phone-mask flags are on. Copilot never sends a message |

## What “connected to the employee” means

- **Visibility** is role + `allotedArea` + `rentalType` + channel type + handoff flag. Two Sales employees in Athens with Long Term see the same Athens Long Term guest chats. They do not each get a private queue.
- **Ownership** is `assignedAgent`. It matters when Advert hands a retarget chat to one Sales employee. Other Sales employees then fail the retarget check for that chat. Analytics groups by this id.
- **Quota** is per employee id, not per role pool. One Sales employee’s 15 new guests do not consume a teammate’s cap.
- **Masking** is per employee. Two people with the same role can see different phone numbers if their `whatsappPhoneMask` flags differ. SuperAdmin, Admin, and Developer never have numbers masked.
- **Notifications** fan out to every active employee who would see that chat, not to a single assignee.

## Code map

| Concern | File |
| --- | --- |
| Role lists and phone lines | `src/lib/whatsapp/config.ts` |
| Page allow-list | `src/middleware.ts` (`roleAccess`) |
| Inbox and city filter | `src/lib/whatsapp/locationAccess.ts` |
| Open, send, notify | `src/lib/whatsapp/access.ts` |
| Rental type | `src/lib/whatsapp/rentalTypeAccess.ts` |
| Channel type | `src/lib/whatsapp/channelTypeAccess.ts` |
| LeadGen → Sales | `src/lib/whatsapp/leadGenHandoff.ts` |
| City assign and admin queue | `src/lib/whatsapp/participantLocationPrivileges.ts` |
| Daily guest cap | `src/lib/whatsapp/initiationLimitService.ts` |
| Phone masking | `src/lib/whatsapp/phoneMask.ts` |
| Who gets a push | `src/lib/whatsapp/notificationRecipients.ts` |
| Employee fields | `src/models/employee.ts` |
| Token at login | `src/app/api/employeelogin/route.ts` |

---

## Earlier updates

1. Added new route: /dashboard/owners

Changes on 14-05-2025

1. 2 new rejection reason (different area, agency fee)
2. Removed area dropdown
3. Revert rejected Lead
4. Pagination

Changes on 17-05-2025

1. Created dashboard (agent specific and location specific leads)
