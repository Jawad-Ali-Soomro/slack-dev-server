import { Request, Response } from 'express'
import mongoose from 'mongoose'
import Post from '../models/post.model'
import User from '../models/user.model'
import { Team } from '../models/team.model'
import { catchAsync } from '../utils/catchAsync'
import redisService from '../services/redis.service'

export const createPost = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id || req.user.id
  const { title, content, images, tags, visibility, teamId } = req.body

  if (visibility === 'team' && teamId) {
    const team = await Team.findOne({
      _id: teamId,
      $or: [
        { createdBy: userId },
        { 'members.user': userId }
      ]
    })

    if (!team) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this team'
      })
    }
  }

  const user = await User.findById(userId).select('username email avatar role')
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    })
  }

  const post = new Post({
    title,
    content,
    images: images || [],
    tags: tags || [],
    visibility,
    teamId: visibility === 'team' ? teamId : undefined,
    author: {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role
    }
  })

  await post.save()

  await redisService.invalidatePattern(`user:${userId}:posts:*`)

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    post
  })
})

export const getPosts = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id || req.user.id
  const { page = 1, limit = 10, visibility, teamId, tags, search } = req.query

  let query: any = {}

  if (visibility === 'public') {
    query.visibility = 'public'
  } else if (visibility === 'team') {
    if (teamId) {

      const team = await Team.findOne({
        _id: teamId,
        $or: [
          { createdBy: userId },
          { 'members.user': userId }
        ]
      })

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this team'
        })
      }

      query.visibility = 'team'
      query.teamId = teamId
    } else {

      const userTeams = await Team.find({
        $or: [
          { createdBy: userId },
          { 'members.user': userId }
        ]
      }).select('_id')

      query.$or = [
        { visibility: 'public' },
        { visibility: 'team', teamId: { $in: userTeams.map((t: any) => t._id) } }
      ]
    }
  } else if (visibility === 'private') {
    query.author._id = userId
    query.visibility = 'private'
  } else {

    const userTeams = await Team.find({
      $or: [
        { createdBy: userId },
        { 'members.user': userId }
      ]
    }).select('_id')

    query.$or = [
      { visibility: 'public' },
      { visibility: 'team', teamId: { $in: userTeams.map((t: any) => t._id) } }
    ]
  }

  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags]
    query.tags = { $in: tagArray }
  }

  if (search) {
    query.content = { $regex: search, $options: 'i' }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const posts = await Post.find(query)
    .sort({ isPinned: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('author._id', 'username email avatar role')
    .populate('teamId', 'name')

  const total = await Post.countDocuments(query)

  const postsWithLikeStatus = posts.map(post => ({
    ...post.toObject(),
    liked: post.likedBy.some(id => id.toString() === userId.toString()),
    likesCount: post.likedBy.length
  }))

  res.status(200).json({
    success: true,
    posts: postsWithLikeStatus,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  })
})

export const getPost = catchAsync(async (req: any, res: Response) => {
  const { postId } = req.params
  const userId = req.user._id || req.user.id
  const { commentsPage = 1, commentsLimit = 10 } = req.query

  const post = await Post.findById(postId)
    .populate('author._id', 'username email avatar role')
    .populate('teamId', 'name')

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  if (post.visibility === 'private' && post.author._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to view this post'
    })
  }

  if (post.visibility === 'team' && post.teamId) {
    const team = await Team.findOne({
      _id: post.teamId,
      $or: [
        { createdBy: userId },
        { 'members.user': userId }
      ]
    })

    if (!team) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this team'
      })
    }
  }

  const isLiked = post.likedBy.some(id => id.toString() === userId.toString())

  const skip = (parseInt(commentsPage as string) - 1) * parseInt(commentsLimit as string)
  const paginatedComments = post.comments
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(skip, skip + parseInt(commentsLimit as string))

  res.status(200).json({
    success: true,
    post: {
      ...post.toObject(),
      comments: paginatedComments
    },
    liked: isLiked,
    likesCount: post.likedBy.length,
    commentsPagination: {
      page: parseInt(commentsPage as string),
      limit: parseInt(commentsLimit as string),
      total: post.comments.length,
      hasMore: skip + parseInt(commentsLimit as string) < post.comments.length
    }
  })
})

