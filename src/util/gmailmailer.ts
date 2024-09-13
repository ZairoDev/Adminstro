import nodemailer, { Transporter, SendMailOptions } from "nodemailer";

interface EmailParams {
  email: string;
  subject: string;
  text: string;
  price?: string;
}

// Define an interface for the user details
interface UserDetails {
  email: string;
  name: string;
  phone: string;
  price?: string;
  VSID?: string;
  Link?: string;
}

const createTransporter = (): Transporter => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "zairo.developer@gmail.com",
      pass: "gwlz rnrv gpio uzcp",
    },
  });
};

export const sendEmail = async ({
  email,
  subject,
  text,
  price,
}: EmailParams): Promise<void> => {
  try {
    const transporter = createTransporter();

    // Set up email options
    const mailOptions: SendMailOptions = {
      from: `No Reply <no-reply@yourdomain.com>`,
      to: email,
      subject: subject,
      text: text,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log("No-reply email sent successfully");
  } catch (error) {
    console.error("Error sending no-reply email:", error);
    throw new Error("Could not send no-reply email");
  }
};

export const sendUserDetailsToCompany = async (
  userDetails: UserDetails
): Promise<void> => {
  try {
    const transporter = createTransporter();

    let subject: string;
    let text: string;

    if (userDetails.price) {
      subject = "User's selected price details";
      text = `
        Name: ${userDetails.name}
        Email: ${userDetails.email}
        Phone: ${userDetails.phone}
        Selected Plan: ${userDetails.price}
        Someone has chosen a plan, details are above.
      `;
    } else {
      subject = "User's Details";
      text = `
        Name: ${userDetails.name}
        Email: ${userDetails.email}
        Phone: ${userDetails.phone}
        VSID: ${userDetails.VSID ?? "N/A"}
        Link: ${userDetails.Link ?? "N/A"}
        Someone has listed a property, contact details are above.
      `;
    }

    // Set up email options
    const mailOptions: SendMailOptions = {
      from: `No Reply <no-reply@yourdomain.com>`,
      to: "amantrivedi598@gmail.com",
      subject: subject,
      text: text,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log("User details sent to company email successfully");
  } catch (error) {
    console.error("Error sending user details to company email:", error);
    throw new Error("Could not send user details to company email");
  }
};
