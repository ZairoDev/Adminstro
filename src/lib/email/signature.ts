// Email Signature Template
export interface EmailSignatureConfig {
  name?: string;
  title?: string;
  website?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
}

// Get logo URL - env override, else CDN asset used in signatures
const getLogoUrl = (): string => {
  const envLogoUrl = process.env.NEXT_PUBLIC_LOGO_URL;
  if (envLogoUrl) return envLogoUrl;
  return "https://vacationsaga.b-cdn.net/zairo1.png";
};

export const getEmailSignature = (config?: EmailSignatureConfig): string => {
  const {
    name = "Zairo International",
    title = "HR Manager",
    website = "zairointernational.com",
    email = "hr@zairointl.com",
    phone = "+919519803665",
    logoUrl,
  } = config || {};

  // Split website to highlight "international" in red
  const websiteParts = website.split("international");
  const websiteDisplay =
    websiteParts.length > 1
      ? `${websiteParts[0]}<span style="color: #dc2626;">international</span>${websiteParts[1]}`
      : website;

  const logo = logoUrl || getLogoUrl();
  // Email clients often ignore CSS-only image sizing and show the PNG at
  // full native size. HTML width/height attributes are required.
  const logoSize = 72;

  return `
    <div data-zairo-signature="1" style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; max-width: 600px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
        <tr>
          <td width="${logoSize}" valign="top" style="width: ${logoSize}px; max-width: ${logoSize}px; vertical-align: top; padding: 0 16px 0 0;">
            <img
              src="${logo}"
              alt="Zairo International"
              width="${logoSize}"
              height="${logoSize}"
              style="width: ${logoSize}px; max-width: ${logoSize}px; height: auto; display: block; border: 0; outline: none; text-decoration: none; background-color: #ffffff;"
            />
          </td>
          <td valign="top" style="vertical-align: top; padding: 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 0;">
                  <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1f2937; font-family: 'Segoe UI', Arial, sans-serif;">
                    ${name}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0 0 0;">
                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937; font-family: 'Segoe UI', Arial, sans-serif;">
                    ${title}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0 0;">
                  <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #374151; font-family: 'Segoe UI', Arial, sans-serif;">
                    <strong style="color: #1f2937;">Website:</strong>
                    <span style="color: #1f2937;">${websiteDisplay}</span>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0 0 0;">
                  <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #374151; font-family: 'Segoe UI', Arial, sans-serif;">
                    <strong style="color: #1f2937;">Email:</strong>
                    <a href="mailto:${email}" style="color: #2563eb; text-decoration: underline;">${email}</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0 0 0;">
                  <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #374151; font-family: 'Segoe UI', Arial, sans-serif;">
                    <strong style="color: #1f2937;">Phone:</strong>
                    <a href="tel:${phone}" style="color: #1f2937; text-decoration: none;">${phone}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
};

// Alternative signature with logo image (if you have a logo URL)
// This is now the same as getEmailSignature, kept for backward compatibility
export const getEmailSignatureWithImage = (
  logoUrl: string,
  config?: EmailSignatureConfig
): string => {
  return getEmailSignature({ ...config, logoUrl });
};

