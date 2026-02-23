import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendMail = async ({ to, subject, html }) => {
  await resend.emails.send({
    from: "onboarding@resend.dev", // default working sender
    to,
    subject,
    html,
  });
};