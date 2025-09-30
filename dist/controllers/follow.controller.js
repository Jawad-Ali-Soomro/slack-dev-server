"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFollowNotifications = exports.checkFollowStatus = exports.getUserFollowStats = exports.getFollowing = exports.getFollowers = exports.unfollowUser = exports.followUser = void 0;
const middlewares_1 = require("../middlewares");
const models_1 = require("../models");
exports.followUser = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { userId } = req.body;
    const currentUserId = req.user._id;
    if (userId === currentUserId.toString()) {
        return res.status(400).json({ message: "Cannot follow yourself" });
    }
    const targetUser = await models_1.User.findById(userId);
    if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
    }
    const currentUser = await models_1.User.findById(currentUserId);
    if (!currentUser) {
        return res.status(404).json({ message: "Current user not found" });
    }
    // Check if already following
    if (currentUser.following.includes(userId)) {
        return res.status(400).json({ message: "Already following this user" });
    }
    // Add to following list
    await models_1.User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: userId }
    });
    // Add to target user's followers list
    await models_1.User.findByIdAndUpdate(userId, {
        $addToSet: { followers: currentUserId }
    });
    // Create notification for the followed user
    await models_1.Notification.create({
        recipient: userId,
        sender: currentUserId,
        type: "user_followed",
        message: `${req.user.username} started following you`,
    });
    // Populate user data for response
    const updatedCurrentUser = await models_1.User.findById(currentUserId)
        .populate("following", "username avatar")
        .populate("followers", "username avatar");
    const updatedTargetUser = await models_1.User.findById(userId)
        .populate("following", "username avatar")
        .populate("followers", "username avatar");
    res.status(200).json({
        message: "User followed successfully",
        currentUser: {
            id: updatedCurrentUser?._id.toString(),
            username: updatedCurrentUser?.username,
            followersCount: updatedCurrentUser?.followers.length || 0,
            followingCount: updatedCurrentUser?.following.length || 0
        },
        targetUser: {
            id: updatedTargetUser?._id.toString(),
            username: updatedTargetUser?.username,
            followersCount: updatedTargetUser?.followers.length || 0,
            followingCount: updatedTargetUser?.following.length || 0
        }
    });
});
exports.unfollowUser = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const targetUser = await models_1.User.findById(userId);
    if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
    }
    const currentUser = await models_1.User.findById(currentUserId);
    if (!currentUser) {
        return res.status(404).json({ message: "Current user not found" });
    }
    // Check if currently following
    if (!currentUser.following.includes(userId)) {
        return res.status(400).json({ message: "Not following this user" });
    }
    // Remove from following list
    await models_1.User.findByIdAndUpdate(currentUserId, {
        $pull: { following: userId }
    });
    // Remove from target user's followers list
    await models_1.User.findByIdAndUpdate(userId, {
        $pull: { followers: currentUserId }
    });
    // Create notification for the unfollowed user
    await models_1.Notification.create({
        recipient: userId,
        sender: currentUserId,
        type: "user_unfollowed",
        message: `${req.user.username} stopped following you`,
    });
    // Populate user data for response
    const updatedCurrentUser = await models_1.User.findById(currentUserId)
        .populate("following", "username avatar")
        .populate("followers", "username avatar");
    const updatedTargetUser = await models_1.User.findById(userId)
        .populate("following", "username avatar")
        .populate("followers", "username avatar");
    res.status(200).json({
        message: "User unfollowed successfully",
        currentUser: {
            id: updatedCurrentUser?._id.toString(),
            username: updatedCurrentUser?.username,
            followersCount: updatedCurrentUser?.followers.length || 0,
            followingCount: updatedCurrentUser?.following.length || 0
        },
        targetUser: {
            id: updatedTargetUser?._id.toString(),
            username: updatedTargetUser?.username,
            followersCount: updatedTargetUser?.followers.length || 0,
            followingCount: updatedTargetUser?.following.length || 0
        }
    });
});
exports.getFollowers = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const user = await models_1.User.findById(userId)
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
    const total = user.followers.length;
    const followers = user.followers.slice(skip, skip + limit);
    const followersResponse = {
        followers: followers.map((follower) => ({
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
exports.getFollowing = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const user = await models_1.User.findById(userId)
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
    const total = user.following.length;
    const following = user.following.slice(skip, skip + limit);
    const followingResponse = {
        following: following.map((followedUser) => ({
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
exports.getUserFollowStats = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const user = await models_1.User.findById(userId)
        .populate("followers", "_id")
        .populate("following", "_id");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const currentUser = await models_1.User.findById(currentUserId);
    if (!currentUser) {
        return res.status(404).json({ message: "Current user not found" });
    }
    const isFollowing = currentUser.following.includes(userId);
    const stats = {
        followersCount: user.followers.length,
        followingCount: user.following.length,
        isFollowing
    };
    res.status(200).json(stats);
});
exports.checkFollowStatus = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const currentUser = await models_1.User.findById(currentUserId);
    if (!currentUser) {
        return res.status(404).json({ message: "Current user not found" });
    }
    const isFollowing = currentUser.following.includes(userId);
    res.status(200).json({
        isFollowing,
        userId,
        currentUserId: currentUserId.toString()
    });
});
exports.getFollowNotifications = (0, middlewares_1.catchAsync)(async (req, res) => {
    const currentUserId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const notifications = await models_1.Notification.find({
        recipient: currentUserId,
        type: { $in: ["user_followed", "user_unfollowed"] }
    })
        .populate("sender", "username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const total = await models_1.Notification.countDocuments({
        recipient: currentUserId,
        type: { $in: ["user_followed", "user_unfollowed"] }
    });
    const notificationResponses = notifications.map(notification => ({
        id: notification._id.toString(),
        sender: {
            id: notification.sender._id.toString(),
            username: notification.sender.username,
            avatar: notification.sender.avatar
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
