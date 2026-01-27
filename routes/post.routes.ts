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


const router = express.Router()

router.use(authenticate)

router.post('/', createPost)
router.get('/', getPosts)
router.get('/trending', getTrendingPosts)
router.get('/user/:userId', getUserPosts)
router.get('/:postId', getPost)
router.put('/:postId', updatePost)
router.delete('/:postId', deletePost)

router.post('/:postId/like', toggleLike)
router.post('/:postId/share', sharePost)
router.post('/:postId/pin', togglePin)

router.post('/:postId/comments', addComment)
router.get('/:postId/comments', getPostComments)
router.put('/:postId/comments/:commentId', updateComment)
router.delete('/:postId/comments/:commentId', deleteComment)
router.post('/:postId/comments/:commentId/like', toggleCommentLike)
router.post('/:postId/comments/:commentId/replies', addReply)
router.post('/:postId/comments/:commentId/reactions', addCommentReaction)

export default router

