import { Request, Response } from 'express'
import { catchAsync } from '../middlewares/catchAsync'
import { PublicProject, Purchase } from '../models'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_PAYMENT_CURRENCY = process.env.STRIPE_PAYMENT_CURRENCY || 'usd'

const stripeClient = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-09-30.clover' })
  : null

const ensureStripeClient = () => {
  if (!stripeClient) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in the server environment.')
  }
  return stripeClient
}

// Configure multer for zip file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/projects'
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `project-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const fileFilter = (req: any, file: any, cb: any) => {
  // Only allow zip files
  if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || path.extname(file.originalname).toLowerCase() === '.zip') {
    cb(null, true)
  } else {
    cb(new Error('Only ZIP files are allowed!'), false)
  }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for zip files
  },
  fileFilter: fileFilter
})

// Middleware to handle both zip file and preview images
export const uploadProjectFiles = (req: any, res: any, next: any) => {
  const uploadMultiple = multer({
    storage: storage,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow zip files and images
      if (file.fieldname === 'zipFile') {
        if (file.mimetype === 'application/zip' || 
            file.mimetype === 'application/x-zip-compressed' || 
            path.extname(file.originalname).toLowerCase() === '.zip') {
          cb(null, true)
        } else {
          cb(new Error('ZIP file must be a valid zip archive'))
        }
      } else if (file.fieldname === 'previewImages') {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true)
        } else {
          cb(new Error('Preview images must be image files'))
        }
      } else {
        cb(null, true)
      }
    }
  }).fields([
    { name: 'zipFile', maxCount: 1 },
    { name: 'previewImages', maxCount: 5 }
  ])
  
  uploadMultiple(req, res, next)
}

// Create a new public project
export const createPublicProject = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const { title, description, price, category, tags } = req.body

  if (!req.files || !req.files.zipFile || req.files.zipFile.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'ZIP file is required'
    })
  }

  const zipFile = `/projects/${req.files.zipFile[0].filename}`
  
  // Handle preview images
  let previewImages: string[] = []
  if (req.files.previewImages && Array.isArray(req.files.previewImages)) {
    previewImages = req.files.previewImages
      .map((file: any) => `/projects/${file.filename}`)
  }

  const project = await PublicProject.create({
    title,
    description,
    price: parseFloat(price),
    zipFile,
    previewImages,
    category,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
    createdBy: userId,
    isActive: true
  })

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    project
  })
})

// Get all public projects (for explore page)
export const getPublicProjects = catchAsync(async (req: any, res: Response) => {
  const { category, search, createdBy, page = 1, limit = 12, sortBy = 'createdAt', sortOrder = 'desc' } = req.query

  const query: any = { isActive: true }

  if (category) {
    query.category = category
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ]
  }

  if (createdBy) {
    query.createdBy = createdBy
  }

  const sort: any = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1

  const projects = await PublicProject.find(query)
    .populate('createdBy', 'username email avatar')
    .sort(sort)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))

  const total = await PublicProject.countDocuments(query)

  res.status(200).json({
    success: true,
    projects,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  })
})

// Get single public project
export const getPublicProject = catchAsync(async (req: any, res: Response) => {
  const { id } = req.params
  const userId = req.user?._id

  const project = await PublicProject.findById(id)
    .populate('createdBy', 'username email avatar')

  if (!project || !project.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    })
  }

  // Check if user has purchased this project
  let hasPurchased = false
  if (userId) {
    const purchase = await Purchase.findOne({ user: userId, project: id, status: 'completed' })
    hasPurchased = !!purchase
  }

  res.status(200).json({
    success: true,
    project: {
      ...project.toObject(),
      hasPurchased
    }
  })
})

export const createPaymentIntent = catchAsync(async (req: any, res: Response) => {
  const stripe = ensureStripeClient()
  const userId = req.user._id
  const userEmail = req.user.email
  const { projectId } = req.body

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: 'Project ID is required'
    })
  }

  const project = await PublicProject.findById(projectId)
  if (!project || !project.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    })
  }

  if (project.createdBy.toString() === userId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot purchase your own project'
    })
  }

  const existingPurchase = await Purchase.findOne({ user: userId, project: projectId, status: 'completed' })
  if (existingPurchase) {
    return res.status(400).json({
      success: false,
      message: 'You have already purchased this project'
    })
  }

  const amountInCents = Math.max(1, Math.round(project.price * 100))

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: STRIPE_PAYMENT_CURRENCY,
    automatic_payment_methods: { enabled: true },
    metadata: {
      projectId: projectId.toString(),
      userId: userId.toString(),
      projectTitle: project.title
    },
    receipt_email: userEmail || undefined
  })

  res.status(200).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency
  })
})

// Purchase a project (validates Stripe payment)
export const purchaseProject = catchAsync(async (req: any, res: Response) => {
  const stripe = ensureStripeClient()
  const userId = req.user._id
  const { projectId, paymentIntentId } = req.body

  const project = await PublicProject.findById(projectId)
  if (!project || !project.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    })
  }

  // Check if already purchased
  const existingPurchase = await Purchase.findOne({ user: userId, project: projectId })
  if (existingPurchase && existingPurchase.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'You have already purchased this project'
    })
  }

  if (!paymentIntentId) {
    return res.status(400).json({
      success: false,
      message: 'PaymentIntent ID is required to complete the purchase'
    })
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (paymentIntent.status !== 'succeeded') {
    return res.status(400).json({
      success: false,
      message: 'Payment has not been completed'
    })
  }

  if (paymentIntent.metadata?.projectId !== projectId.toString() || paymentIntent.metadata?.userId !== userId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Payment does not match this project or user'
    })
  }

  const expectedAmount = Math.max(1, Math.round(project.price * 100))
  if (paymentIntent.amount !== expectedAmount) {
    return res.status(400).json({
      success: false,
      message: 'Payment amount does not match project price'
    })
  }

  // Create purchase record
  const purchase = await Purchase.findOneAndUpdate(
    { user: userId, project: projectId },
    {
      user: userId,
      project: projectId,
      price: project.price,
      status: 'completed',
      purchasedAt: new Date()
    },
    { upsert: true, new: true }
  )

  // Update purchase count
  await PublicProject.findByIdAndUpdate(projectId, { $inc: { purchaseCount: 1 } })

  res.status(200).json({
    success: true,
    message: 'Project purchased successfully',
    purchase
  })
})

// Get user's purchased and created projects
export const getMyPurchases = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const { page = 1, limit = 12 } = req.query

  // Get purchased projects
  const purchases = await Purchase.find({ user: userId, status: 'completed' })
    .populate({
      path: 'project',
      populate: {
        path: 'createdBy',
        select: 'username email avatar'
      }
    })
    .sort({ purchasedAt: -1 })

  // Get created projects
  const createdProjects = await PublicProject.find({ createdBy: userId, isActive: true })
    .populate('createdBy', 'username email avatar')
    .sort({ createdAt: -1 })

  // Combine and format
  const allProjects = [
    ...purchases.map(p => ({ ...p.toObject(), type: 'purchased', purchaseDate: p.purchasedAt })),
    ...createdProjects.map(p => ({ project: p.toObject(), type: 'created', purchaseDate: p.createdAt }))
  ].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())

  // Paginate
  const total = allProjects.length
  const paginatedProjects = allProjects.slice(
    (parseInt(page) - 1) * parseInt(limit),
    parseInt(page) * parseInt(limit)
  )

  res.status(200).json({
    success: true,
    projects: paginatedProjects,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  })
})

// Download project (purchased or created by user)
export const downloadProject = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const { projectId } = req.params

  const project = await PublicProject.findById(projectId)
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    })
  }

  // Check if user is creator
  const isCreator = project.createdBy.toString() === userId.toString()
  
  // If not creator, verify purchase
  if (!isCreator) {
    const purchase = await Purchase.findOne({ user: userId, project: projectId, status: 'completed' })
    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: 'You have not purchased this project'
      })
    }
  }

  const filePath = path.join('uploads', 'projects', path.basename(project.zipFile))
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'Project file not found'
    })
  }

  res.download(filePath, `${project.title}.zip`)
})

// Delete created project
export const deletePublicProject = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const { projectId } = req.params

  const project = await PublicProject.findById(projectId)
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    })
  }

  // Verify user is creator
  if (project.createdBy.toString() !== userId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own projects'
    })
  }

  // Delete file if exists
  const filePath = path.join('uploads', 'projects', path.basename(project.zipFile))
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  // Delete preview images
  if (project.previewImages && project.previewImages.length > 0) {
    project.previewImages.forEach((imgPath) => {
      const imgFilePath = path.join('uploads', 'projects', path.basename(imgPath))
      if (fs.existsSync(imgFilePath)) {
        fs.unlinkSync(imgFilePath)
      }
    })
  }

  // Delete project from database
  await PublicProject.findByIdAndDelete(projectId)

  res.status(200).json({
    success: true,
    message: 'Project deleted successfully'
  })
})

// Get project categories
export const getCategories = catchAsync(async (req: any, res: Response) => {
  const categories = await PublicProject.distinct('category', { isActive: true })
  
  res.status(200).json({
    success: true,
    categories
  })
})

