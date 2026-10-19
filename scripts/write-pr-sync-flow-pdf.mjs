import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(__dirname, "../../docs/PR-to-Task-Sync-Flow.pdf");

const ink = "#171717";
const muted = "#5e5e5e";
const orange = "#ff914b";
const soft = "#fff4ec";
const line = "#f0d3c0";

fs.mkdirSync(path.dirname(outFile), { recursive: true });

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 64, bottom: 58, left: 56, right: 56 },
  bufferPages: true,
  info: {
    Title: "Slack Dev — PR to task sync",
    Author: "Slack Dev",
    Subject: "How an open pull request moves a task to In Progress",
  },
});

doc.pipe(fs.createWriteStream(outFile));

const width = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;
const bottom = () => doc.page.height - doc.page.margins.bottom - 18;

const ensure = (height) => {
  if (doc.y + height > bottom()) doc.addPage();
};

const h1 = (text) => {
  ensure(40);
  doc.moveDown(0.35);
  doc.fillColor(orange).font("Helvetica-Bold").fontSize(11).text(text.toUpperCase());
  doc.moveDown(0.25);
  doc.fillColor(ink);
};

const para = (text) => {
  ensure(32);
  doc.font("Helvetica").fontSize(11).fillColor(ink).text(text, {
    width: width(),
    lineGap: 3,
  });
  doc.moveDown(0.4);
};

const bullet = (text) => {
  ensure(20);
  const x = doc.page.margins.left;
  const y = doc.y;
  doc.fillColor(orange).circle(x + 4, y + 6, 2.2).fill();
  doc.fillColor(ink).font("Helvetica").fontSize(11).text(text, x + 16, y, {
    width: width() - 16,
    lineGap: 2,
  });
  doc.moveDown(0.25);
};

const flow = (steps) => {
  const text = steps.join("   →   ");
  doc.font("Helvetica").fontSize(10);
  const boxWidth = width();
  const textHeight = doc.heightOfString(text, { width: boxWidth - 24, lineGap: 3 });
  const boxHeight = textHeight + 18;
  ensure(boxHeight + 8);
  const y = doc.y;
  doc.save();
  doc.roundedRect(doc.page.margins.left, y, boxWidth, boxHeight, 8).fill(soft);
  doc.restore();
  doc.fillColor("#9a3412").font("Helvetica").fontSize(10).text(text, doc.page.margins.left + 12, y + 9, {
    width: boxWidth - 24,
    lineGap: 3,
  });
  doc.y = y + boxHeight + 12;
  doc.fillColor(ink);
};

doc.rect(0, 0, doc.page.width, 12).fill(orange);
doc.fillColor(ink).font("Helvetica-Bold").fontSize(13).text("SLACK DEV", 56, 88);
doc.fillColor(orange).font("Helvetica-Bold").fontSize(30).text("PR to task sync", 56, 116, {
  width: width(),
});
doc.moveDown(0.5);
doc.fillColor(muted).font("Helvetica").fontSize(12).text(
  "How an open pull request moves a pending task to In Progress.",
  { width: 420, lineGap: 3 },
);
doc.moveDown(1);
doc.strokeColor(line).lineWidth(1).moveTo(56, doc.y).lineTo(200, doc.y).stroke();
doc.moveDown(0.7);
doc.fillColor(ink).font("Helvetica").fontSize(11).text("October 16, 2026");

doc.addPage();

h1("1. The path");
flow([
  "Admin turns the rule on",
  "A pending task is linked to a repo",
  "GitHub has an open pull request",
  "The pull request matches the task",
  "Task becomes In Progress",
  "Assignee is notified",
]);
para("The rule is one switch for the whole product. An admin or superadmin turns it on from Automation. Everyone else can see it, but only those roles can change it. Turning it on runs a pass immediately, then again every 15 minutes in Karachi time.");

h1("2. What the task needs");
para("The pass only looks at tasks that are still pending and have not already been synced. A task qualifies when either of these is true:");
bullet("It is linked to a GitHub repository from the task form or the Repos page.");
bullet("Its description or tags contain a pull request link, such as github.com/owner/repo/pull/42.");
para("Completed, cancelled, and in-progress tasks are left alone. A task that already has a recorded pull request is not checked again.");

h1("3. Whose GitHub account is used");
flow([
  "Person who assigned the task",
  "If they have no GitHub token, the assignee",
  "List their repos",
  "Read open pull requests",
]);
para("The token is the one saved when that person connects GitHub inside Slack Dev. If neither person has connected GitHub, that task is skipped until someone does. The token is not written into the task or the notification.");

h1("4. How a pull request matches");
para("There are two ways a pull request is tied to a task. The first one wins.");
bullet("Direct link. If the task text contains a GitHub pull request URL, that exact pull request is fetched. It matches only while its state is open.");
bullet("Repository watch. If there is no URL, the linked repository name is matched to a repo on the connected account. Open pull requests on that repo are read, up to the latest 30.");
para("A repository pull request matches the task when any of these is true:");
bullet("The pull request title or body contains the task id.");
bullet("The pull request title or body contains task: followed by that id.");
bullet("The pull request title is the same as the task title, and the title is at least 8 characters.");
para("A similar title is not enough. “Fix login” does not match “Fix login button”.");

h1("5. What changes");
flow([
  "Status set to In Progress",
  "Pull request number, URL, and title saved on the task",
  "Task caches cleared",
  "Assignee notified",
  "Open task screens refresh",
]);
para("The in-app note reads that the task moved to In Progress because that pull request is open. The same update is published so anyone watching the task sees the new status without reloading.");

h1("6. What it will not do");
bullet("It does not open, review, or merge the pull request.");
bullet("It does not move the task backward if the pull request is later closed.");
bullet("It does not create a task from a pull request. The task has to exist first.");
bullet("It does not sync a task that is already in progress, completed, or cancelled.");
bullet("A failed GitHub call is logged and the task stays pending for the next pass.");

h1("7. A worked example");
para("Maya assigns “Ship the empty states” to Hana and links the repository pulse-design. An admin turns PR to task sync on. Hana opens a pull request titled “Ship the empty states”. Within 15 minutes, or immediately if the rule was just enabled, the task leaves Pending and becomes In Progress. Hana gets a notification that names pull request number. The task keeps that pull request so a later pass does not touch it again.");

const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i += 1) {
  doc.switchToPage(i);
  doc.font("Helvetica").fontSize(9).fillColor("#9a9a9a");
  doc.text(`${i + 1}  /  ${range.count}`, 0, doc.page.height - 36, {
    width: doc.page.width - 56,
    align: "right",
  });
  if (i > 0) {
    doc.fillColor(orange).font("Helvetica-Bold").fontSize(8).text("SLACK DEV  ·  PR TO TASK SYNC", 56, 32);
    doc.strokeColor(line).lineWidth(1).moveTo(56, 48).lineTo(doc.page.width - 56, 48).stroke();
  }
}

await new Promise((resolve, reject) => {
  doc.on("end", resolve);
  doc.on("error", reject);
  doc.end();
});

console.log(outFile);
