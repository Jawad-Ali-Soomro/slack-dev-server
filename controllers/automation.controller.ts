import { Response } from "express";
import mongoose from "mongoose";
import { catchAsync } from "../middlewares/index";
import Automation from "../models/automation.model";
import { Task } from "../models/index";
import { Team } from "../models/team.model";
import { Availability, JobRole, Role } from "../interfaces/index";
import { sendOverdueReminders } from "../services/automationRunner";

export const AUTOMATION_CATALOG = [
  {
    key: "auto-assign-tasks",
    title: "Auto-assign new tasks",
    description:
      "Assign from the selected team. Match a job role from the dropdown, skip busy teammates, and pick the least-loaded match.",
    trigger: "Task created",
    action: "Assign member",
  },
  {
    key: "overdue-reminders",
    title: "Overdue reminders",
    description:
      "Email and notify the assignee and project owner when a task passes its due date.",
    trigger: "Task overdue",
    action: "Send email + notification",
  },
  {
    key: "meeting-follow-ups",
    title: "Meeting follow-ups",
    description:
      "Create a follow-up task automatically after every completed meeting.",
    trigger: "Meeting completed",
    action: "Create task",
  },
  {
    key: "pr-task-sync",
    title: "PR to task sync",
    description:
      "Move a task to In Progress when a linked pull request is opened.",
    trigger: "PR opened",
    action: "Update status",
  },
  {
    key: "daily-standup-digest",
    title: "Daily standup digest",
    description:
      "Post a summary of yesterday's progress to the team chat every morning.",
    trigger: "Every day 9:00",
    action: "Send message",
  },
  {
    key: "welcome-new-members",
    title: "Welcome new members",
    description: "Email and notify a teammate when they join a team.",
    trigger: "Member added",
    action: "Send welcome email",
  },
] as const;

const isPrivileged = (role?: string) =>
  role === Role.Admin || role === Role.Superadmin;

const formatAutomation = (doc: any) => ({
  id: doc._id.toString(),
  key: doc.key,
  title: doc.title,
  description: doc.description,
  trigger: doc.trigger,
  action: doc.action,
  enabled: !!doc.enabled,
  enabledBy: doc.enabledBy
    ? {
        id: doc.enabledBy._id?.toString?.() || doc.enabledBy.toString(),
        username: doc.enabledBy.username,
      }
    : null,
  updatedBy: doc.updatedBy
    ? {
        id: doc.updatedBy._id?.toString?.() || doc.updatedBy.toString(),
        username: doc.updatedBy.username,
      }
    : null,
  updatedAt: doc.updatedAt,
  createdAt: doc.createdAt,
});

const ensureCatalog = async () => {
  const ops = AUTOMATION_CATALOG.map((item) => ({
    updateOne: {
      filter: { key: item.key },
      update: {
        $set: {
          title: item.title,
          description: item.description,
          trigger: item.trigger,
          action: item.action,
        },
        $setOnInsert: {
          key: item.key,
          enabled: false,
        },
      },
      upsert: true,
    },
  }));

  await Automation.bulkWrite(ops);
};

export const detectRolesFromText = (text = ""): JobRole[] => {
  const source = String(text).toLowerCase();
  const roles: JobRole[] = [];
  const patterns: Array<[RegExp, JobRole]> = [
    [/(?:^|[^a-z])(?:front[- ]?end|frontend)(?:[^a-z]|$)/, JobRole.Frontend],
    [/(?:^|[^a-z])(?:back[- ]?end|backend)(?:[^a-z]|$)/, JobRole.Backend],
    [/(?:^|[^a-z])(?:\bqa\b|quality assurance|tester)(?:[^a-z]|$)/, JobRole.QA],
    [/(?:^|[^a-z])(?:devops|dev[- ]?ops)(?:[^a-z]|$)/, JobRole.DevOps],
    [/(?:^|[^a-z])(?:full[- ]?stack|fullstack)(?:[^a-z]|$)/, JobRole.FullStack],
    [/(?:^|[^a-z])(?:design(?:er|s)?|ui\/ux|ux\/ui)(?:[^a-z]|$)/, JobRole.Designer],
  ];

  for (const [pattern, role] of patterns) {
    if (pattern.test(source)) roles.push(role);
  }

  return roles;
};

