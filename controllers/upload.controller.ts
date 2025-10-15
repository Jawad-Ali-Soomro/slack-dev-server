import { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { catchAsync } from '../utils/catchAsync'

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/posts'
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `post-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const fileFilter = (req: any, file: any, cb: any) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed!'), false)
  }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
})

// Upload single image
export const uploadSingleImage = upload.single('image')

// Upload multiple images
export const uploadMultipleImages = upload.array('images', 5) // Max 5 images

// Handle single image upload
export const uploadImage = catchAsync(async (req: any, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file provided'
    })
  }

  const imageUrl = `${process.env.SERVER_URL || 'http://localhost:4000'}/uploads/posts/${req.file.filename}`
  
  res.status(200).json({
    success: true,
    message: 'Image uploaded successfully',
    imageUrl,
    filename: req.file.filename
  })
})

// Handle multiple images upload
export const uploadImages = catchAsync(async (req: any, res: Response) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No image files provided'
    })
  }

  const imageUrls = req.files.map((file: any) => ({
    url: `${process.env.SERVER_URL || 'http://localhost:4000'}/uploads/posts/${file.filename}`,
    filename: file.filename
  }))
  
  res.status(200).json({
    success: true,
    message: 'Images uploaded successfully',
    images: imageUrls
  })
})

// Delete image
export const deleteImage = catchAsync(async (req: any, res: Response) => {
  const { filename } = req.params
  const imagePath = path.join('uploads/posts', filename)
  
  try {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath)
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      })
    } else {
      res.status(404).json({
        success: false,
        message: 'Image not found'
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting image'
    })
  }
})

// Get image
export const getImage = catchAsync(async (req: any, res: Response) => {
  const { filename } = req.params
  const imagePath = path.join('uploads/posts', filename)
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(path.resolve(imagePath))
  } else {
    res.status(404).json({
      success: false,
      message: 'Image not found'
    })
  }
})
