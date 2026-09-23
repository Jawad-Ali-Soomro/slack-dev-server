import Notification from "../models/notification.model";
import redisService from "../services/redis.service";

const getSocketService = () => (global as any).socketService;

export const toNotificationPayload = (notification: any) => {
  if (!notification) return null;
  return {
    ...notification,
    id: notification._id?.toString?.() || notification.id,
  };
};

export const emitNotification = (recipientId: string, notification: any) => {
  try {
    const socketService = getSocketService();
    const payload = toNotificationPayload(notification);
    if (socketService && payload) {
      socketService.emitNotification(recipientId, payload);
    }
  } catch (err) {
    console.error("Failed to emit notification socket event:", err);
  }
};

export const emitNotificationUpdate = (
  recipientId: string,
  notification: any,
) => {
  try {
    const socketService = getSocketService();
    const payload = toNotificationPayload(notification);
    if (socketService && payload) {
      socketService.emitToUser(recipientId, "notification_updated", payload);
    }
  } catch (err) {
    console.error("Failed to emit notification update socket event:", err);
  }
};

export const emitNotificationRemoved = (
  recipientId: string,
  notificationId: string,
) => {
  try {
    const socketService = getSocketService();
    if (socketService && notificationId) {
      socketService.emitToUser(recipientId, "notification_deleted", {
        id: String(notificationId),
      });
    }
  } catch (err) {
    console.error("Failed to emit notification delete socket event:", err);
  }
};

export const emitTaskUpdated = (userIds: Array<string | undefined | null>, task: any) => {
  try {
    const socketService = (global as any).socketService;
    if (!socketService?.emitTaskUpdated) return;
    const ids = [...new Set(userIds.filter(Boolean).map((id) => String(id)))];
    socketService.emitTaskUpdated(ids, task);
  } catch (err) {
    console.error("Failed to emit task update socket event:", err);
  }
};

type NotifyInput = {
  recipient: any;
  sender: any;
  type: string;
  message: string;
  taskId?: any;
  invitationId?: any;
  meetingId?: any;
};

export const notifyUser = async ({
  recipient,
  sender,
  type,
  message,
  taskId,
  invitationId,
  meetingId,
}: NotifyInput) => {
  if (!recipient || !sender) return null;

  const notification = await Notification.create({
    recipient,
    sender,
    type,
    message,
    taskId,
    invitationId,
    meetingId,
  });

  const recipientId = recipient.toString();
  await redisService.invalidateUserNotifications(recipientId);
  await redisService.invalidatePattern(`user:${recipientId}:notifications:*`);

  const populated = await Notification.findById(notification._id)
    .populate("sender", "username avatar")
    .populate("invitationId", "status targetType targetName role targetId")
    .populate("taskId", "title status")
    .lean();

  const payload = toNotificationPayload(populated);
  if (payload) emitNotification(recipientId, payload);
  return payload;
};