const availabilityRank = (availability?: string) => {
  if (availability === Availability.Available) return 0;
  if (availability === Availability.Away) return 1;
  if (availability === Availability.InMeeting) return 2;
  return 3;
};

const matchesRequestedRole = (memberRole: string | undefined, requested: JobRole) =>
  memberRole === requested;

const candidateReason = ({
  matchedRole,
  activeTaskCount,
  availability,
}: {
  matchedRole: string;
  activeTaskCount: number;
  availability: string;
}) => {
  const load = `${activeTaskCount} open task${activeTaskCount === 1 ? "" : "s"}`;
  return `Matched ${matchedRole} · ${load} · ${availability}`;
};

export const getAutomations = catchAsync(async (req: any, res: Response) => {
  await ensureCatalog();

  const docs = await Automation.find()
    .populate("enabledBy", "username")
    .populate("updatedBy", "username");

  const byKey = new Map(docs.map((d) => [d.key, d]));
  const automations = AUTOMATION_CATALOG.map((item) => {
    const doc = byKey.get(item.key);
    return doc
      ? formatAutomation(doc)
      : {
          id: item.key,
          ...item,
          enabled: false,
          enabledBy: null,
          updatedBy: null,
          updatedAt: null,
          createdAt: null,
        };
  });

  res.status(200).json({
    success: true,
    automations,
    canManage: isPrivileged(req.user?.role),
  });
});

export const toggleAutomation = catchAsync(async (req: any, res: Response) => {
  if (!isPrivileged(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: "Only admin or superadmin can enable or disable automations",
    });
  }

  const { key } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "enabled must be a boolean",
    });
  }

  await ensureCatalog();

  const catalogItem = AUTOMATION_CATALOG.find((item) => item.key === key);
  if (!catalogItem) {
    return res.status(404).json({
      success: false,
      message: "Automation not found",
    });
  }

  const update: Record<string, unknown> = {
    enabled,
    updatedBy: req.user._id,
    title: catalogItem.title,
    description: catalogItem.description,
    trigger: catalogItem.trigger,
    action: catalogItem.action,
  };

  if (enabled) {
    update.enabledBy = req.user._id;
  }

  const doc = await Automation.findOneAndUpdate({ key }, { $set: update }, {
    new: true,
    upsert: true,
  })
    .populate("enabledBy", "username")
    .populate("updatedBy", "username");

  if (!doc) {
    return res.status(500).json({
      success: false,
      message: "Failed to save automation",
    });
  }

  res.status(200).json({
    success: true,
    message: enabled
      ? `${catalogItem.title} enabled`
      : `${catalogItem.title} disabled`,
    automation: formatAutomation(doc),
  });

  if (enabled && key === "overdue-reminders") {
    sendOverdueReminders().catch(() => {});
  }
});

