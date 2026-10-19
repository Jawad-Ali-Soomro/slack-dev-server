import axios from "axios";
import Automation from "../models/automation.model";
import Notification from "../models/notification.model";
import { Chat, Meeting, Message, Project, Task, User } from "../models/index";
import { Team } from "../models/team.model";
import { logger } from "../helpers/index";
import getOverdueInfo from "../utils/formatDate";
import { notifyUser } from "../utils/notify";
import redisService from "./redis.service";
import chatService from "./chatService";
import { publishTaskChange } from "./taskQueue";
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
      .populate("projectId", "name createdBy members");

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

        await notifyProjectOwners({
          project: task.projectId,
          assigneeId: String(assignee._id),
          senderId: assigner?._id || assignee._id,
          taskTitle: task.title,
          overdueBy,
          taskId: task._id,
          assignerName: assigner?.username,
          projectName: project?.name,
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

const idOf = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value.toHexString === "function") return value.toHexString();
  if (value._id) return idOf(value._id);
  if (typeof value.id === "string") return value.id;
  return "";
};

const notifyProjectOwners = async ({
  project,
  assigneeId,
  senderId,
  taskTitle,
  overdueBy,
  taskId,
  assignerName,
  projectName,
}: {
  project: any;
  assigneeId: string;
  senderId: any;
  taskTitle: string;
  overdueBy: string;
  taskId: any;
  assignerName?: string;
  projectName?: string;
}) => {
  if (!project || typeof project !== "object") return;

  const ownerIds = new Set<string>();
  const createdBy = idOf(project.createdBy);
  if (createdBy) ownerIds.add(createdBy);
  for (const member of project.members || []) {
    if (member?.role === "owner") {
      const memberId = idOf(member.user);
      if (memberId) ownerIds.add(memberId);
    }
  }
  ownerIds.delete(assigneeId);
  if (!ownerIds.size) return;

  const owners = await User.find({ _id: { $in: [...ownerIds] } }).select(
    "username email",
  );

  for (const owner of owners) {
    if (owner.email) {
      try {
        await sendOverdueTaskEmail({
          to: owner.email,
          username: owner.username || "there",
          taskTitle,
          assignerName,
          projectName,
          overdueBy,
          taskId: String(taskId),
        });
      } catch (err: any) {
        logger.error(
          `Overdue email to project owner failed: ${err?.message || err}`,
        );
      }
    }

    await notifyUser({
      recipient: owner._id,
      sender: senderId,
      type: "task_overdue",
      message: `"${taskTitle}" is overdue by ${overdueBy}.`,
      taskId,
    });
  }
};

const karachiMidnight = (dayOffset = 0) => {
  const stamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = stamp.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + dayOffset) - 5 * 60 * 60 * 1000);
};

const taskPayload = (task: any) => ({
  id: String(task._id),
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  assignTo: {
    id: idOf(task.assignTo),
    username: task.assignTo?.username,
  },
  assignedBy: {
    id: idOf(task.assignedBy),
    username: task.assignedBy?.username,
  },
  projectId: idOf(task.projectId) || undefined,
  dueDate: task.dueDate,
  tags: task.tags,
});

export const createMeetingFollowUp = async (meeting: any) => {
  if (!meeting || meeting.status !== "completed") return null;
  if (!(await isAutomationEnabled("meeting-follow-ups"))) return null;

  const meetingId = idOf(meeting);
  const marker = `follow-up:${meetingId}`;
  const existing = await Task.findOne({ tags: marker });
  if (existing) return existing;

  const assigneeId = idOf(meeting.assignedTo);
  const assignerId = idOf(meeting.assignedBy) || assigneeId;
  if (!assigneeId || !assignerId) return null;

  const due = new Date(karachiMidnight(1).getTime() + 18 * 60 * 60 * 1000);
  const detail = meeting.description
    ? `Created after "${meeting.title}" was marked completed.\n\n${meeting.description}`
    : `Created after "${meeting.title}" was marked completed.`;

  const task = await Task.create({
    title: `Follow up: ${meeting.title}`.slice(0, 200),
    description: detail.slice(0, 1000),
    assignTo: assigneeId,
    assignedBy: assignerId,
    projectId: idOf(meeting.projectId) || undefined,
    status: "pending",
    priority: "medium",
    dueDate: due,
    tags: ["meeting-follow-up", marker],
  });

  if (task.projectId) {
    await Project.findByIdAndUpdate(task.projectId, {
      $addToSet: { tasks: task._id },
    });
    await redisService.invalidateProject(String(task.projectId));
  }

  await redisService.invalidateUserTasks(assigneeId);
  await redisService.invalidateUserTasks(assignerId);
  await redisService.invalidateDashboardData(assigneeId);
  await redisService.invalidateDashboardData(assignerId);
  await redisService.invalidatePattern("tasks:*");

  await notifyUser({
    recipient: assigneeId,
    sender: assignerId,
    type: "task_assigned",
    message: `Follow-up task "${task.title}" was created after the meeting.`,
    taskId: task._id,
  });

  await publishTaskChange({
    action: "assigned",
    task: taskPayload(task),
  });

  logger.info(`Meeting follow-up created for ${meetingId}`);
  return task;
};

