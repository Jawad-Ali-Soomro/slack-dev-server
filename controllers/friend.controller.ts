import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { FriendRequest, Friendship } from '../models/friend.model'
import User from '../models/user.model'
import Notification from '../models/notification.model'
import redisService from '../services/redis.service'
import { 
  FriendRequestResponse, 
  FriendshipResponse, 
  SendFriendRequestRequest, 
  RespondToFriendRequestRequest,
  FriendStatsResponse 
} from '../interfaces/friend.interfaces'

// Helper function to format friend request response
const formatFriendRequestResponse = (request: any): FriendRequestResponse => ({
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
})

// Helper function to format friendship response
const formatFriendshipResponse = (friendship: any, currentUserId: any): FriendshipResponse => {
  const isUser1 = friendship.user1._id.equals(currentUserId)
  const friend = isUser1 ? friendship.user2 : friendship.user1
  
  return {
    id: friendship._id,
    friend: {
      id: friend._id,
      username: (friend as any).username,
      email: (friend as any).email,
      avatar: (friend as any).avatar
    },
    createdAt: friendship.createdAt
  }
}

// Send friend request
export const sendFriendRequest = catchAsync(async (req: any, res: Response) => {
  const { receiverId } = req.body as SendFriendRequestRequest
  const senderId = req.user._id

  if (senderId.toString() === receiverId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot send friend request to yourself'
    })
  }

  // Check if users exist
  const [sender, receiver] = await Promise.all([
    User.findById(senderId),
    User.findById(receiverId)
  ])

  if (!sender || !receiver) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    })
  }

  // Check if already friends
  const existingFriendship = await Friendship.findOne({
    $or: [
      { user1: senderId, user2: receiverId },
      { user1: receiverId, user2: senderId }
    ]
  })

  if (existingFriendship) {
    return res.status(400).json({
      success: false,
      message: 'Users are already friends'
    })
  }

  // Check if request already exists
  const existingRequest = await FriendRequest.findOne({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId }
    ]
  })

  if (existingRequest) {
    return res.status(400).json({
      success: false,
      message: 'Friend request already exists'
    })
  }

  // Create friend request
  const friendRequest = new FriendRequest({
    sender: senderId,
    receiver: receiverId,
    status: 'pending'
  })

  await friendRequest.save()
  await friendRequest.populate('sender receiver', 'username email avatar')

  // Create notification for receiver
  const notification = new Notification({
    recipient: receiverId,
    sender: senderId,
    type: 'friend_request',
    message: `${sender.username} sent you a friend request`
  })

  await notification.save()

  // Invalidate user friend caches
  await redisService.invalidateUserFriends(senderId.toString())
  await redisService.invalidateUserFriends(receiverId.toString())
  await redisService.invalidateFriendRequests(senderId.toString())
  await redisService.invalidateFriendRequests(receiverId.toString())
  await redisService.invalidateFriendStats(senderId.toString())
  await redisService.invalidateFriendStats(receiverId.toString())

  // Send email notification
  

  res.status(201).json({
    success: true,
    message: 'Friend request sent successfully',
    request: formatFriendRequestResponse(friendRequest)
  })
})

// Get friend requests (sent and received)
export const getFriendRequests = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const { type = 'all' } = req.query // 'sent', 'received', or 'all'

  // Try to get from cache first
  const cacheKey = `user:${userId}:friendRequests:${type}`
  const cached = await redisService.get(cacheKey)
  
  if (cached) {
    return res.status(200).json(cached)
  }

  let query: any = {}
  
  if (type === 'sent') {
    query.sender = userId
  } else if (type === 'received') {
    query.receiver = userId
  } else {
    query.$or = [
      { sender: userId },
      { receiver: userId }
    ]
  }

  const requests = await FriendRequest.find(query)
    .populate('sender receiver', 'username email avatar')
    .sort({ createdAt: -1 })

  const response = {
    success: true,
    requests: requests.map(formatFriendRequestResponse)
  }

  // Cache the response for 5 minutes
  await redisService.set(cacheKey, response, 300)

  res.status(200).json(response)
})

