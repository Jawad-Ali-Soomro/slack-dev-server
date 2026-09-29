import { Response } from "express";
import { Team } from "../models/team.model";
import { Project } from "../models/project.model";
import User from "../models/user.model";
import Notification from "../models/notification.model";
import Invitation from "../models/invitation.model";
import { catchAsync } from "../middlewares/index";
import redisService from "../services/redis.service";
import { JobRole, Role } from "../interfaces/index";
import { logger } from "../helpers/index";
import { sendTeamInviteEmail } from "../templates/renderEmail";
import { welcomeNewTeamMember } from "../services/automationRunner";
import {
  notifyUser,
  emitNotificationUpdate,
  emitNotificationRemoved,
} from "../utils/notify";

const getTargetModel = (targetType: string) =>
  targetType === "team" ? Team : Project;

const canManageTarget = (target: any, userId: any, userRole: Role) => {
  if (userRole === Role.Superadmin) return true;
  if (target.createdBy?.toString() === userId.toString()) return true;
  return (target.members || []).some(
    (m: any) =>
      m.user?.toString() === userId.toString() &&
      (m.role === "owner" || m.role === "admin")
  );
};

export const sendInvitation = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;
  const userRole = req.user.role as Role;
  const { targetType, targetId, inviteeId, role, jobRole } = req.body;

  if (!["project", "team"].includes(targetType)) {
    return res.status(400).json({ success: false, message: "Invalid target type" });
  }
  if (!targetId || !inviteeId) {
    return res.status(400).json({ success: false, message: "Missing target or invitee" });
  }
  if (inviteeId.toString() === userId.toString()) {
    return res.status(400).json({ success: false, message: "You cannot invite yourself" });
  }

  let parsedJobRole = JobRole.Unassigned;
  if (targetType === "team") {
    if (!jobRole) {
      return res.status(400).json({
        success: false,
        message: "Select a job role for this teammate",
      });
    }
    if (!Object.values(JobRole).includes(jobRole as JobRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid job role. Must be one of: ${Object.values(JobRole).join(", ")}`,
      });
    }
    parsedJobRole = jobRole as JobRole;
  }

  const Model = getTargetModel(targetType);
  const target = await Model.findById(targetId);
  if (!target) {
    return res.status(404).json({ success: false, message: `${targetType} not found` });
  }

  if (!canManageTarget(target, userId, userRole)) {
    return res.status(403).json({
      success: false,
      message: "You don't have permission to invite members",
    });
  }

  const invitee = await User.findById(inviteeId).select("username email avatar");
  if (!invitee) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const alreadyMember = (target.members || []).some(
    (m: any) => m.user?.toString() === inviteeId.toString()
  );
  if (alreadyMember) {
    return res.status(400).json({
      success: false,
      message: `User is already a member of this ${targetType}`,
    });
  }

  const existing = await Invitation.findOne({
    invitee: inviteeId,
    targetType,
    targetId,
    status: "pending",
  });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: "An invitation is already pending for this user",
    });
  }

  const invitation = await Invitation.create({
    inviter: userId,
    invitee: inviteeId,
    targetType,
    targetId,
    targetName: (target as any).name || "",
    role: role || "member",
    jobRole: parsedJobRole,
    status: "pending",
  });

  await notifyUser({
    recipient: inviteeId,
    sender: userId,
    type: `${targetType}_invite`,
    message: `${req.user.username} invited you to join the ${targetType} "${(target as any).name}"`,
    invitationId: invitation._id,
  });

  if (targetType === "team") {
    sendTeamInviteEmail({
      to: invitee.email,
      username: invitee.username,
      teamName: (target as any).name || "a team",
      inviterName: req.user.username,
      role: role || "member",
      jobRole: parsedJobRole,
    }).catch((err: any) =>
      logger.error(`Team invite email failed: ${err?.message || err}`),
    );
  }

  res.status(201).json({
    success: true,
    message: "Invitation sent successfully",
    invitation,
  });
});

export const getInvitations = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;
  const userRole = req.user.role as Role;
  const { type = "received", status, targetId, targetType } = req.query;

  const filter: any = {};

  if (targetId) {
    const resolvedType = targetType === "project" ? "project" : "team";
    const Model = getTargetModel(resolvedType);
    const target = await Model.findById(targetId);
    if (!target) {
      return res.status(404).json({ success: false, message: `${resolvedType} not found` });
    }
    if (!canManageTarget(target, userId, userRole) ||
        (resolvedType === "team" &&
          userRole !== Role.Superadmin &&
          target.createdBy?.toString() !== userId.toString())) {
      return res.status(403).json({
        success: false,
        message: "Only the team owner can view invitation status",
      });
    }
    filter.targetId = targetId;
    filter.targetType = resolvedType;
  } else if (type === "sent") {
    filter.inviter = userId;
  } else {
    filter.invitee = userId;
  }

  if (status) {
    filter.status = status;
  }
  if (!targetId && targetType) {
    filter.targetType = targetType;
  }

  const invitations = await Invitation.find(filter)
    .populate("inviter", "username email avatar")
    .populate("invitee", "username email avatar")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, invitations });
});

export const respondToInvitation = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;
  const { invitationId, action } = req.body;

  if (!["accept", "reject"].includes(action)) {
    return res.status(400).json({ success: false, message: "Invalid action" });
  }

  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    return res.status(404).json({ success: false, message: "Invitation not found" });
  }

  if (invitation.invitee.toString() !== userId.toString()) {
    return res.status(403).json({
      success: false,
      message: "You can only respond to invitations sent to you",
    });
  }

  if (invitation.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "This invitation has already been responded to",
    });
  }

  const { targetType, targetId, role } = invitation;
  const Model = getTargetModel(targetType);
  const target = await Model.findById(targetId);

  if (!target) {
    invitation.status = "cancelled";
    await invitation.save();
    return res.status(404).json({
      success: false,
      message: `The ${targetType} no longer exists`,
    });
  }

  invitation.status = action === "accept" ? "accepted" : "rejected";
  await invitation.save();

  if (action === "accept") {
    const alreadyMember = (target.members || []).some(
      (m: any) => m.user?.toString() === userId.toString()
    );
    if (!alreadyMember) {
      (target.members as any).push({
        user: userId,
        role: role || "member",
        jobRole: (invitation as any).jobRole || JobRole.Unassigned,
        joinedAt: new Date(),
      });
      await target.save();
    }

    if (targetType === "team") {
      await redisService.invalidateAllTeamCaches(userId);
      await redisService.invalidateAllTeamCaches(invitation.inviter);
      await redisService.invalidatePattern(`cache:*teams*`);
      const inviterUser = await User.findById(invitation.inviter).select(
        "username email",
      );
      welcomeNewTeamMember({
        team: target,
        member: req.user,
        inviter: inviterUser || { _id: invitation.inviter, username: "A teammate" },
        jobRole: (invitation as any).jobRole,
      }).catch((err: any) =>
        logger.error(`Welcome member automation failed: ${err?.message || err}`),
      );
    } else {
      await redisService.invalidateAllProjectCaches(userId);
      await redisService.invalidateAllProjectCaches(invitation.inviter);
      await redisService.invalidatePattern(`cache:*projects*`);
    }
  }

  const inviterId = invitation.inviter.toString();
  const responseType =
    action === "accept"
      ? `${targetType}_invite_accepted`
      : `${targetType}_invite_rejected`;
  const verb = action === "accept" ? "accepted" : "declined";

  await notifyUser({
    recipient: inviterId,
    sender: userId,
    type: responseType,
    message: `${req.user.username} ${verb} your invitation to "${invitation.targetName}"`,
    invitationId: invitation._id,
  });

  const inviteeId = userId.toString();
  await redisService.invalidateUserNotifications(inviteeId);
  await redisService.invalidatePattern(`user:${inviteeId}:notifications:*`);

  const inviteeNotifications = await Notification.find({
    recipient: userId,
    invitationId: invitation._id,
  })
    .populate("sender", "username avatar")
    .populate("invitationId", "status targetType targetName role targetId")
    .lean();

  inviteeNotifications.forEach((note) => {
    emitNotificationUpdate(inviteeId, note);
  });

  res.status(200).json({
    success: true,
    message: `Invitation ${verb} successfully`,
    invitation,
  });
});

export const cancelInvitation = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;
  const { invitationId } = req.params;

  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    return res.status(404).json({ success: false, message: "Invitation not found" });
  }

  if (invitation.inviter.toString() !== userId.toString()) {
    return res.status(403).json({
      success: false,
      message: "You can only cancel invitations you sent",
    });
  }

  if (invitation.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "Only pending invitations can be cancelled",
    });
  }

  invitation.status = "cancelled";
  await invitation.save();

  const existing = await Notification.find({ invitationId: invitation._id });
  await Notification.deleteMany({ invitationId: invitation._id });
  existing.forEach((note) => {
    emitNotificationRemoved(
      note.recipient.toString(),
      (note._id as any).toString(),
    );
  });

  res.status(200).json({
    success: true,
    message: "Invitation cancelled",
    invitation,
  });
});
