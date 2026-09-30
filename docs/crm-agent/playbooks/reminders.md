# Reminders

## Two kinds of reminders

**Example questions**

- Difference between personal and lead reminders?
- Where are my reminders?

**Answer in brief**

- **Lead reminder** — Query with `leadStatus: reminder` and a reminder datetime. Board `/dashboard/reminders`.
- **Personal reminder** — your own PersonalReminder docs. Board `/dashboard/my-reminders`.

**Open in dashboard**

- `/dashboard/reminders`, `/dashboard/my-reminders`, `/dashboard/createquery/[id]`

## List my reminders (Ask)

**Example questions**

- My reminders
- Reminders due today

**Answer in brief**

- Ask lists your pending personal reminders and scoped lead reminders (capped).
- Ask never creates or edits reminders.

**Live Ask tools**

- `listMyReminders`

## Create a reminder (Agent)

**Example questions**

- Set a reminder
- Remind me tomorrow

**Answer in brief**

- Switch to **Agent** → personal or lead → when + note → Confirm.
- Confirm runs from server workflow slots (client cannot forge them).

**Agent for writes**

- `set_reminder` workflow