export const suggestAutoAssignee = catchAsync(async (req: any, res: Response) => {
  const automation = await Automation.findOne({ key: "auto-assign-tasks" });
  if (!automation?.enabled) {
    return res.status(403).json({
      success: false,
      message: "Auto-assign is not enabled. Ask an admin to turn it on.",
      code: "AUTOMATION_DISABLED",
    });
  }

  const { teamId, jobRole } = req.body || {};
  const currentUserId = req.user._id.toString();

  if (
    !jobRole ||
    jobRole === JobRole.Unassigned ||
    !Object.values(JobRole).includes(jobRole as JobRole)
  ) {
    return res.status(400).json({
      success: false,
      message: "Select a job role to auto-assign",
      code: "ROLE_REQUIRED",
    });
  }

  const requestedRole = jobRole as JobRole;
  const detectedRoles = [requestedRole];

  const membershipQuery = {
    isActive: { $ne: false },
    $or: [{ createdBy: currentUserId }, { "members.user": currentUserId }],
  };

  const teams = teamId
    ? await Team.find({ _id: teamId, ...membershipQuery }).populate(
        "members.user",
        "username email avatar availability",
      )
    : await Team.find(membershipQuery).populate(
        "members.user",
        "username email avatar availability",
      );

  if (teamId && !teams.length) {
    return res.status(404).json({
      success: false,
      message: "Team not found or you are not a member of it",
      code: "TEAM_NOT_FOUND",
    });
  }

  if (!teams.length) {
    return res.status(404).json({
      success: false,
      message: "Create a team and add members with roles before auto-assigning",
      code: "NO_TEAMS",
    });
  }

  type Candidate = {
    id: string;
    username: string;
    email?: string;
    avatar?: string;
    availability: string;
    jobRole: string;
    teamId: string;
    teamName: string;
  };

  const byUser = new Map<string, Candidate>();
  let roleMatchCount = 0;

  for (const team of teams) {
    for (const member of team.members || []) {
      const user: any = member.user;
      if (!user || typeof user !== "object" || !user._id) continue;
      const id = user._id.toString();
      if (id === currentUserId) continue;

      const memberRole = (member as any).jobRole || JobRole.Unassigned;
      if (!matchesRequestedRole(memberRole, requestedRole)) continue;

      roleMatchCount += 1;
      if (user.availability === Availability.Busy) continue;

      const existing = byUser.get(id);
      if (!existing) {
        byUser.set(id, {
          id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          availability: user.availability || Availability.Available,
          jobRole: memberRole,
          teamId: (team._id as any).toString(),
          teamName: team.name,
        });
      }
    }
  }

  if (!roleMatchCount) {
    return res.status(404).json({
      success: false,
      message: teamId
        ? `No ${requestedRole} teammates on this team`
        : `No ${requestedRole} teammates to assign`,
      code: "NO_ROLE_MATCH",
      detectedRoles,
    });
  }

  const pool = [...byUser.values()];
  if (!pool.length) {
    return res.status(200).json({
      success: true,
      user: null,
      candidates: [],
      matchedRole: requestedRole,
      usedFallback: false,
      detectedRoles,
      allBusy: true,
      team: teamId
        ? { id: teams[0]._id.toString(), name: teams[0].name }
        : null,
      reason: `Every ${requestedRole} teammate is currently busy`,
    });
  }

  const poolIds = pool.map((u) => u.id);
  const counts = await Task.aggregate([
    {
      $match: {
        assignTo: {
          $in: poolIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
        status: { $in: ["pending", "in_progress"] },
      },
    },
    { $group: { _id: "$assignTo", count: { $sum: 1 } } },
  ]);

  const countByUser = new Map<string, number>(
    counts.map((row) => [row._id.toString(), row.count]),
  );

  const ranked = [...pool].sort((a, b) => {
    const aCount = countByUser.get(a.id) || 0;
    const bCount = countByUser.get(b.id) || 0;
    if (aCount !== bCount) return aCount - bCount;

    const aAvail = availabilityRank(a.availability);
    const bAvail = availabilityRank(b.availability);
    if (aAvail !== bAvail) return aAvail - bAvail;

    return (a.username || "").localeCompare(b.username || "");
  });

  const pick = ranked[0];

  const formatCandidate = (person: Candidate, recommended: boolean) => {
    const activeTaskCount = countByUser.get(person.id) || 0;
    const reason = candidateReason({
      matchedRole: requestedRole,
      activeTaskCount,
      availability: person.availability,
    });

    return {
      id: person.id,
      username: person.username,
      email: person.email,
      avatar: person.avatar,
      availability: person.availability,
      jobRole: person.jobRole,
      activeTaskCount,
      isBusy: false,
      recommended,
      matchedRole: requestedRole,
      teamId: person.teamId,
      teamName: person.teamName,
      reason,
    };
  };

  const candidates = ranked.map((person, index) =>
    formatCandidate(person, index === 0),
  );
  const formattedPick = formatCandidate(pick, true);

  res.status(200).json({
    success: true,
    user: formattedPick,
    candidates,
    matchedRole: requestedRole,
    usedFallback: false,
    detectedRoles,
    allBusy: false,
    team: teamId
      ? { id: teams[0]._id.toString(), name: teams[0].name }
      : null,
    reason: formattedPick.reason,
  });
});
