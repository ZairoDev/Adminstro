// Email Signature Template
export interface EmailSignatureConfig {
  name?: string;
  title?: string;
  website?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
}

// Get logo URL - use environment variable or default to hosted/public URL
const getLogoUrl = (): string => {
  // Use environment variable for logo URL, or construct from base URL
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL;
  if (logoUrl) return logoUrl;
  
  // Try to construct from base URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
  if (baseUrl) {
    const protocol = baseUrl.startsWith("http") ? "" : "https://";
    return `${protocol}${baseUrl}/zairo1.png`;
  }
  
  // Fallback to a default domain (update this with your actual domain)
  return "https://zairointernational.com/zairo1.png";
};

export const getEmailSignature = (config?: EmailSignatureConfig): string => {
  const {
    name = "Zairo International",
    title = "HR Manager",
    website = "zairointernational.com",
    email = "hr@zairointernational.com",
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

  return `
    <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
      <table style="width: 100%; border-collapse: collapse; max-width: 600px;">
        <tr>
          <td style="width: 120px; vertical-align: top; padding-right: 20px;">
            <img src="https://vacationsaga.b-cdn.net/zairo1.png" alt="Zairo International" style="width: 100px; height: auto; display: block; background-color: #fff;" />
          </td>
          <td style="vertical-align: top; padding-left: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
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
                  <p style="margin: 0; font-size: 13px; color: #374151; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6;">
                    <strong style="color: #1f2937;">Website:</strong> 
                    <span style="color: #1f2937;">${websiteDisplay}</span>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0 0 0;">
                  <p style="margin: 0; font-size: 13px; color: #374151; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6;">
                    <strong style="color: #1f2937;">Email:</strong> 
                    <a href="mailto:${email}" style="color: #2563eb; text-decoration: underline;">${email}</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0 0 0;">
                  <p style="margin: 0; font-size: 13px; color: #374151; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6;">
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

