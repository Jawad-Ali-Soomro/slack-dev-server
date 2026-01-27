import mongoose, { Document, Schema } from 'mongoose'

export interface IProject extends Document {
  name: string
  description: string
  logo?: string
  media?: string[]
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  startDate: Date
  endDate?: Date
  createdBy: mongoose.Types.ObjectId
  teamId?: mongoose.Types.ObjectId
  members: Array<{
    user: mongoose.Types.ObjectId
    role: 'owner' | 'admin' | 'member' | 'viewer'
    joinedAt: Date
  }>
  links: Array<{
    _id?: mongoose.Types.ObjectId
    title: string
    url: string
    type: 'repository' | 'documentation' | 'design' | 'other'
  }>
  tags: string[]
  progress: number // 0-100
  isPublic: boolean
  settings: {
    allowMemberInvites: boolean
    allowMemberTasks: boolean
    allowMemberMeetings: boolean
  }
  stats: {
    totalTasks: number
    completedTasks: number
    totalMeetings: number
    completedMeetings: number
    totalMembers: number
  }
  tasks: mongoose.Types.ObjectId[]
  meetings: mongoose.Types.ObjectId[]
}

const ProjectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true,
    maxlength: [500, 'Project description cannot exceed 500 characters']
  },
  logo: {
    type: String,
    trim: true
  },
  media: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(this: IProject, value: Date) {
        return !value || value > this.startDate
      },
      message: 'End date must be after start date'
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: false
  },
  members: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  links: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['repository', 'documentation', 'design', 'other'],
      default: 'other'
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  settings: {
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    allowMemberTasks: {
      type: Boolean,
      default: true
    },
    allowMemberMeetings: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    totalTasks: {
      type: Number,
      default: 0
    },
    completedTasks: {
      type: Number,
      default: 0
    },
    totalMeetings: {
      type: Number,
      default: 0
    },
    completedMeetings: {
      type: Number,
      default: 0
    },
    totalMembers: {
      type: Number,
      default: 1
    }
  },
  tasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task'
  }],
  meetings: [{
    type: Schema.Types.ObjectId,
    ref: 'Meeting'
  }]
}, {
  timestamps: true
})

ProjectSchema.index({ createdBy: 1 })
ProjectSchema.index({ 'members.user': 1 })
ProjectSchema.index({ status: 1 })
ProjectSchema.index({ priority: 1 })
ProjectSchema.index({ isPublic: 1 })

ProjectSchema.virtual('memberCount').get(function() {
  return this.members.length
})

ProjectSchema.pre('save', function(next) {
  this.stats.totalMembers = this.members.length
  next()
})

export const Project =
  mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema)


