import nodemailer from "nodemailer";
import { Mail } from "../interfaces/index";
const sendMail = async (options: Mail) => {
  const user = (process.env.GMAIL_USER || "").trim();
  const pass = (process.env.GMAIL_PASS || "").trim();

  if (!user || !pass) {
    throw new Error("Email is not configured (GMAIL_USER / GMAIL_PASS)");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  const mailOptions = {
    from: `"${options.fromName || process.env.MAIL_FROM_NAME}" <${user}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments || [],
  };

  await transporter.sendMail(mailOptions);
};

export default sendMail;
