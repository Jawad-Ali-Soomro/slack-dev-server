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
import { authenticate } from '../middlewares/index'


const postRouter = express.Router()

// global authentication middleware
postRouter.use(authenticate)

postRouter.post('/', createPost)
postRouter.get('/', getPosts)
postRouter.get('/trending', getTrendingPosts)
postRouter.get('/user/:userId', getUserPosts)
postRouter.get('/:postId', getPost)
postRouter.put('/:postId', updatePost)
postRouter.delete('/:postId', deletePost)

postRouter.post('/:postId/like', toggleLike)
postRouter.post('/:postId/share', sharePost)
postRouter.post('/:postId/pin', togglePin)

postRouter.post('/:postId/comments', addComment)
postRouter.get('/:postId/comments', getPostComments)
postRouter.put('/:postId/comments/:commentId', updateComment)
postRouter.delete('/:postId/comments/:commentId', deleteComment)
postRouter.post('/:postId/comments/:commentId/like', toggleCommentLike)
postRouter.post('/:postId/comments/:commentId/replies', addReply)
postRouter.post('/:postId/comments/:commentId/reactions', addCommentReaction)

export default postRouter

