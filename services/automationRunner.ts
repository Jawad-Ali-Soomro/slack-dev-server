import Automation from "../models/automation.model";
import Notification from "../models/notification.model";
import { Task } from "../models/index";
import { logger } from "../helpers/index";
import getOverdueInfo from "../utils/formatDate";
import { notifyUser } from "../utils/notify";
import {
  sendOverdueTaskEmail,
  sendWelcomeMemberEmail,
} from "../templates/renderEmail";

export const isAutomationEnabled = async (key: string) => {
  const doc = await Automation.findOne({ key }).select("enabled");
  return !!doc?.enabled;
};

const claimOverdueTask = async (taskId: unknown) => {
  return Task.findOneAndUpdate(
    {
      _id: taskId,
      dueDate: { $lt: new Date() },
      status: { $nin: ["completed", "cancelled"] },
      overdueEmailSent: { $ne: true },
    },
    { $set: { overdueEmailSent: true } },
    { new: false },
  );
};

const releaseOverdueClaim = async (taskId: unknown) => {
  await Task.updateOne(
    { _id: taskId, overdueEmailSent: true },
    { $set: { overdueEmailSent: false } },
  );
};

const alreadySentOverdue = async (taskId: unknown) => {
  const existing = await Notification.exists({
    type: "task_overdue",
    taskId,
  });
  return !!existing;
};

export const welcomeNewTeamMember = async ({
  team,
  member,
  inviter,
  jobRole,
}: {
  team: { name?: string; members?: any[] };
  member: { _id?: any; email?: string; username?: string };
  inviter: { _id?: any; username?: string };
  jobRole?: string;
}) => {
  if (!(await isAutomationEnabled("welcome-new-members"))) return;
  if (!member?._id) return;

  const teamName = team?.name || "the team";
  const inviterName = inviter?.username || "A teammate";

  await notifyUser({
    recipient: member._id,
    sender: inviter?._id || member._id,
    type: "team_welcome",
    message: `Welcome to ${teamName}. You're on the team — check your first tasks when they land.`,
  });

  if (member.email) {
    try {
      await sendWelcomeMemberEmail({
        to: member.email,
        username: member.username || "there",
        teamName,
        inviterName,
        jobRole,
        memberCount: team?.members?.length,
      });
    } catch (err: any) {
      logger.error(`Welcome email failed: ${err?.message || err}`);
    }
  }
};

let overdueRun: Promise<{ sent: number; skipped: boolean }> | null = null;

export const sendOverdueReminders = async () => {
  if (overdueRun) return overdueRun;

  overdueRun = (async () => {
    if (!(await isAutomationEnabled("overdue-reminders"))) {
      logger.info("Overdue reminders skipped (automation off)");
      return { sent: 0, skipped: true };
    }

    const overdueTasks = await Task.find({
      dueDate: { $lt: new Date() },
      status: { $nin: ["completed", "cancelled"] },
      overdueEmailSent: { $ne: true },
    })
      .populate("assignTo", "username email")
      .populate("assignedBy", "username email")
      .populate("projectId", "name");

    let sent = 0;

    for (const task of overdueTasks) {
      const overdueBy = getOverdueInfo(task.dueDate as Date);
      const assignee: any = task.assignTo;
      if (!overdueBy || !assignee?._id) continue;

      const claimed = await claimOverdueTask(task._id);
      if (!claimed) continue;

      if (await alreadySentOverdue(task._id)) {
        logger.info(
          `Overdue email already sent for task ${String(task._id)}, skipping`,
        );
        continue;
      }

      let mailed = false;
      try {
        const assigner: any = task.assignedBy;
        const project: any = task.projectId;

        if (assignee.email) {
          await sendOverdueTaskEmail({
            to: assignee.email,
            username: assignee.username || "there",
            taskTitle: task.title,
            assignerName: assigner?.username,
            projectName: project?.name,
            overdueBy,
            taskId: String(task._id),
          });
          mailed = true;
        }

        await notifyUser({
          recipient: assignee._id,
          sender: assigner?._id || assignee._id,
          type: "task_overdue",
          message: `"${task.title}" is overdue by ${overdueBy}.`,
          taskId: task._id,
        });

        sent += 1;
        logger.info(
          `Overdue reminder sent once for task ${String(task._id)}${
            assignee.email ? ` to ${assignee.email}` : ""
          }`,
        );
      } catch (err: any) {
        if (!mailed) {
          await releaseOverdueClaim(task._id);
        }
        logger.error(
          `Overdue reminder failed for task ${String(task._id)}: ${err?.message || err}`,
        );
      }
    }

    logger.info(`Overdue reminders sent for ${sent} task(s)`);
    return { sent, skipped: false };
  })().finally(() => {
    overdueRun = null;
  });

  return overdueRun;
};
