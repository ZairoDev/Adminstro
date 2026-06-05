export interface PersonalReminderEmailTemplateInput {
  employeeName: string;
  title: string;
  note: string;
  scheduledAtFormatted: string;
  appUrl: string;
}

export function getPersonalReminderEmailTemplate(
  input: PersonalReminderEmailTemplateInput,
): { subject: string; html: string } {
  const subject = `Reminder: ${input.title || "Your scheduled reminder"}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e5ea;overflow:hidden;">
          <tr>
            <td style="padding:32px 28px 8px;">
              <p style="margin:0;font-size:13px;color:#86868b;letter-spacing:0.02em;text-transform:uppercase;">Adminstro Reminder</p>
              <h1 style="margin:12px 0 0;font-size:22px;font-weight:600;color:#1d1d1f;line-height:1.3;">Hi ${escapeHtml(input.employeeName)},</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              <p style="margin:0 0 16px;font-size:15px;color:#424245;line-height:1.5;">Your reminder is due:</p>
              <div style="background:#f5f5f7;border-radius:12px;padding:20px;border:1px solid #e5e5ea;">
                <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:#1d1d1f;">${escapeHtml(input.title)}</p>
                <p style="margin:0 0 12px;font-size:14px;color:#86868b;">${escapeHtml(input.scheduledAtFormatted)}</p>
                <p style="margin:0;font-size:15px;color:#424245;line-height:1.55;white-space:pre-wrap;">${escapeHtml(input.note)}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 32px;">
              <a href="${escapeHtml(input.appUrl)}" style="display:inline-block;background:#0071e3;color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:12px 24px;border-radius:980px;">View in Adminstro</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #e5e5ea;">
              <p style="margin:0;font-size:12px;color:#86868b;">This is an automated reminder from Adminstro.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
