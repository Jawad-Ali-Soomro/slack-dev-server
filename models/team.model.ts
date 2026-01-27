import mongoose, { Document, Schema } from 'mongoose'

export interface ITeam extends Document {
  name: string
  description?: string
  createdBy: mongoose.Types.ObjectId
  members: Array<{
    user: mongoose.Types.ObjectId
    role: 'owner' | 'admin' | 'member'
    joinedAt: Date
  }>
  projects: mongoose.Types.ObjectId[]
  isActive: boolean
  settings: {
    allowMemberInvites: boolean
    allowProjectCreation: boolean
  }
  createdAt: Date
  updatedAt: Date
}

const TeamSchema = new Schema<ITeam>({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Team description cannot exceed 500 characters']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  projects: [{
    type: Schema.Types.ObjectId,
    ref: 'Project'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    allowProjectCreation: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
})

TeamSchema.index({ createdBy: 1 })
TeamSchema.index({ 'members.user': 1 })
TeamSchema.index({ isActive: 1 })

TeamSchema.virtual('memberCount').get(function() {
  return this.members.length
})

TeamSchema.pre('save', function(next) {
  const ownerExists = this.members.some(member => 
    member.user.toString() === this.createdBy.toString()
  )
  
  if (!ownerExists) {
    this.members.push({
      user: this.createdBy,
      role: 'owner',
      joinedAt: new Date()
    })
  }
  
  next()
})

export const Team =
  mongoose.models.Team ||
  mongoose.model("Team", TeamSchema)