// Respond to friend request
export const respondToFriendRequest = catchAsync(async (req: any, res: Response) => {
  const { requestId, action } = req.body as RespondToFriendRequestRequest
  const userId = req.user._id

  const request = await FriendRequest.findById(requestId)
    .populate('sender receiver', 'username email avatar')

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Friend request not found'
    })
  }

  // Debug the request object
  console.log('Found friend request:', {
    requestId: request._id,
    sender: request.sender,
    receiver: request.receiver,
    status: request.status
  })

  // Debug logging
  console.log('Friend request response debug:', {
    requestId,
    currentUserId: userId.toString(),
    requestReceiverId: request.receiver._id.toString(),
    requestSenderId: request.sender._id.toString(),
    receiverMatch: request.receiver._id.equals(userId),
    senderMatch: request.sender._id.equals(userId)
  })

  if (!request.receiver._id.equals(userId)) {
    return res.status(403).json({
      success: false,
      message: 'You can only respond to requests sent to you'
    })
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Request has already been responded to'
    })
  }

  request.status = action === 'accept' ? 'accepted' : 'rejected'
  await request.save()

  if (action === 'accept') {
    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { user1: request.sender._id, user2: request.receiver._id },
        { user1: request.receiver._id, user2: request.sender._id }
      ]
    })

    if (existingFriendship) {
      return res.status(400).json({
        success: false,
        message: 'Friendship already exists'
      })
    }

    // Ensure sender and receiver are different
    if (request.sender._id.toString() === request.receiver._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create friendship with yourself'
      })
    }

    // Create friendship
    const friendship = new Friendship({
      user1: request.sender._id,
      user2: request.receiver._id
    })
    await friendship.save()

    console.log(`\n=== Created friendship ===`)
    console.log(`Friendship ID: ${friendship._id}`)
    console.log(`User1 (sender): ${request.sender._id} - ${(request.sender as any).username}`)
    console.log(`User2 (receiver): ${request.receiver._id} - ${(request.receiver as any).username}`)
    console.log(`Created at: ${friendship.createdAt}`)

    // Create notification for sender
    const notification = new Notification({
      recipient: request.sender._id,
      sender: request.receiver._id,
      type: 'friend_request_accepted',
      message: `${(request.receiver as any).username} accepted your friend request`
    })
    await notification.save()

    // Invalidate friend caches for both users
    await redisService.invalidateUserFriends(request.sender._id.toString())
    await redisService.invalidateUserFriends(request.receiver._id.toString())
    await redisService.invalidateFriendRequests(request.sender._id.toString())
    await redisService.invalidateFriendRequests(request.receiver._id.toString())
    await redisService.invalidateFriendStats(request.sender._id.toString())
    await redisService.invalidateFriendStats(request.receiver._id.toString())
   
  } else {
    // Create notification for sender about rejection
    const notification = new Notification({
      recipient: request.sender._id,
      sender: request.receiver._id,
      type: 'friend_request_rejected',
      message: `${(request.receiver as any).username} declined your friend request`
    })
    await notification.save()

    // Invalidate friend request caches
    await redisService.invalidateFriendRequests(request.sender._id.toString())
    await redisService.invalidateFriendRequests(request.receiver._id.toString())
    await redisService.invalidateFriendStats(request.sender._id.toString())
    await redisService.invalidateFriendStats(request.receiver._id.toString())
  }

  res.status(200).json({
    success: true,
    message: `Friend request ${action}ed successfully`,
    request: formatFriendRequestResponse(request)
  })
})

// Get friends list
export const getFriends = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id

  // Try to get from cache first
  const cached = await redisService.getUserFriends(userId)
  if (cached && cached.length > 0) {
    return res.status(200).json({
      success: true,
      friends: cached
    })
  }

  const friendships = await Friendship.find({
    $or: [
      { user1: userId },
      { user2: userId }
    ]
  })
    .populate('user1 user2', 'username email avatar')
    .sort({ createdAt: -1 })

  const formattedFriends = friendships
    .map(friendship => formatFriendshipResponse(friendship, userId))
    .filter(friendship => friendship.friend.id !== userId.toString()) // Filter out self-friendships

  // Cache the friends list for 30 minutes
  await redisService.cacheUserFriends(userId, formattedFriends, 1800)

  res.status(200).json({
    success: true,
    friends: formattedFriends
  })
})

// Remove friend
export const removeFriend = catchAsync(async (req: any, res: Response) => {
  const { friendId } = req.params
  const userId = req.user._id

  const friendship = await Friendship.findOne({
    $or: [
      { user1: userId, user2: friendId },
      { user1: friendId, user2: userId }
    ]
  })

  if (!friendship) {
    return res.status(404).json({
      success: false,
      message: 'Friendship not found'
    })
  }

  await Friendship.findByIdAndDelete(friendship._id)

  // Invalidate friend caches for both users
  await redisService.invalidateUserFriends(userId)
  await redisService.invalidateUserFriends(friendId)

  res.status(200).json({
    success: true,
    message: 'Friend removed successfully'
  })
})

// Get friend stats
export const getFriendStats = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id

  // Try to get from cache first
  const cacheKey = `user:${userId}:friendStats`
  const cached = await redisService.get(cacheKey)
  
  if (cached) {
    return res.status(200).json(cached)
  }

  const [totalFriends, pendingSentRequests, pendingReceivedRequests] = await Promise.all([
    Friendship.countDocuments({
      $or: [
        { user1: userId },
        { user2: userId }
      ]
    }),
    FriendRequest.countDocuments({
      sender: userId,
      status: 'pending'
    }),
    FriendRequest.countDocuments({
      receiver: userId,
      status: 'pending'
    })
  ])

  const stats: FriendStatsResponse = {
    totalFriends,
    pendingSentRequests,
    pendingReceivedRequests
  }

  const response = {
    success: true,
    stats
  }

  // Cache the response for 5 minutes
  await redisService.set(cacheKey, response, 300)

  res.status(200).json(response)
})

// Search users for friend requests
export const searchUsersForFriends = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const { search = '', limit = 20 } = req.query

  // Try to get from cache first
  const cacheKey = `search:friends:${userId}:${search}:${limit}`
  const cached = await redisService.get(cacheKey)
  
  if (cached) {
    return res.status(200).json(cached)
  }

  // Get current user's friends
  const friendships = await Friendship.find({
    $or: [
      { user1: userId },
      { user2: userId }
    ]
  })

  const friendIds = friendships.map(f => 
    f.user1._id.toString() === userId ? f.user2._id : f.user1._id
  )

  // Get pending requests
  const pendingRequests = await FriendRequest.find({
    $or: [
      { sender: userId },
      { receiver: userId }
    ],
    status: 'pending'
  })

  const pendingUserIds = pendingRequests.map(r => 
    r.sender._id.toString() === userId ? r.receiver._id : r.sender._id
  )

  // Search users excluding current user, friends, and pending requests
  const searchQuery: any = {
    _id: { 
      $nin: [userId, ...friendIds, ...pendingUserIds] 
    }
  }

  if (search) {
    searchQuery.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]
  }

  const users = await User.find(searchQuery)
    .select('username email avatar')
    .limit(parseInt(limit as string))

  const response = {
    success: true,
    users: users.map((user: any) => ({
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar
    }))
  }

  // Cache the response for 3 minutes
  await redisService.set(cacheKey, response, 180)

  res.status(200).json(response)
})