const githubClient = (token: string) =>
  axios.create({
    baseURL: "https://api.github.com",
    timeout: 12000,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "slack-dev",
    },
  });

const pullFromText = (text = "") => {
  const match = String(text).match(
    /github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i,
  );
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    number: Number(match[3]),
  };
};

const listRepos = async (client: ReturnType<typeof githubClient>) => {
  const repos: Array<{ name: string; full_name: string }> = [];
  for (let page = 1; page <= 2; page += 1) {
    const res = await client.get("/user/repos", {
      params: {
        per_page: 100,
        page,
        affiliation: "owner,collaborator,organization_member",
      },
    });
    const batch = Array.isArray(res.data) ? res.data : [];
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
};

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const pullIsMerged = (pull: any) =>
  Boolean(pull?.merged_at) || pull?.merged === true;

const pullHit = (pull: any) => ({
  number: pull.number,
  url: pull.html_url,
  title: pull.title,
  merged: pullIsMerged(pull),
  open: pull?.state === "open" && !pullIsMerged(pull),
});

const pullMatchesTask = (pull: any, task: any) => {
  const taskId = String(task._id).toLowerCase();
  const blob = `${pull.title || ""}\n${pull.body || ""}`.toLowerCase();
  if (blob.includes(taskId) || blob.includes(`task:${taskId}`)) return true;

  const title = normalizeText(task.title);
  if (title.length < 3) return false;
  const pullTitle = normalizeText(pull.title);
  const branch = normalizeText(pull.head?.ref);
  if (pullTitle === title || branch === title) return true;
  if (title.length >= 4 && (pullTitle.includes(title) || branch.includes(title))) {
    return true;
  }
  return false;
};

const recentPull = (pull: any) => {
  const stamp = new Date(
    pull.updated_at || pull.closed_at || pull.created_at || 0,
  ).getTime();
  if (!Number.isFinite(stamp)) return false;
  return Date.now() - stamp < 14 * 24 * 60 * 60 * 1000;
};

const findTaskPull = async (
  client: ReturnType<typeof githubClient>,
  task: any,
  repos: Array<{ name: string; full_name: string }>,
) => {
  const linked = pullFromText(
    `${task.linkedPullRequest?.url || ""}\n${task.description || ""}\n${(task.tags || []).join(" ")}`,
  );
  if (linked) {
    const res = await client.get(
      `/repos/${linked.owner}/${linked.repo}/pulls/${linked.number}`,
    );
    const pull = res.data;
    if (!pull) return null;
    if (pullIsMerged(pull) || pull.state === "open") return pullHit(pull);
    return null;
  }

  const repoName = String(task.repository?.repoName || "")
    .split("/")
    .pop()
    ?.toLowerCase();
  if (!repoName) return null;

  const repo = repos.find((item) => item.name.toLowerCase() === repoName);
  if (!repo) return null;

  const res = await client.get(`/repos/${repo.full_name}/pulls`, {
    params: {
      state: "all",
      per_page: 40,
      sort: "updated",
      direction: "desc",
    },
  });
  const pulls = Array.isArray(res.data) ? res.data : [];
  const match = pulls.find(
    (pull: any) =>
      recentPull(pull) &&
      (pullIsMerged(pull) || pull.state === "open") &&
      pullMatchesTask(pull, task),
  );
  return match ? pullHit(match) : null;
};

let pullSyncRun: Promise<{ updated: number; skipped: boolean }> | null = null;

export const syncOpenPullRequests = async () => {
  if (pullSyncRun) return pullSyncRun;

  pullSyncRun = (async () => {
    if (!(await isAutomationEnabled("pr-task-sync"))) {
      return { updated: 0, skipped: true };
    }

    const tasks = await Task.find({
      status: { $in: ["pending", "in_progress"] },
      $or: [
        { "repository.repoName": { $exists: true, $nin: [null, ""] } },
        { description: /github\.com\/.+\/pull\/\d+/i },
        { tags: /github\.com\/.+\/pull\/\d+/i },
        { "linkedPullRequest.number": { $exists: true } },
      ],
    })
      .limit(40)
      .populate("assignTo", "username socialLinks.github.accessToken")
      .populate("assignedBy", "username socialLinks.github.accessToken");

    const reposByToken = new Map<string, Array<{ name: string; full_name: string }>>();
    let updated = 0;

    for (const task of tasks) {
      const tokenOwner =
        (task.assignedBy as any)?.socialLinks?.github?.accessToken
          ? task.assignedBy
          : (task.assignTo as any)?.socialLinks?.github?.accessToken
            ? task.assignTo
            : null;
      const token = (tokenOwner as any)?.socialLinks?.github?.accessToken;
      if (!token) continue;

      try {
        const client = githubClient(token);
        if (!reposByToken.has(token)) {
          reposByToken.set(token, await listRepos(client));
        }
        const pull = await findTaskPull(client, task, reposByToken.get(token) || []);
        if (!pull) continue;

        const nextStatus = pull.merged
          ? "completed"
          : pull.open
            ? "in_progress"
            : null;
        if (!nextStatus || task.status === nextStatus) continue;

        task.status = nextStatus;
        task.linkedPullRequest = {
          number: pull.number,
          url: pull.url,
          title: pull.title,
          syncedAt: new Date(),
        };
        await task.save();

        const assigneeId = idOf(task.assignTo);
        const assignerId = idOf(task.assignedBy) || assigneeId;
        await redisService.invalidateUserTasks(assigneeId);
        if (assignerId) await redisService.invalidateUserTasks(assignerId);
        await redisService.invalidatePattern("tasks:*");

        await notifyUser({
          recipient: assigneeId,
          sender: assignerId || assigneeId,
          type: "task_status_updated",
          message: pull.merged
            ? `"${task.title}" marked done because PR #${pull.number} was merged.`
            : `"${task.title}" moved to In Progress because PR #${pull.number} is open.`,
          taskId: task._id,
        });

        await publishTaskChange({
          action: "status_updated",
          task: taskPayload(task),
        });

        try {
          await announceTaskPullUpdate(task, pull);
        } catch (chatErr: any) {
          logger.error(
            `PR chat update failed for task ${String(task._id)}: ${chatErr?.message || chatErr}`,
          );
        }
        updated += 1;
      } catch (err: any) {
        logger.error(
          `PR sync failed for task ${String(task._id)}: ${err?.response?.status || err?.message || err}`,
        );
      }
    }

    logger.info(`PR sync updated ${updated} task(s)`);
    return { updated, skipped: false };
  })().finally(() => {
    pullSyncRun = null;
  });

  return pullSyncRun;
};

const overlapScore = (chatParticipants: any[], memberIds: Set<string>) => {
  let score = 0;
  for (const person of chatParticipants || []) {
    if (memberIds.has(idOf(person))) score += 1;
  }
  return score;
};

const workspaceChatForTeam = async (team: any) => {
  const memberIds = new Set<string>(
    (team.members || []).map((member: any) => idOf(member.user)).filter(Boolean),
  );
  const ownerId = idOf(team.createdBy);
  if (ownerId) memberIds.add(ownerId);
  if (!memberIds.size || !ownerId) return null;

  const chats = await Chat.find({
    type: "group",
    isActive: true,
    participants: { $in: [...memberIds] },
  }).select("name participants createdBy");

  const named = chats.find(
    (chat) => String(chat.name || "").trim().toLowerCase() === String(team.name || "").trim().toLowerCase(),
  );
  const ranked = [...chats].sort(
    (a, b) => overlapScore(b.participants, memberIds) - overlapScore(a.participants, memberIds),
  );
  const best = named || ranked[0];
  if (best && (named || overlapScore(best.participants, memberIds) >= 2)) {
    const hasOwner = (best.participants || []).some((person) => idOf(person) === ownerId);
    if (!hasOwner) {
      await Chat.updateOne({ _id: best._id }, { $addToSet: { participants: ownerId } });
    }
    return best;
  }

  return Chat.create({
    type: "group",
    name: team.name,
    description: `${team.name} workspace`,
    participants: [...memberIds],
    createdBy: ownerId,
    isActive: true,
  });
};

const groupChatForTask = async (task: any) => {
  const assigneeId = idOf(task.assignTo);
  const assignerId = idOf(task.assignedBy);
  let team = null;

  const projectId = idOf(task.projectId);
  if (projectId) {
    const project = await Project.findById(projectId).select("teamId");
    if (project?.teamId) {
      team = await Team.findById(project.teamId).select("name createdBy members");
    }
  }

  if (!team && assigneeId) {
    const people = [assigneeId, assignerId].filter(Boolean);
    team =
      people.length > 1
        ? await Team.findOne({
            isActive: { $ne: false },
            "members.user": { $all: people },
          }).select("name createdBy members")
        : null;
    if (!team) {
      team = await Team.findOne({
        isActive: { $ne: false },
        $or: [{ createdBy: assigneeId }, { "members.user": assigneeId }],
      }).select("name createdBy members");
    }
  }

  if (!team) return null;
  return workspaceChatForTeam(team);
};

const announceTaskPullUpdate = async (
  task: any,
  pull: { number: number; url?: string; merged: boolean },
) => {
  const chat = await groupChatForTask(task);
  if (!chat) return;

  const senderId =
    idOf(chat.createdBy) || idOf(task.assignedBy) || idOf(task.assignTo);
  if (!senderId) return;

  const statusLine = pull.merged
    ? `"${task.title}" has been updated to Done. Pull request #${pull.number} was merged.`
    : `"${task.title}" has been updated to In Progress. Pull request #${pull.number} is open.`;

  await chatService.sendMessage(senderId, {
    chatId: String(chat._id),
    content: pull.url ? `${statusLine}\n${pull.url}` : statusLine,
    type: "text",
  });
};

const lineList = (title: string, rows: string[]) => {
  if (!rows.length) return "";
  return `${title}\n${rows.map((row) => `• ${row}`).join("\n")}`;
};

let standupRun: Promise<{ posted: number; skipped: boolean }> | null = null;

export const sendDailyStandupDigests = async () => {
  if (standupRun) return standupRun;

  standupRun = (async () => {
    if (!(await isAutomationEnabled("daily-standup-digest"))) {
      return { posted: 0, skipped: true };
    }

    const start = karachiMidnight(-1);
    const end = karachiMidnight(0);
    const teams = await Team.find({ isActive: { $ne: false } }).select(
      "name createdBy members",
    );
    let posted = 0;

    for (const team of teams) {
      try {
        const memberIds = (team.members || [])
          .map((member: any) => idOf(member.user))
          .filter(Boolean);
        if (!memberIds.length) continue;

        const chat = await workspaceChatForTeam(team);
        if (!chat) continue;

        const ownerId = idOf(team.createdBy);
        const existingMessage = await Message.exists({
          chat: chat._id,
          createdAt: { $gte: end },
          content: { $regex: /^Daily standup/ },
        });
        if (existingMessage) continue;

        const [completed, created, overdue, meetings] = await Promise.all([
          Task.find({
            assignTo: { $in: memberIds },
            status: "completed",
            updatedAt: { $gte: start, $lt: end },
          })
            .limit(8)
            .populate("assignTo", "username"),
          Task.find({
            assignTo: { $in: memberIds },
            createdAt: { $gte: start, $lt: end },
          })
            .limit(8)
            .select("title"),
          Task.countDocuments({
            assignTo: { $in: memberIds },
            dueDate: { $lt: new Date() },
            status: { $nin: ["completed", "cancelled"] },
          }),
          Meeting.find({
            status: "completed",
            updatedAt: { $gte: start, $lt: end },
            $or: [
              { assignedTo: { $in: memberIds } },
              { attendees: { $in: memberIds } },
            ],
          })
            .limit(6)
            .select("title"),
        ]);

        const dayLabel = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Karachi",
          weekday: "long",
          month: "short",
          day: "numeric",
        }).format(start);

        const blocks = [
          `Daily standup · ${team.name}`,
          `Yesterday (${dayLabel})`,
          lineList(
            "Finished",
            completed.map(
              (task: any) =>
                `${task.assignTo?.username || "Someone"} finished "${task.title}"`,
            ),
          ),
          lineList(
            "Opened",
            created.map((task: any) => task.title),
          ),
          lineList(
            "Meetings wrapped",
            meetings.map((meeting: any) => meeting.title),
          ),
          overdue
            ? `${overdue} task${overdue === 1 ? "" : "s"} still overdue.`
            : "Nothing is overdue.",
        ].filter(Boolean);

        if (!completed.length && !created.length && !meetings.length && !overdue) {
          blocks.push("Quiet day. No tasks or meetings moved yesterday.");
        }

        await chatService.sendMessage(ownerId, {
          chatId: String(chat._id),
          content: blocks.join("\n\n"),
          type: "text",
        });

        posted += 1;
        logger.info(`Standup posted for ${team.name}`);
      } catch (err: any) {
        logger.error(
          `Standup failed for team ${team.name}: ${err?.message || err}`,
        );
      }
    }

    logger.info(`Standup digests posted for ${posted} workspace(s)`);
    return { posted, skipped: false };
  })().finally(() => {
    standupRun = null;
  });

  return standupRun;
};
