import mongoose, { Document, Schema } from 'mongoose'

export interface IGitHubRepo extends Document {
  _id: string
  owner: mongoose.Types.ObjectId
  name: string
  description?: string
  githubUrl: string
  language?: string
  isPrivate: boolean
  createdBy: mongoose.Types.ObjectId
  contributors?: mongoose.Types.ObjectId[]
  team?: mongoose.Types.ObjectId
  tags?: string[]
  status: 'active' | 'archived' | 'deprecated'
  createdAt: Date
  updatedAt: Date
}

const GitHubRepoSchema = new Schema<IGitHubRepo>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
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
    validate: {
      validator: function(v: string) {
        return /^https:\/\/github\.com\/[^\/]+\/[^\/]+$/.test(v)
      },
      message: 'Invalid GitHub repository URL'
    }
  },
  language: {
    type: String,
    trim: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contributors: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'deprecated'],
    default: 'active'
  }
}, {
  timestamps: true
})

// Index for efficient queries
GitHubRepoSchema.index({ createdBy: 1, status: 1 })
GitHubRepoSchema.index({ owner: 1, name: 1 })
GitHubRepoSchema.index({ contributors: 1 })
GitHubRepoSchema.index({ team: 1 })

// Ensure unique repository per user
GitHubRepoSchema.index({ githubUrl: 1, createdBy: 1 }, { unique: true })

export const GitHubRepo = mongoose.model<IGitHubRepo>('GitHubRepo', GitHubRepoSchema)
