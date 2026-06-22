import { Response } from "express";
import { Team } from "../models/team.model";
import { Project } from "../models/project.model";
import User from "../models/user.model";
import Notification from "../models/notification.model";
import Invitation from "../models/invitation.model";
import { catchAsync } from "../middlewares";
import redisService from "../services/redis.service";
import { Role } from "../interfaces";

const emitNotification = (recipientId: string, notification: any) => {
  try {
    const socketService = (global as any).socketService;
    if (socketService) {
      socketService.emitNotification(recipientId, notification);
    }
  } catch (err) {
    console.error("Failed to emit notification socket event:", err);
  }
};

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
  const { targetType, targetId, inviteeId, role } = req.body;

  if (!["project", "team"].includes(targetType)) {
    return res.status(400).json({ success: false, message: "Invalid target type" });
  }
  if (!targetId || !inviteeId) {
    return res.status(400).json({ success: false, message: "Missing target or invitee" });
  }
  if (inviteeId.toString() === userId.toString()) {
    return res.status(400).json({ success: false, message: "You cannot invite yourself" });
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
    status: "pending",
  });

  const notification = await Notification.create({
    recipient: inviteeId,
    sender: userId,
    type: `${targetType}_invite`,
    message: `${req.user.username} invited you to join the ${targetType} "${(target as any).name}"`,
    invitationId: invitation._id,
  });

  await redisService.invalidateUserNotifications(inviteeId.toString());
  await redisService.invalidatePattern(`user:${inviteeId}:notifications:*`);

  const populatedNotification = await Notification.findById(notification._id)
    .populate("sender", "username avatar")
    .populate("invitationId", "status targetType targetName role");

  emitNotification(inviteeId.toString(), populatedNotification);

  res.status(201).json({
    success: true,
    message: "Invitation sent successfully",
    invitation,
  });
});

export const getInvitations = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;
  const { type = "received", status } = req.query;

  const filter: any = {};
  if (type === "sent") {
    filter.inviter = userId;
  } else {
    filter.invitee = userId;
  }
  if (status) {
    filter.status = status;
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
        joinedAt: new Date(),
      });
      await target.save();
    }

    if (targetType === "team") {
      await redisService.invalidateAllTeamCaches(userId);
      await redisService.invalidateAllTeamCaches(invitation.inviter);
      await redisService.invalidatePattern(`cache:*teams*`);
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

  const notification = await Notification.create({
    recipient: inviterId,
    sender: userId,
    type: responseType,
    message: `${req.user.username} ${verb} your invitation to "${invitation.targetName}"`,
    invitationId: invitation._id,
  });

  await redisService.invalidateUserNotifications(inviterId);
  await redisService.invalidatePattern(`user:${inviterId}:notifications:*`);
  await redisService.invalidateUserNotifications(userId.toString());
  await redisService.invalidatePattern(`user:${userId}:notifications:*`);

  const populatedNotification = await Notification.findById(notification._id)
    .populate("sender", "username avatar")
    .populate("invitationId", "status targetType targetName role");

  emitNotification(inviterId, populatedNotification);

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

  res.status(200).json({
    success: true,
    message: "Invitation cancelled",
    invitation,
  });
});
