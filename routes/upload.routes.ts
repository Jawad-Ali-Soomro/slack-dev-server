import express from 'express'
import {
  uploadSingleImage,
  uploadMultipleImages,
  uploadImage,
  uploadImages,
  deleteImage,
  getImage
} from '../controllers/upload.controller'
import { authenticate } from '../middlewares/index'

const uploadRouter = express.Router()

uploadRouter.use(authenticate)

uploadRouter.post('/single', uploadSingleImage, uploadImage)
uploadRouter.post('/multiple', uploadMultipleImages, uploadImages)
uploadRouter.delete('/:filename', deleteImage)
uploadRouter.get('/:filename', getImage)

export default uploadRouter

