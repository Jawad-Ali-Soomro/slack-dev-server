import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../../docs");
const outFile = path.join(outDir, "Slack-Dev-Application-Flow.pdf");

const ink = "#171717";
const muted = "#5e5e5e";
const orange = "#ff914b";
const soft = "#fff4ec";
const line = "#f0d3c0";

fs.mkdirSync(outDir, { recursive: true });

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 64, bottom: 58, left: 56, right: 56 },
  bufferPages: true,
  info: {
    Title: "Slack Dev — Application flow",
    Author: "Slack Dev",
    Subject: "How the product moves from sign-in through workspace work and automations",
  },
});

doc.pipe(fs.createWriteStream(outFile));

const width = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;
const bottom = () => doc.page.height - doc.page.margins.bottom - 18;

const ensure = (height) => {
  if (doc.y + height > bottom()) doc.addPage();
};

const h1 = (text) => {
  ensure(46);
  doc.moveDown(0.4);
  doc.fillColor(orange).font("Helvetica-Bold").fontSize(11).text(text.toUpperCase());
  doc.moveDown(0.25);
  doc.fillColor(ink);
};

const para = (text) => {
  ensure(36);
  doc.font("Helvetica").fontSize(11).fillColor(ink).text(text, {
    width: width(),
    lineGap: 3,
  });
  doc.moveDown(0.45);
};

const bullet = (text) => {
  ensure(22);
  const x = doc.page.margins.left;
  const y = doc.y;
  doc.fillColor(orange).circle(x + 4, y + 6, 2.2).fill();
  doc.fillColor(ink).font("Helvetica").fontSize(11).text(text, x + 16, y, {
    width: width() - 16,
    lineGap: 2,
  });
  doc.moveDown(0.28);
};

const flow = (steps) => {
  const text = steps.join("   →   ");
  doc.font("Helvetica").fontSize(10);
  const boxWidth = width();
  const textHeight = doc.heightOfString(text, { width: boxWidth - 24, lineGap: 2 });
  const boxHeight = textHeight + 18;
  ensure(boxHeight + 8);
  const y = doc.y;
  doc.save();
  doc.roundedRect(doc.page.margins.left, y, boxWidth, boxHeight, 8).fill(soft);
  doc.restore();
  doc.fillColor("#9a3412").font("Helvetica").fontSize(10).text(text, doc.page.margins.left + 12, y + 9, {
    width: boxWidth - 24,
    lineGap: 2,
  });
  doc.y = y + boxHeight + 12;
  doc.fillColor(ink);
};

const labelValue = (label, value) => {
  ensure(18);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(ink).text(label, { continued: true });
  doc.font("Helvetica").fillColor(muted).text(`  ${value}`);
  doc.moveDown(0.15);
};

doc.rect(0, 0, doc.page.width, 12).fill(orange);
doc.fillColor(ink).font("Helvetica-Bold").fontSize(13).text("SLACK DEV", 56, 88);
doc.fillColor(orange).font("Helvetica-Bold").fontSize(32).text("Application flow", 56, 118, {
  width: width(),
});
doc.moveDown(0.6);
doc.fillColor(muted).font("Helvetica").fontSize(12).text(
  "How a person gets in, how work moves through the workspace, and how the six automations fire.",
  { width: 420, lineGap: 3 },
);
doc.moveDown(1.2);
doc.strokeColor(line).lineWidth(1).moveTo(56, doc.y).lineTo(220, doc.y).stroke();
doc.moveDown(0.8);
doc.fillColor(ink).font("Helvetica").fontSize(11).text("October 16, 2026");
doc.fillColor(muted).fontSize(10).text("Client, API, live updates, and scheduled rules");

doc.addPage();

h1("1. What this product is");
para("Slack Dev is a workspace for a software team. People sign in, then keep tasks, meetings, projects, chats, and friends in one place. Public projects can be listed and bought. A voice assistant can look people up and create tasks by speech. Six automations run in the background once an admin turns them on.");
para("The browser app talks to an Express API. Socket.IO pushes live changes. Redis caches reads. RabbitMQ carries task, chat, and workspace events to the people who should see them. Redis and RabbitMQ start with the Docker stack, the same way the API does.");

