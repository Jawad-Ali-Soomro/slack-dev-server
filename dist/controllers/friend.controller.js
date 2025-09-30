"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsersForFriends = exports.getFriendStats = exports.removeFriend = exports.getFriends = exports.respondToFriendRequest = exports.getFriendRequests = exports.sendFriendRequest = void 0;
const catchAsync_1 = require("../utils/catchAsync");
const friend_model_1 = require("../models/friend.model");
const user_model_1 = __importDefault(require("../models/user.model"));
const notification_model_1 = __importDefault(require("../models/notification.model"));
// Helper function to format friend request response
const formatFriendRequestResponse = (request) => ({
    id: request._id,
    sender: {
        id: request.sender._id,
        username: request.sender.username,
        email: request.sender.email,
        avatar: request.sender.avatar
    },
    receiver: {
        id: request.receiver._id,
        username: request.receiver.username,
        email: request.receiver.email,
        avatar: request.receiver.avatar
    },
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
});
// Helper function to format friendship response
const formatFriendshipResponse = (friendship, currentUserId) => {
    const isUser1 = friendship.user1._id.equals(currentUserId);
    const friend = isUser1 ? friendship.user2 : friendship.user1;
    console.log(`Formatting friendship ${friendship._id}:`, {
        currentUserId: currentUserId.toString(),
        user1Id: friendship.user1._id.toString(),
        user2Id: friendship.user2._id.toString(),
        isUser1,
        friendId: friend._id.toString(),
        friendUsername: friend.username
    });
    return {
        id: friendship._id,
        friend: {
            id: friend._id,
            username: friend.username,
            email: friend.email,
            avatar: friend.avatar
        },
        createdAt: friendship.createdAt
    };
};
// Send friend request
exports.sendFriendRequest = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { receiverId } = req.body;
    const senderId = req.user._id;
    if (senderId.toString() === receiverId.toString()) {
        return res.status(400).json({
            success: false,
            message: 'Cannot send friend request to yourself'
        });
    }
    // Check if users exist
    const [sender, receiver] = await Promise.all([
        user_model_1.default.findById(senderId),
        user_model_1.default.findById(receiverId)
    ]);
    if (!sender || !receiver) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }
    // Check if already friends
    const existingFriendship = await friend_model_1.Friendship.findOne({
        $or: [
            { user1: senderId, user2: receiverId },
            { user1: receiverId, user2: senderId }
        ]
    });
    if (existingFriendship) {
        return res.status(400).json({
            success: false,
            message: 'Users are already friends'
        });
    }
    // Check if request already exists
    const existingRequest = await friend_model_1.FriendRequest.findOne({
        $or: [
            { sender: senderId, receiver: receiverId },
            { sender: receiverId, receiver: senderId }
        ]
    });
    if (existingRequest) {
        return res.status(400).json({
            success: false,
            message: 'Friend request already exists'
        });
    }
    // Create friend request
    const friendRequest = new friend_model_1.FriendRequest({
        sender: senderId,
        receiver: receiverId,
        status: 'pending'
    });
    await friendRequest.save();
    await friendRequest.populate('sender receiver', 'username email avatar');
    // Create notification for receiver
    const notification = new notification_model_1.default({
        recipient: receiverId,
        sender: senderId,
        type: 'friend_request',
        message: `${sender.username} sent you a friend request`
    });
    await notification.save();
    // Send email notification
    res.status(201).json({
        success: true,
        message: 'Friend request sent successfully',
        request: formatFriendRequestResponse(friendRequest)
    });
});
// Get friend requests (sent and received)
exports.getFriendRequests = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const { type = 'all' } = req.query; // 'sent', 'received', or 'all'
    let query = {};
    if (type === 'sent') {
        query.sender = userId;
    }
    else if (type === 'received') {
        query.receiver = userId;
    }
    else {
        query.$or = [
            { sender: userId },
            { receiver: userId }
        ];
    }
    const requests = await friend_model_1.FriendRequest.find(query)
        .populate('sender receiver', 'username email avatar')
        .sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        requests: requests.map(formatFriendRequestResponse)
    });
});
// Respond to friend request
exports.respondToFriendRequest = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { requestId, action } = req.body;
    const userId = req.user._id;
    const request = await friend_model_1.FriendRequest.findById(requestId)
        .populate('sender receiver', 'username email avatar');
    if (!request) {
        return res.status(404).json({
            success: false,
            message: 'Friend request not found'
        });
    }
    // Debug the request object
    console.log('Found friend request:', {
        requestId: request._id,
        sender: request.sender,
        receiver: request.receiver,
        status: request.status
    });
    // Debug logging
    console.log('Friend request response debug:', {
        requestId,
        currentUserId: userId.toString(),
        requestReceiverId: request.receiver._id.toString(),
        requestSenderId: request.sender._id.toString(),
        receiverMatch: request.receiver._id.equals(userId),
        senderMatch: request.sender._id.equals(userId)
    });
    if (!request.receiver._id.equals(userId)) {
        return res.status(403).json({
            success: false,
            message: 'You can only respond to requests sent to you'
        });
    }
    if (request.status !== 'pending') {
        return res.status(400).json({
            success: false,
            message: 'Request has already been responded to'
        });
    }
    request.status = action === 'accept' ? 'accepted' : 'rejected';
    await request.save();
    if (action === 'accept') {
        // Check if friendship already exists
        const existingFriendship = await friend_model_1.Friendship.findOne({
            $or: [
                { user1: request.sender._id, user2: request.receiver._id },
                { user1: request.receiver._id, user2: request.sender._id }
            ]
        });
        if (existingFriendship) {
            return res.status(400).json({
                success: false,
                message: 'Friendship already exists'
            });
        }
        // Ensure sender and receiver are different
        if (request.sender._id.toString() === request.receiver._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create friendship with yourself'
            });
        }
        // Create friendship
        const friendship = new friend_model_1.Friendship({
            user1: request.sender._id,
            user2: request.receiver._id
        });
        await friendship.save();
        console.log(`\n=== Created friendship ===`);
        console.log(`Friendship ID: ${friendship._id}`);
        console.log(`User1 (sender): ${request.sender._id} - ${request.sender.username}`);
        console.log(`User2 (receiver): ${request.receiver._id} - ${request.receiver.username}`);
        console.log(`Created at: ${friendship.createdAt}`);
        // Create notification for sender
        const notification = new notification_model_1.default({
            recipient: request.sender._id,
            sender: request.receiver._id,
            type: 'friend_request_accepted',
            message: `${request.receiver.username} accepted your friend request`
        });
        await notification.save();
    }
    else {
        // Create notification for sender about rejection
        const notification = new notification_model_1.default({
            recipient: request.sender._id,
            sender: request.receiver._id,
            type: 'friend_request_rejected',
            message: `${request.receiver.username} declined your friend request`
        });
        await notification.save();
    }
    res.status(200).json({
        success: true,
        message: `Friend request ${action}ed successfully`,
        request: formatFriendRequestResponse(request)
    });
});
// Get friends list
exports.getFriends = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    console.log(`\n=== Getting friends for user: ${userId} ===`);
    // First, let's check all friendships in the database
    const allFriendships = await friend_model_1.Friendship.find().populate('user1 user2', 'username email avatar');
    console.log(`Total friendships in database: ${allFriendships.length}`);
    allFriendships.forEach((fs, index) => {
        console.log(`All friendship ${index + 1}:`, {
            id: fs._id,
            user1: fs.user1._id.toString(),
            user2: fs.user2._id.toString(),
            user1Username: fs.user1.username,
            user2Username: fs.user2.username
        });
    });
    const friendships = await friend_model_1.Friendship.find({
        $or: [
            { user1: userId },
            { user2: userId }
        ]
    })
        .populate('user1 user2', 'username email avatar')
        .sort({ createdAt: -1 });
    console.log(`Found ${friendships.length} friendships for user ${userId}`);
    friendships.forEach((friendship, index) => {
        console.log(`Friendship ${index + 1}:`, {
            friendshipId: friendship._id,
            user1: {
                id: friendship.user1._id.toString(),
                username: friendship.user1.username
            },
            user2: {
                id: friendship.user2._id.toString(),
                username: friendship.user2.username
            },
            currentUserIsUser1: friendship.user1._id.equals(userId),
            currentUserIsUser2: friendship.user2._id.equals(userId)
        });
    });
    const formattedFriends = friendships
        .map(friendship => formatFriendshipResponse(friendship, userId))
        .filter(friendship => friendship.friend.id !== userId.toString()); // Filter out self-friendships
    console.log(`Formatted friends for user ${userId}:`, formattedFriends.map(f => ({
        id: f.friend.id,
        username: f.friend.username
    })));
    // Additional check: let's see if the issue is with the filter
    const beforeFilter = friendships.map(friendship => formatFriendshipResponse(friendship, userId));
    console.log(`Before filtering for user ${userId}:`, beforeFilter.map(f => ({
        id: f.friend.id,
        username: f.friend.username
    })));
    res.status(200).json({
        success: true,
        friends: formattedFriends
    });
});
// Remove friend
exports.removeFriend = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user._id;
    const friendship = await friend_model_1.Friendship.findOne({
        $or: [
            { user1: userId, user2: friendId },
            { user1: friendId, user2: userId }
        ]
    });
    if (!friendship) {
        return res.status(404).json({
            success: false,
            message: 'Friendship not found'
        });
    }
    await friend_model_1.Friendship.findByIdAndDelete(friendship._id);
    res.status(200).json({
        success: true,
        message: 'Friend removed successfully'
    });
});
// Get friend stats
exports.getFriendStats = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const [totalFriends, pendingSentRequests, pendingReceivedRequests] = await Promise.all([
        friend_model_1.Friendship.countDocuments({
            $or: [
                { user1: userId },
                { user2: userId }
            ]
        }),
        friend_model_1.FriendRequest.countDocuments({
            sender: userId,
            status: 'pending'
        }),
        friend_model_1.FriendRequest.countDocuments({
            receiver: userId,
            status: 'pending'
        })
    ]);
    const stats = {
        totalFriends,
        pendingSentRequests,
        pendingReceivedRequests
    };
    res.status(200).json({
        success: true,
        stats
    });
});
// Search users for friend requests
exports.searchUsersForFriends = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const { search = '', limit = 20 } = req.query;
    // Get current user's friends
    const friendships = await friend_model_1.Friendship.find({
        $or: [
            { user1: userId },
            { user2: userId }
        ]
    });
    const friendIds = friendships.map(f => f.user1._id.toString() === userId ? f.user2._id : f.user1._id);
    // Get pending requests
    const pendingRequests = await friend_model_1.FriendRequest.find({
        $or: [
            { sender: userId },
            { receiver: userId }
        ],
        status: 'pending'
    });
    const pendingUserIds = pendingRequests.map(r => r.sender._id.toString() === userId ? r.receiver._id : r.sender._id);
    // Search users excluding current user, friends, and pending requests
    const searchQuery = {
        _id: {
            $nin: [userId, ...friendIds, ...pendingUserIds]
        }
    };
    if (search) {
        searchQuery.$or = [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }
    const users = await user_model_1.default.find(searchQuery)
        .select('username email avatar')
        .limit(parseInt(limit));
    res.status(200).json({
        success: true,
        users: users.map((user) => ({
            id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar
        }))
    });
});
