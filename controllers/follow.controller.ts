import { catchAsync } from "../middlewares";
import { User, Follow, Notification } from "../models";
import { FollowRequest, FollowResponse, UserFollowStats } from "../interfaces";

const createNotification = async (
  recipientId: string,
  senderId: string,
  type: "follow_request" | "follow_accepted" | "follow_rejected",
  message: string,
  followId?: string
) => {
  await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    message,
    followId
  });
};

export const followUser = catchAsync(async (req: any, res: any) => {
  const { userId }: FollowRequest = req.body;
  const currentUserId = req.user._id;

  if (userId === currentUserId.toString()) {
    return res.status(400).json({ message: "cannot follow yourself" });
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({ message: "user not found" });
  }

  const existingFollow = await Follow.findOne({
    follower: currentUserId,
    following: userId
  });

  if (existingFollow) {
    return res.status(400).json({ message: "already following or request pending" });
  }

  const followStatus = targetUser.isPrivate ? "pending" : "accepted";
  
  const follow = await Follow.create({
    follower: currentUserId,
    following: userId,
    status: followStatus
  });

  if (followStatus === "accepted") {
    await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(userId, { $inc: { followersCount: 1 } });
    
    await createNotification(
      userId,
      currentUserId,
      "follow_accepted",
      `${req.user.username} started following you`,
      (follow._id as any).toString()
    );
  } else {
    await createNotification(
      userId,
      currentUserId,
      "follow_request",
      `${req.user.username} requested to follow you`,
      (follow._id as any).toString()
    );
  }

  res.status(200).json({
    message: followStatus === "accepted" ? "user followed successfully" : "follow request sent",
    status: followStatus
  });
});

export const unfollowUser = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  const follow = await Follow.findOneAndDelete({
    follower: currentUserId,
    following: userId
  });

  if (!follow) {
    return res.status(404).json({ message: "not following this user" });
  }

  if (follow.status === "accepted") {
    await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(userId, { $inc: { followersCount: -1 } });
  }

  res.status(200).json({ message: "user unfollowed successfully" });
});

export const acceptFollowRequest = catchAsync(async (req: any, res: any) => {
  const { followId } = req.params;
  const currentUserId = req.user._id;

  const follow = await Follow.findOne({
    _id: followId,
    following: currentUserId,
    status: "pending"
  });

  if (!follow) {
    return res.status(404).json({ message: "follow request not found" });
  }

  follow.status = "accepted";
  await follow.save();

  await User.findByIdAndUpdate(follow.follower, { $inc: { followingCount: 1 } });
  await User.findByIdAndUpdate(currentUserId, { $inc: { followersCount: 1 } });

  await createNotification(
    follow.follower.toString(),
    currentUserId,
    "follow_accepted",
    `${req.user.username} accepted your follow request`,
    (follow._id as any).toString()
  );

  res.status(200).json({ message: "follow request accepted" });
});

export const rejectFollowRequest = catchAsync(async (req: any, res: any) => {
  const { followId } = req.params;
  const currentUserId = req.user._id;

  const follow = await Follow.findOneAndDelete({
    _id: followId,
    following: currentUserId,
    status: "pending"
  });

  if (!follow) {
    return res.status(404).json({ message: "follow request not found" });
  }

  await createNotification(
    follow.follower.toString(),
    currentUserId,
    "follow_rejected",
    `${req.user.username} rejected your follow request`,
    (follow._id as any).toString()
  );

  res.status(200).json({ message: "follow request rejected" });
});

export const getFollowers = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const follows = await Follow.find({
    following: userId,
    status: "accepted"
  })
  .populate("follower", "username avatar")
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);

  const total = await Follow.countDocuments({
    following: userId,
    status: "accepted"
  });

  res.status(200).json({
    followers: follows.map(follow => ({
      id: (follow.follower as any)._id.toString(),
      username: (follow.follower as any).username,
      avatar: (follow.follower as any).avatar,
      followedAt: follow.createdAt
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

export const getFollowing = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const follows = await Follow.find({
    follower: userId,
    status: "accepted"
  })
  .populate("following", "username avatar")
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);

  const total = await Follow.countDocuments({
    follower: userId,
    status: "accepted"
  });

  res.status(200).json({
    following: follows.map(follow => ({
      id: (follow.following as any)._id.toString(),
      username: (follow.following as any).username,
      avatar: (follow.following as any).avatar,
      followedAt: follow.createdAt
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

export const getFollowRequests = catchAsync(async (req: any, res: any) => {
  const currentUserId = req.user._id;

  const followRequests = await Follow.find({
    following: currentUserId,
    status: "pending"
  })
  .populate("follower", "username avatar")
  .sort({ createdAt: -1 });

  res.status(200).json({
    requests: followRequests.map(follow => ({
      id: (follow._id as any).toString(),
      follower: {
        id: (follow.follower as any)._id.toString(),
        username: (follow.follower as any).username,
        avatar: (follow.follower as any).avatar
      },
      createdAt: follow.createdAt
    }))
  });
});

export const getUserFollowStats = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  let isFollowing = false;
  let followStatus = undefined;

  if (currentUserId.toString() !== userId) {
    const follow = await Follow.findOne({
      follower: currentUserId,
      following: userId
    });

    if (follow) {
      isFollowing = follow.status === "accepted";
      followStatus = follow.status;
    }
  }

  const stats: UserFollowStats = {
    followersCount: user.followersCount || 0,
    followingCount: user.followingCount || 0,
    isFollowing,
    followStatus
  };

  res.status(200).json(stats);
});
