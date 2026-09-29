import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import { sendMail } from "../utils/index";

export type EmailDetail = { label: string; value: string };

export type EmailView = {
  to: string;
  subject: string;
  username?: string;
  eyebrow?: string;
  heading?: string;
  headingColor?: string;
  message?: string;
  otp?: string;
  bodyLines?: string[];
  details?: EmailDetail[];
  detailsHtml?: string;
  buttonText?: string;
  buttonUrl?: string;
  footer?: string;
  preheader?: string;
  siteName?: string;
  supportEmail?: string;
  buttonColor?: string;
};

const SITE_NAME = "Slack Dev";
const SUPPORT_EMAIL = "support@slackdev.com";

const resolveExisting = (candidates: string[]) =>
  candidates.find((file) => fs.existsSync(file));

export const resolveLogoPath = () =>
  resolveExisting([
    path.join(process.cwd(), "public/logo.png"),
    path.join(process.cwd(), "public/logo.svg"),
    path.join(__dirname, "../public/logo.png"),
    path.join(__dirname, "../public/logo.svg"),
  ]);

const resolveTemplatePath = () =>
  resolveExisting([
    path.join(__dirname, "emails/global.hbs"),
    path.join(process.cwd(), "templates/emails/global.hbs"),
    path.join(__dirname, "../templates/emails/global.hbs"),
  ]);

Handlebars.registerHelper(
  "hasItems",
  (arr: unknown) => Array.isArray(arr) && arr.length > 0,
);

const getTemplate = () => {
  const file = resolveTemplatePath();
  if (!file) {
    throw new Error("Global email template not found (templates/emails/global.hbs)");
  }
  return Handlebars.compile(fs.readFileSync(file, "utf8"));
};

export const getLogoAttachments = () => {
  const logoPath = resolveLogoPath();
  if (!logoPath) return [];
  const isPng = logoPath.toLowerCase().endsWith(".png");
  return [
    {
      filename: isPng ? "logo.png" : "logo.svg",
      path: logoPath,
      cid: "logo",
      contentType: isPng ? "image/png" : "image/svg+xml",
    },
  ];
};

const appUrl = () => process.env.FRONTEND_URL || process.env.CLIENT_URL || "";

