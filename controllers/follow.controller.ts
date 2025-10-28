import { catchAsync, invalidateUserCache } from "../middlewares";
import { User, Notification } from "../models";
import { FollowRequest, UserFollowStats, FollowersResponse, FollowingResponse } from "../interfaces";
import redisService from "../services/redis.service";

export const followUser = catchAsync(async (req: any, res: any) => {
  const { userId }: FollowRequest = req.body;
  const currentUserId = req.user._id;

  if (userId === currentUserId.toString()) {
    return res.status(400).json({ message: "Cannot follow yourself" });
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) {
    return res.status(404).json({ message: "Current user not found" });
  }

  // Check if already following
  if ((currentUser as any).following.includes(userId as any)) {
    return res.status(400).json({ message: "Already following this user" });
  }

  // Add to following list
  await User.findByIdAndUpdate(currentUserId, {
    $addToSet: { following: userId }
  });

  // Add to target user's followers list
  await User.findByIdAndUpdate(userId, {
    $addToSet: { followers: currentUserId }
  });

  // Create notification for the followed user
  await Notification.create({
    recipient: userId,
    sender: currentUserId,
    type: "user_followed",
    message: `${req.user.username} started following you`,
  });

  // Invalidate user caches
  await invalidateUserCache(currentUserId.toString());
  await invalidateUserCache(userId);

  // Populate user data for response
  const updatedCurrentUser = await User.findById(currentUserId)
    .populate("following", "username avatar")
    .populate("followers", "username avatar");

  const updatedTargetUser = await User.findById(userId)
    .populate("following", "username avatar")
    .populate("followers", "username avatar");

  res.status(200).json({
    message: "User followed successfully",
    currentUser: {
      id: updatedCurrentUser?._id.toString(),
      username: updatedCurrentUser?.username,
      followersCount: (updatedCurrentUser as any)?.followers.length || 0,
      followingCount: (updatedCurrentUser as any)?.following.length || 0
    },
    targetUser: {
      id: updatedTargetUser?._id.toString(),
      username: updatedTargetUser?.username,
      followersCount: (updatedTargetUser as any)?.followers.length || 0,
      followingCount: (updatedTargetUser as any)?.following.length || 0
    }
  });
});

export const unfollowUser = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) {
    return res.status(404).json({ message: "Current user not found" });
  }

  // Check if currently following
  if (!(currentUser as any).following.includes(userId as any)) {
    return res.status(400).json({ message: "Not following this user" });
  }

  // Remove from following list
  await User.findByIdAndUpdate(currentUserId, {
    $pull: { following: userId }
  });

  // Remove from target user's followers list
  await User.findByIdAndUpdate(userId, {
    $pull: { followers: currentUserId }
  });

  // Create notification for the unfollowed user
  await Notification.create({
    recipient: userId,
    sender: currentUserId,
    type: "user_unfollowed",
    message: `${req.user.username} stopped following you`,
  });

  // Invalidate user caches
  await invalidateUserCache(currentUserId.toString());
  await invalidateUserCache(userId);

  // Populate user data for response
  const updatedCurrentUser = await User.findById(currentUserId)
    .populate("following", "username avatar")
    .populate("followers", "username avatar");

  const updatedTargetUser = await User.findById(userId)
    .populate("following", "username avatar")
    .populate("followers", "username avatar");

  res.status(200).json({
    message: "User unfollowed successfully",
    currentUser: {
      id: updatedCurrentUser?._id.toString(),
      username: updatedCurrentUser?.username,
      followersCount: (updatedCurrentUser as any)?.followers.length || 0,
      followingCount: (updatedCurrentUser as any)?.following.length || 0
    },
    targetUser: {
      id: updatedTargetUser?._id.toString(),
      username: updatedTargetUser?.username,
      followersCount: (updatedTargetUser as any)?.followers.length || 0,
      followingCount: (updatedTargetUser as any)?.following.length || 0
    }
  });
});

export const getFollowers = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  // Try to get from cache first
  const cacheKey = `user:${userId}:followers:${page}:${limit}`;
  const cached = await redisService.get(cacheKey);
  
  if (cached) {
    return res.status(200).json(cached);
  }

  const user = await User.findById(userId)
    .populate({
      path: "followers",
      select: "username avatar",
      options: {
        skip,
        limit,
        sort: { createdAt: -1 }
      }
    });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const total = (user as any).followers.length;
  const followers = (user as any).followers.slice(skip, skip + limit);

  const followersResponse: FollowersResponse = {
    followers: followers.map((follower: any) => ({
      id: follower._id.toString(),
      username: follower.username,
      avatar: follower.avatar,
      followedAt: new Date() // Since we don't track when follow happened, using current date
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  // Cache the response for 5 minutes
  await redisService.set(cacheKey, followersResponse, 300);

  res.status(200).json(followersResponse);
});

export const getFollowing = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  // Try to get from cache first
  const cacheKey = `user:${userId}:following:${page}:${limit}`;
  const cached = await redisService.get(cacheKey);
  
  if (cached) {
    return res.status(200).json(cached);
  }

  const user = await User.findById(userId)
    .populate({
      path: "following",
      select: "username avatar",
      options: {
        skip,
        limit,
        sort: { createdAt: -1 }
      }
    });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const total = (user as any).following.length;
  const following = (user as any).following.slice(skip, skip + limit);

  const followingResponse: FollowingResponse = {
    following: following.map((followedUser: any) => ({
      id: followedUser._id.toString(),
      username: followedUser.username,
      avatar: followedUser.avatar,
      followedAt: new Date() // Since we don't track when follow happened, using current date
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  // Cache the response for 5 minutes
  await redisService.set(cacheKey, followingResponse, 300);

  res.status(200).json(followingResponse);
});

export const getUserFollowStats = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  // Try to get from cache first
  const cacheKey = `user:${userId}:followStats:${currentUserId}`;
  const cached = await redisService.get(cacheKey);
  
  if (cached) {
    return res.status(200).json(cached);
  }

  const user = await User.findById(userId)
    .populate("followers", "_id")
    .populate("following", "_id");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) {
    return res.status(404).json({ message: "Current user not found" });
  }

  const isFollowing = (currentUser as any).following.includes(userId as any);

  const stats: UserFollowStats = {
    followersCount: (user as any).followers.length,
    followingCount: (user as any).following.length,
    isFollowing
  };

  // Cache the response for 5 minutes
  await redisService.set(cacheKey, stats, 300);

  res.status(200).json(stats);
});

export const checkFollowStatus = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) {
    return res.status(404).json({ message: "Current user not found" });
  }

  const isFollowing = (currentUser as any).following.includes(userId as any);

  res.status(200).json({
    isFollowing,
    userId,
    currentUserId: currentUserId.toString()
  });
});

export const getFollowNotifications = catchAsync(async (req: any, res: any) => {
  const currentUserId = req.user._id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ 
    recipient: currentUserId,
    type: { $in: ["user_followed", "user_unfollowed"] }
  })
    .populate("sender", "username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments({ 
    recipient: currentUserId,
    type: { $in: ["user_followed", "user_unfollowed"] }
  });

  const notificationResponses = notifications.map(notification => ({
    id: (notification._id as any).toString(),
    sender: {
      id: (notification.sender as any)._id.toString(),
      username: (notification.sender as any).username,
      avatar: (notification.sender as any).avatar
    },
    type: notification.type,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt
  }));

  res.status(200).json({
    notifications: notificationResponses,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});