export const toggleLike = catchAsync(async (req: any, res: Response) => {
  const { postId } = req.params
  const userId = req.user._id || req.user.id


  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  const userIdStr = userId.toString()
  const likedByStr = post.likedBy.map(id => id.toString())
  const isLiked = likedByStr.includes(userIdStr)

  if (isLiked) {

    post.likedBy = post.likedBy.filter(id => id.toString() !== userIdStr)
    await post.save()

    res.status(200).json({
      success: true,
      message: 'Post unliked',
      liked: false,
      likesCount: post.likedBy.length
    })
  } else {

    post.likedBy.push(userId)
    await post.save()

    res.status(200).json({
      success: true,
      message: 'Post liked',
      liked: true,
      likesCount: post.likedBy.length
    })
  }
})

export const addComment = catchAsync(async (req: any, res: Response) => {
  const { postId } = req.params
  const { content } = req.body
  const userId = req.user._id

  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  const user = await User.findById(userId).select('username avatar')
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    })
  }

  const comment = {
    _id: new mongoose.Types.ObjectId().toString(),
    user: {
      _id: user._id,
      username: user.username,
      avatar: user.avatar || ''
    },
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: []
  }

  post.comments.push(comment)
  await post.save()

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    comment: post.comments[post.comments.length - 1]
  })
})

export const toggleCommentLike = catchAsync(async (req: any, res: Response) => {
  const { postId, commentId } = req.params
  const userId = req.user._id

  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  console.log(req.params)

  const comment = post.comments.find((c: any) => c._id.toString() === commentId.toString())
  console.log(comment)
  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    })
  }

  const existingLike = comment.likes.find((like: any) => like.user.toString() === userId)

  if (existingLike) {

    comment.likes = comment.likes.filter((like: any) => like.user.toString() !== userId)
  } else {

    comment.likes.push({ user: userId, likedAt: new Date() })
  }

  await post.save()

  res.status(200).json({
    success: true,
    message: existingLike ? 'Comment unliked' : 'Comment liked',
    isLiked: !existingLike,
    likesCount: comment.likes.length
  })
})

export const sharePost = catchAsync(async (req: any, res: Response) => {
  const { postId } = req.params
  const userId = req.user._id

  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  const existingShare = post.shares.find(share => share.user.toString() === userId)
  if (existingShare) {
    return res.status(400).json({
      success: false,
      message: 'You have already shared this post'
    })
  }

  post.shares.push({ user: userId, sharedAt: new Date() })
  await post.save()

  res.status(200).json({
    success: true,
    message: 'Post shared successfully',
    sharesCount: post.shares.length
  })
})

export const updatePost = catchAsync(async (req: any, res: Response) => {
  const { postId } = req.params
  const { title, content, images, tags, visibility, teamId } = req.body
  const userId = req.user._id

  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  if (post.author._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'You can only edit your own posts'
    })
  }

  post.title = title || post.title
  post.content = content || post.content
  post.images = images || post.images
  post.tags = tags || post.tags
  post.visibility = visibility || post.visibility
  post.teamId = visibility === 'team' ? teamId : post.teamId
  post.isEdited = true
  post.editedAt = new Date()

  await post.save()

  res.status(200).json({
    success: true,
    message: 'Post updated successfully',
    post
  })
})

export const deletePost = catchAsync(async (req: any, res: Response) => {
  const { postId } = req.params
  const userId = req.user.id

  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  if (post.author._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own posts'
    })
  }

  await Post.findByIdAndDelete(postId)

  res.status(200).json({
    success: true,
    message: 'Post deleted successfully'
  })
})

export const togglePin = catchAsync(async (req: any, res: Response) => {
  const { postId } = req.params
  const userId = req.user._id

  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  if (post.visibility === 'team' && post.teamId) {
    const team = await Team.findOne({
      _id: post.teamId,
      $or: [
        { createdBy: userId },
        { 'members.user': userId, 'members.role': { $in: ['owner', 'admin'] } }
      ]
    })

    if (!team) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to pin posts in this team'
      })
    }
  } else {
    return res.status(400).json({
      success: false,
      message: 'Only team posts can be pinned'
    })
  }

  post.isPinned = !post.isPinned
  await post.save()

  res.status(200).json({
    success: true,
    message: post.isPinned ? 'Post pinned' : 'Post unpinned',
    isPinned: post.isPinned
  })
})

