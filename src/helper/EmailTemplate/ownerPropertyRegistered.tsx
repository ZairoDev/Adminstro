export const OwnerPropertyRegisteredTemplate = ({
  ownerName,
  propertyName,
  vsid,
  loginEmail,
  completeListingUrl = "https://www.vacationsaga.com/login",
  forgotPasswordUrl = "https://www.vacationsaga.com/forgotpassword",
}: {
  ownerName: string;
  propertyName: string;
  vsid: string;
  loginEmail: string;
  completeListingUrl?: string;
  forgotPasswordUrl?: string;
}) => {
  const safeName = ownerName || "Owner";
  const safeProperty = propertyName || "your property";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your property is registered on Vacation Saga</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#1e3a5f;padding:24px;color:#ffffff;font-size:22px;font-weight:bold;">
              Vacation Saga
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#1e3a5f;">Congratulations, ${safeName}!</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333;">
                Your property <strong>${safeProperty}</strong> has been registered on Vacation Saga.
              </p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333;">
                <strong>Property reference:</strong> ${vsid}
              </p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333;">
                <strong>Log in with:</strong> ${loginEmail}
              </p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333;">
                For your security, we do not send passwords by email. Use the password you chose when your account was created, or
                <a href="${forgotPasswordUrl}" style="color:#1e3a5f;">reset your password</a> if you need a new one.
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">
                Your listing is <strong>not live yet</strong>. Please log in, complete your profile, and accept the required agreements. Adding a calendar link from Airbnb or Booking.com is optional but recommended to avoid double bookings. Our team will publish your property once the required steps are done.
              </p>
              <a href="${completeListingUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">
                Log in to Vacation Saga
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#f8f9fa;font-size:12px;color:#888;text-align:center;">
              &copy; Vacation Saga. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
