import express from 'express'
import {
  uploadSingleImage,
  uploadMultipleImages,
  uploadImage,
  uploadImages,
  deleteImage,
  getImage
} from '../controllers/upload.controller'
import { authenticate } from '../middlewares'

const router = express.Router()

router.use(authenticate)

router.post('/single', uploadSingleImage, uploadImage)
router.post('/multiple', uploadMultipleImages, uploadImages)
router.delete('/:filename', deleteImage)
router.get('/:filename', getImage)

export default router