export const getUserPosts = catchAsync(async (req: any, res: Response) => {
  const { userId } = req.params
  const { page = 1, limit = 10 } = req.query

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const posts = await Post.find({ 'author._id': userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('author._id', 'username email avatar role')
    .populate('teamId', 'name')

  const total = await Post.countDocuments({ 'author._id': userId })

  res.status(200).json({
    success: true,
    posts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  })
})

export const getTrendingPosts = catchAsync(async (req: any, res: Response) => {
  const { limit = 10 } = req.query

  const posts = await Post.aggregate([
    {
      $match: {
        visibility: 'public',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }
    },
    {
      $addFields: {
        engagementScore: {
          $add: [
            { $size: '$likedBy' },
            { $multiply: [{ $size: '$comments' }, 2] },
            { $multiply: [{ $size: '$shares' }, 3] }
          ]
        }
      }
    },
    {
      $sort: { engagementScore: -1, createdAt: -1 }
    },
    {
      $limit: parseInt(limit)
    }
  ])

  res.status(200).json({
    success: true,
    posts
  })
})

export const getPostComments = catchAsync(async (req: any, res: Response) => {
  const { postId } = req.params
  const { page = 1, limit = 10 } = req.query
  const userId = req.user._id || req.user.id

  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
  const comments = post.comments
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(skip, skip + parseInt(limit as string))

  const hasMore = skip + parseInt(limit as string) < post.comments.length

  res.status(200).json({
    success: true,
    comments,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: post.comments.length,
      hasMore
    }
  })
})

export const updateComment = catchAsync(async (req: any, res: Response) => {
  const { postId, commentId } = req.params
  const { content } = req.body
  const userId = req.user._id || req.user.id

  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  const comment = post.comments.find((c: any) => c._id.toString() === commentId)
  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    })
  }

  if (comment.user._id.toString() !== userId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only edit your own comments'
    })
  }

  comment.content = content
  comment.updatedAt = new Date()
  await post.save()

  res.status(200).json({
    success: true,
    message: 'Comment updated successfully',
    comment
  })
})

export const deleteComment = catchAsync(async (req: any, res: Response) => {
  const { postId, commentId } = req.params
  const userId = req.user._id || req.user.id

  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  const commentIndex = post.comments.findIndex((c: any) => c._id.toString() === commentId)
  if (commentIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    })
  }

  const comment = post.comments[commentIndex]

  console.log("comment", comment, "userId", userId)

  if (comment.user._id.toString() !== userId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own comments'
    })
  }

  post.comments.splice(commentIndex, 1)
  await post.save()

  res.status(200).json({
    success: true,
    message: 'Comment deleted successfully'
  })
})

export const addReply = catchAsync(async (req: any, res: Response) => {
  const { postId, commentId } = req.params
  const { content } = req.body
  const userId = req.user._id || req.user.id

  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  console.log("commentId", commentId, "postId", postId)


  const comment = post.comments.find((c: any) => c._id.toString() === commentId)
  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    })
  }

  const user = await User.findById(userId).select('username avatar')
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    })
  }

  const reply = {
    _id: new mongoose.Types.ObjectId().toString(),
    user: {
      _id: user._id,
      username: user.username,
      avatar: user.avatar || ''
    },
    content,
    createdAt: new Date(),
    likes: []
  }

  if (!comment.replies) {
    comment.replies = []
  }
  comment.replies.push(reply)
  await post.save()

  res.status(201).json({
    success: true,
    message: 'Reply added successfully',
    reply: comment.replies[comment.replies.length - 1]
  })
})

export const addCommentReaction = catchAsync(async (req: any, res: Response) => {
  const { postId, commentId } = req.params
  const { reactionType } = req.body
  const userId = req.user._id || req.user.id

  const post = await Post.findById(postId)
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    })
  }

  const comment = post.comments.find((c: any) => c._id === commentId)
  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    })
  }

  if (!comment.reactions) {
    comment.reactions = []
  }

  const existingReaction = comment.reactions.find((r: any) => 
    r.user.toString() === userId && r.type === reactionType
  )

  if (existingReaction) {

    comment.reactions = comment.reactions.filter((r: any) => 
      !(r.user.toString() === userId && r.type === reactionType)
    )
  } else {

    comment.reactions.push({
      user: userId,
      type: reactionType,
      createdAt: new Date()
    })
  }

  await post.save()

  res.status(200).json({
    success: true,
    message: existingReaction ? 'Reaction removed' : 'Reaction added',
    reactions: comment.reactions
  })
})