h1("2. Who can do what");
bullet("A visitor can open the landing page, about, contact, sign up, and sign in.");
bullet("A signed-in user can use the dashboard, tasks, meetings, projects, workspace, friends, messages, explore, and purchased projects.");
bullet("An admin can turn the six automations on or off. Those switches are global: one switch covers every workspace.");
bullet("A superadmin can also open user management and permission management.");
para("The sidebar voice button sits directly above logout and opens for every signed-in user.");

h1("3. Getting in");
flow([
  "Landing page",
  "Sign up",
  "Email code",
  "Verify",
  "Sign in",
  "Dashboard",
]);
para("Sign up sends a one-time code by email. The account stays unverified until that code is entered. Sign in uses the same email check. Forgot password sends a reset code and returns the person to a new password.");
para("Inside the app, a user can connect GitHub. The token is stored on their profile. Repository pages and the pull-request automation both use that connection.");

h1("4. After sign-in");
para("The sidebar is the map of the product:");
bullet("Dashboard — tasks, meetings, and who is available.");
bullet("Explore — public projects, then a Stripe payment.");
bullet("Purchased — projects this user has bought.");
bullet("Tasks — create, assign, update status, link a repository.");
bullet("Meetings — schedule, reschedule, and mark complete. Online meetings use Jitsi.");
bullet("Projects — members, links, tasks, meetings, and progress.");
bullet("Workspace — teams, job roles, and email invites.");
bullet("Automation — the six rules.");
bullet("Friends — find people and manage requests.");
bullet("Messages — direct chats and group chats.");
para("A group message shows who has viewed it and who replied. Direct messages stay plain.");

h1("5. A normal piece of work");
flow([
  "Create a workspace",
  "Invite members and set job roles",
  "Open a project",
  "Create a task",
  "Assign it",
  "Meet",
  "Mark the meeting complete",
  "Close the task",
]);
para("Creating a task asks for a title, an assignee, a priority, and an optional due date. The assignee can be picked by hand. If auto-assign is on, the form can ask for a job role and a workspace, skip anyone marked busy, and suggest the matching person with the fewest open tasks.");
para("Task statuses are pending, in progress, completed, and cancelled. The assignee and the person who assigned it both get a notification. The same update is published so open screens refresh without a reload.");
para("A meeting has a host (assigned by), an owner (assigned to), optional attendees, and an optional project. Only the assigned person can change its status. Only the person who created it can reschedule it.");

h1("6. Marketplace");
flow(["Explore", "Open a public project", "Pay with Stripe", "Purchased"]);
para("A completed payment is stored as a purchase. The project then shows under Purchased for that user.");

doc.addPage();

h1("7. The six automations");
para("An admin or superadmin opens Automation and flips a switch. Everyone else can see the rules but cannot change them. Three rules react the moment something happens. Three rules are checked on a schedule, using Karachi time.");

doc.font("Helvetica-Bold").fontSize(13).fillColor(ink).text("Auto-assign new tasks");
doc.moveDown(0.25);
flow(["Task form", "Pick a job role", "Skip busy members", "Least-loaded match", "Assignee filled in"]);
para("This runs only while the rule is on, and only for workspaces the current user belongs to. If every match is busy, the form says so and does not invent an assignee.");

doc.font("Helvetica-Bold").fontSize(13).fillColor(ink).text("Overdue reminders");
doc.moveDown(0.25);
flow(["Due date passes", "Every 30 minutes", "Email the assignee", "Email the project owner", "In-app notification"]);
para("Completed and cancelled tasks are ignored. Each overdue task is claimed once, so the same task is not mailed again on the next run. The project owner is the project creator plus any member whose project role is owner. The assignee is not mailed twice if they are also the owner. Turning the rule on runs a pass immediately.");

