import mongoose, { Document, Schema } from 'mongoose'

export interface IGitHubPR extends Document {
  _id: string
  title: string
  description?: string
  githubUrl: string
  githubHash: string // GitHub PR number or hash
  status: 'open' | 'closed' | 'merged' | 'draft'
  priority: 'low' | 'medium' | 'high' | 'critical'
  repository: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  assignedTo?: mongoose.Types.ObjectId
  team?: mongoose.Types.ObjectId
  labels?: string[]
  estimatedHours?: number
  actualHours?: number
  dueDate?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const GitHubPRSchema = new Schema<IGitHubPR>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  githubUrl: {
    type: String,
    required: true,
    trim: true,
  },
  githubHash: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'merged', 'draft'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  repository: {
    type: Schema.Types.ObjectId,
    ref: 'GitHubRepo',
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  },
  labels: [{
    type: String,
    trim: true
  }],
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0
  },
  dueDate: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
})

// Index for efficient queries
GitHubPRSchema.index({ createdBy: 1, status: 1 })
GitHubPRSchema.index({ assignedTo: 1, status: 1 })
GitHubPRSchema.index({ team: 1, status: 1 })
GitHubPRSchema.index({ githubHash: 1, repository: 1 }, { unique: true })

export const GitHubPR = mongoose.model<IGitHubPR>('GitHubPR', GitHubPRSchema)

