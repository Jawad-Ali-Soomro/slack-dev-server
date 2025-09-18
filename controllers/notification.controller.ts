import { catchAsync } from "../middlewares";
import { Notification } from "../models";
import { NotificationResponse } from "../interfaces";

export const getNotifications = catchAsync(async (req: any, res: any) => {
  const currentUserId = req.user._id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipient: currentUserId })
    .populate("sender", "username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments({ recipient: currentUserId });
  const unreadCount = await Notification.countDocuments({ 
    recipient: currentUserId, 
    isRead: false 
  });

  const notificationResponses: NotificationResponse[] = notifications.map(notification => ({
    id: (notification._id as any).toString(),
    sender: {
      id: (notification.sender as any)._id,
      username: (notification.sender as any).username,
      avatar: (notification.sender as any).avatar
    },
    type: notification.type,
    message: notification.message,
    isRead: notification.isRead,
    followId: notification.followId?.toString(),
    createdAt: notification.createdAt
  }));

  res.status(200).json({
    notifications: notificationResponses,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

export const markNotificationAsRead = catchAsync(async (req: any, res: any) => {
  const { notificationId } = req.params;
  const currentUserId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: currentUserId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: "notification not found" });
  }

  res.status(200).json({ message: "notification marked as read" });
});

export const markAllNotificationsAsRead = catchAsync(async (req: any, res: any) => {
  const currentUserId = req.user._id;

  await Notification.updateMany(
    { recipient: currentUserId, isRead: false },
    { isRead: true }
  );

  res.status(200).json({ message: "all notifications marked as read" });
});

export const deleteNotification = catchAsync(async (req: any, res: any) => {
  const { notificationId } = req.params;
  const currentUserId = req.user._id;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: currentUserId
  });

  if (!notification) {
    return res.status(404).json({ message: "notification not found" });
  }

  res.status(200).json({ message: "notification deleted successfully" });
});

export const getUnreadCount = catchAsync(async (req: any, res: any) => {
  const currentUserId = req.user._id;

  const unreadCount = await Notification.countDocuments({ 
    recipient: currentUserId, 
    isRead: false 
  });

  res.status(200).json({ unreadCount });
});