doc.font("Helvetica-Bold").fontSize(13).fillColor(ink).text("Meeting follow-ups");
doc.moveDown(0.25);
flow(["Assigned person marks the meeting completed", "Follow-up task", "Due the next evening", "Notify the assignee"]);
para("The task title is “Follow up:” plus the meeting title. It is assigned to the person who owned the meeting, filed on the same project when there is one, and tagged so the same meeting cannot create a second follow-up.");

doc.font("Helvetica-Bold").fontSize(13).fillColor(ink).text("PR to task sync");
doc.moveDown(0.25);
flow(["Pending task linked to a repo", "Every 15 minutes", "Open pull request matches", "Status becomes In Progress"]);
para("The match uses the GitHub account of the person who assigned the task, or the assignee if they are the one connected. A pull request counts when the task text contains its link, when the pull request names the task id, or when the pull request title is the task title. The task is updated once and the assignee is notified. Turning the rule on runs a pass immediately.");

doc.font("Helvetica-Bold").fontSize(13).fillColor(ink).text("Daily standup digest");
doc.moveDown(0.25);
flow(["9:00 each morning", "Each workspace", "Yesterday’s finished, opened, and wrapped work", "Group chat"]);
para("The message is posted by the workspace owner into a group chat with the workspace name, or into the group chat that already holds the most members. If neither exists, a group chat is created for that workspace. A workspace gets one digest per day. Turning the rule on posts that day’s digest immediately if it has not been posted yet.");

doc.font("Helvetica-Bold").fontSize(13).fillColor(ink).text("Welcome new members");
doc.moveDown(0.25);
flow(["Invite accepted or member added", "In-app welcome", "Welcome email"]);
para("The note names the workspace and the person who added them, and includes the job role when one was chosen.");

h1("8. Voice assistant");
flow(["Sidebar button", "Voice panel", "API on behalf of the signed-in user"]);
para("The assistant can list people, open one person’s details, list workspaces, list tasks, and create a task for a named teammate. It uses the signed-in user’s session, so it can only do what that user can do.");

h1("9. What stays in sync");
bullet("Socket.IO delivers new messages, read receipts, notifications, and task updates to the people in that conversation or on that task.");
bullet("Redis caches task, meeting, project, team, chat, and notification reads, then drops the cache when the underlying record changes.");
bullet("RabbitMQ carries task changes, chat notifications, and workspace status so a slow listener does not block the request that saved the record.");
bullet("Email covers verification codes, password reset, workspace invites, welcome notes, and overdue tasks.");

h1("10. Route map");
labelValue("Public", "/   /about   /contact   /login   /signup   /forgot-password   /verify-email");
labelValue("Work", "/dashboard   /tasks   /meetings   /projects   /teams   /automation");
labelValue("People", "/dashboard/friends   /dashboard/chat");
labelValue("Market", "/dashboard/explore   /dashboard/my-bought-projects");
labelValue("Code", "/dashboard/repos   /dashboard/repos/:id");
labelValue("Admin", "/dashboard/admin/users   /dashboard/admin/permissions");
doc.moveDown(0.4);
para("API routes live under /api and follow the same split: auth, users, tasks, meetings, projects, teams, invitations, automations, friends, chat, explore, notifications, and health. Interactive API docs are served at /api-docs.");

const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i += 1) {
  doc.switchToPage(i);
  const label = `${i + 1}  /  ${range.count}`;
  doc.font("Helvetica").fontSize(9).fillColor("#9a9a9a");
  doc.text(label, 0, doc.page.height - 36, {
    width: doc.page.width - 56,
    align: "right",
  });
  if (i > 0) {
    doc.fillColor(orange).font("Helvetica-Bold").fontSize(8).text("SLACK DEV", 56, 32);
    doc.strokeColor(line).lineWidth(1).moveTo(56, 48).lineTo(doc.page.width - 56, 48).stroke();
  }
}

await new Promise((resolve, reject) => {
  doc.on("end", resolve);
  doc.on("error", reject);
  doc.end();
});

console.log(outFile);
