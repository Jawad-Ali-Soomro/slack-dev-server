import { catchAsync } from "../middlewares";
import { Notification } from "../models";
import redisService from "../services/redis.service";

export const getNotifications = catchAsync(async (req: any, res: any) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const userId = req.user._id;

  const cacheKey = `user:${userId}:notifications:${page}:${limit}`;
  const cached = await redisService.get(cacheKey);
  
  if (cached) {
    return res.status(200).json(cached);
  }

  const notifications = await Notification.find({ recipient: userId })
    .populate('sender', 'username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit as string));

  const total = await Notification.countDocuments({ recipient: userId });

  const response = {
    notifications,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string))
    }
  };

  await redisService.set(cacheKey, response, 300);

  res.status(200).json(response);
});

export const markAsRead = catchAsync(async (req: any, res: any) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  await redisService.invalidateUserNotifications(userId);
  await redisService.invalidatePattern(`user:${userId}:notifications:*`);

  res.status(200).json({
    message: "Notification marked as read",
    notification
  });
});

export const markAllAsRead = catchAsync(async (req: any, res: any) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true }
  );

  await redisService.invalidateUserNotifications(userId);
  await redisService.invalidatePattern(`user:${userId}:notifications:*`);

  res.status(200).json({ message: "All notifications marked as read" });
});

export const deleteNotification = catchAsync(async (req: any, res: any) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId
  });

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  res.status(200).json({ message: "Notification deleted successfully" });
});