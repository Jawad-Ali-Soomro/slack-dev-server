import nodemailer from "nodemailer";
import { Mail } from "../interfaces";
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: "../config/.env",
});

const sendMail = async (options: Mail) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
  
  const mailOptions = {
    from: `"${"Core Stack"}" <${process.env.GMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments || []
  };
  
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
  }
};

export default sendMail;
