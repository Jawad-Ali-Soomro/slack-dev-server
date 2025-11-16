import mongoose, { Document, Schema } from 'mongoose'

export interface IGitHubIssue extends Document {
  _id: string
  title: string
  description?: string
  githubUrl: string
  githubHash: string // GitHub issue number or hash
  status: 'open' | 'closed' | 'in-progress' | 'resolved'
  priority: 'low' | 'medium' | 'high' | 'critical'
  type: 'bug' | 'feature' | 'enhancement' | 'documentation' | 'question'
  repository: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  assignedTo?: mongoose.Types.ObjectId
  team?: mongoose.Types.ObjectId
  labels?: string[]
  estimatedHours?: number
  actualHours?: number
  dueDate?: Date
  resolvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const GitHubIssueSchema = new Schema<IGitHubIssue>({
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
    enum: ['open', 'closed', 'in-progress', 'resolved'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  type: {
    type: String,
    enum: ['bug', 'feature', 'enhancement', 'documentation', 'question'],
    default: 'bug'
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
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
})

// Index for efficient queries
GitHubIssueSchema.index({ repository: 1, status: 1 })
GitHubIssueSchema.index({ createdBy: 1, status: 1 })
GitHubIssueSchema.index({ assignedTo: 1, status: 1 })
GitHubIssueSchema.index({ team: 1, status: 1 })
GitHubIssueSchema.index({ type: 1, status: 1 })
GitHubIssueSchema.index({ githubHash: 1, repository: 1 }, { unique: true })

export const GitHubIssue = mongoose.model<IGitHubIssue>('GitHubIssue', GitHubIssueSchema)

