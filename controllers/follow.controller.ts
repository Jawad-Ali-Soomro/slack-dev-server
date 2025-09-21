import { catchAsync } from "../middlewares";
import { User } from "../models";
import { FollowRequest, FollowResponse, UserFollowStats, FollowersResponse, FollowingResponse } from "../interfaces";

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

  res.status(200).json(followersResponse);
});

export const getFollowing = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

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

  res.status(200).json(followingResponse);
});

export const getUserFollowStats = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

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
