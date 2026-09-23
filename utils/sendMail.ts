import nodemailer from "nodemailer";
import { Mail } from "../interfaces/index";
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), "config/.env"),
});

const sendMail = async (options: Mail) => {
  const user = (process.env.GMAIL_USER || "").trim();
  const pass = (process.env.GMAIL_PASS || "").trim();

  if (!user || !pass) {
    throw new Error("Email is not configured (GMAIL_USER / GMAIL_PASS)");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const mailOptions = {
    from: `"${options.fromName || "Slack Dev"}" <${user}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments || [],
  };

  await transporter.sendMail(mailOptions);
};

export default sendMail;
