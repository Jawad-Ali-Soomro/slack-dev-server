import mongoose, { Document, Schema } from 'mongoose'

export interface IPublicProject extends Document {
  title: string
  description: string
  price: number
  previewImages: string[] // Array of image URLs for preview
  zipFile: string // Path to the zip file in public/projects folder
  category: string
  tags: string[]
  createdBy: mongoose.Types.ObjectId
  isActive: boolean
  purchaseCount: number
  rating?: number
  createdAt: Date
  updatedAt: Date
}

const PublicProjectSchema = new Schema<IPublicProject>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  previewImages: [{
    type: String,
    trim: true
  }],
  zipFile: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  purchaseCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5
  }
}, {
  timestamps: true
})

PublicProjectSchema.index({ isActive: 1, category: 1 })
PublicProjectSchema.index({ createdBy: 1 })
PublicProjectSchema.index({ tags: 1 })
PublicProjectSchema.index({ price: 1 })

export const PublicProject = mongoose.model<IPublicProject>('PublicProject', PublicProjectSchema)


