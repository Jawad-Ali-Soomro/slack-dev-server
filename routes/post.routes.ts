import express from 'express'
import {
  createPost,
  getPosts,
  getPost,
  toggleLike,
  addComment,
  toggleCommentLike,
  sharePost,
  updatePost,
  deletePost,
  togglePin,
  getUserPosts,
  getTrendingPosts,
  getPostComments,
  updateComment,
  deleteComment,
  addReply,
  addCommentReaction
} from '../controllers/post.controller'
import { authenticate } from '../middlewares'
// authenticate

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Post CRUD operations
router.post('/', createPost)
router.get('/', getPosts)
router.get('/trending', getTrendingPosts)
router.get('/user/:userId', getUserPosts)
router.get('/:postId', getPost)
router.put('/:postId', updatePost)
router.delete('/:postId', deletePost)

// Post interactions
router.post('/:postId/like', toggleLike)
router.post('/:postId/share', sharePost)
router.post('/:postId/pin', togglePin)

// Comment operations
router.post('/:postId/comments', addComment)
router.get('/:postId/comments', getPostComments)
router.put('/:postId/comments/:commentId', updateComment)
router.delete('/:postId/comments/:commentId', deleteComment)
router.post('/:postId/comments/:commentId/like', toggleCommentLike)
router.post('/:postId/comments/:commentId/replies', addReply)
router.post('/:postId/comments/:commentId/reactions', addCommentReaction)

export default router