export const appLink = (pathname: string) => {
  const base = appUrl().replace(/\/$/, "");
  const pathName = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${pathName}`;
};

const otpDigits = (otp?: string) =>
  otp ? String(otp).replace(/\s/g, "").split("") : undefined;

const toBodyLines = (view: Omit<EmailView, "to" | "subject">) => {
  if (Array.isArray(view.bodyLines) && view.bodyLines.length) {
    return view.bodyLines.map((line) => String(line).trim()).filter(Boolean);
  }
  return (view.details || [])
    .filter((row) => row && row.value !== undefined && row.value !== null && row.value !== "")
    .map((row) => `${row.label}: ${row.value}`);
};

export const taskEmailLines = (opts: {
  title: string;
  assignerName?: string;
  projectName?: string;
  overdueBy?: string;
}) => {
  const bits = [`The ${opts.title}`];
  if (opts.assignerName) bits.push(`assigned by ${opts.assignerName}`);
  if (opts.projectName) bits.push(`on ${opts.projectName}`);
  const lead = bits.join(" ");
  const overdue = opts.overdueBy ? ` is overdue by ${opts.overdueBy}` : "";
  return [`${lead}${overdue}. Please take some certain actions.`];
};

export const renderEmail = (view: Omit<EmailView, "to" | "subject">) => {
  const siteName = view.siteName || SITE_NAME;
  const supportEmail = view.supportEmail || SUPPORT_EMAIL;
  const heading = view.heading || "";
  const message = view.message || "";
  const bodyLines = toBodyLines(view);
  const html = getTemplate()({
    siteName,
    supportEmail,
    username: view.username || "",
    eyebrow: view.eyebrow || "NOTIFICATION",
    heading,
    headingColor: view.headingColor || "#111111",
    message,
    otpDigits: otpDigits(view.otp),
    bodyLines,
    detailsHtml: view.detailsHtml || "",
    buttonUrl: view.buttonUrl || "",
    buttonText: view.buttonText || "Open Slack Dev",
    buttonColor: view.buttonColor || "#f97316",
    footer:
      view.footer ||
      "This is an automated message from Slack Dev. Please do not reply to this email.",
    preheader: view.preheader || heading || message || siteName,
    showLogo: Boolean(resolveLogoPath()),
  });

  const lines = [
    siteName,
    view.eyebrow,
    view.username ? `Hello ${view.username}` : "",
    heading,
    message,
    view.otp ? `Code: ${view.otp}` : "",
    ...bodyLines,
    view.buttonText && view.buttonUrl ? `${view.buttonText}: ${view.buttonUrl}` : view.buttonUrl || "",
    `Need help? ${supportEmail}`,
  ].filter(Boolean);

  return { html, text: lines.join("\n\n") };
};

export const sendBrandEmail = async (view: EmailView) => {
  const { html, text } = renderEmail(view);
  await sendMail({
    to: view.to,
    subject: view.subject,
    html,
    text,
    fromName: SITE_NAME,
    attachments: getLogoAttachments(),
  });
};

export const sendOtpEmail = async (opts: {
  to: string;
  username: string;
  otp: string;
  kind: "signup" | "login" | "resend" | "reset";
}) => {
  const isReset = opts.kind === "reset";
  const eyebrow =
    opts.kind === "login"
      ? "Login verification"
      : opts.kind === "reset"
        ? "Password reset"
        : "Email verification";
  const subject =
    opts.kind === "login"
      ? "Verify email to sign in"
      : opts.kind === "reset"
        ? "Reset your Slack Dev password"
        : opts.kind === "resend"
          ? "Your new Slack Dev verification code"
          : "Verify your Slack Dev email";
  const message = isReset
    ? "Use this code to reset your password."
    : opts.kind === "login"
      ? "Verify your email to finish signing in."
      : "Use this code to confirm your email address.";

  await sendBrandEmail({
    to: opts.to,
    subject,
    username: opts.username,
    eyebrow,
    message,
    otp: opts.otp,
    buttonText: isReset ? "Reset password" : "Verify",
    buttonUrl: isReset
      ? appLink(`/reset-password?token=${opts.otp}`)
      : appLink(`/verify-email?token=${opts.otp}`),
    buttonColor: isReset ? "#dc2626" : "#f97316",
    preheader: `${SITE_NAME} code: ${opts.otp}`,
  });
};

export const sendTeamInviteEmail = async (opts: {
  to: string;
  username: string;
  teamName: string;
  inviterName: string;
  role: string;
  jobRole?: string;
}) => {
  await sendBrandEmail({
    to: opts.to,
    subject: `You're invited to join ${opts.teamName}`,
    username: opts.username,
    eyebrow: "Team invitation",
    heading: "You're invited",
    message: `${opts.inviterName} invited you to join ${opts.teamName}.`,
    bodyLines: [
      opts.teamName,
      `Invited by ${opts.inviterName}`,
      opts.role ? `Role: ${opts.role}` : "",
      opts.jobRole ? `Job role: ${opts.jobRole}` : "",
    ].filter(Boolean),
    buttonText: "View invitation",
    buttonUrl: appLink("/dashboard/teams"),
    footer: "Open Teams to accept or decline this invitation.",
    preheader: `${opts.inviterName} invited you to ${opts.teamName}`,
  });
};

export const sendWelcomeMemberEmail = async (opts: {
  to: string;
  username: string;
  teamName: string;
  inviterName: string;
  jobRole?: string;
  memberCount?: number;
}) => {
  await sendBrandEmail({
    to: opts.to,
    subject: `Welcome to ${opts.teamName}`,
    username: opts.username,
    eyebrow: "Welcome",
    heading: `Welcome to ${opts.teamName}`,
    message: `${opts.inviterName} added you to the team. You're in — here's what to know.`,
    bodyLines: [
      opts.teamName,
      `Added by ${opts.inviterName}`,
      opts.jobRole ? `Job role: ${opts.jobRole}` : "",
      typeof opts.memberCount === "number" ? `Members: ${opts.memberCount}` : "",
    ].filter(Boolean),
    buttonText: "Open team",
    buttonUrl: appLink("/dashboard/teams"),
    footer: "Welcome to the team. Your first tasks will land here as work is assigned.",
    preheader: `Welcome to ${opts.teamName} on Slack Dev`,
  });
};

export const sendOverdueTaskEmail = async (opts: {
  to: string;
  username: string;
  taskTitle: string;
  assignerName?: string;
  projectName?: string;
  overdueBy: string;
  taskId?: string;
}) => {
  await sendBrandEmail({
    to: opts.to,
    subject: `Task overdue: ${opts.taskTitle}`,
    username: opts.username,
    eyebrow: "Task alert",
    heading: "Task overdue",
    headingColor: "#dc2626",
    message: taskEmailLines({
      title: opts.taskTitle,
      assignerName: opts.assignerName,
      projectName: opts.projectName,
      overdueBy: opts.overdueBy,
    }).join(" "),
    buttonText: "View task",
    buttonUrl: opts.taskId
      ? appLink(`/dashboard/tasks?task=${opts.taskId}`)
      : appLink("/dashboard/tasks"),
    footer: "Update the status or reassign it so the work keeps moving.",
    preheader: `The ${opts.taskTitle} is overdue by ${opts.overdueBy}. Please take some certain actions.`,
  });
};
