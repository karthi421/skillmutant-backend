/*import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendMail = async ({ to, subject, html }) => {
  await resend.emails.send({
    from: "onboarding@resend.dev", // default working sender
    to,
    subject,
    html,
  });
};
*/
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"SkillMutant" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};