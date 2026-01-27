import mongoose, { Document, Schema } from 'mongoose'

export interface IPost extends Document {
  _id: string
  title: string
  content: string
  author: {
    _id: string
    username: string
    email: string
    avatar: string
    role: string
  }
  images?: string[]
  tags?: string[]
  visibility: 'public' | 'team' | 'private'
  teamId?: string
  likedBy: string[]
  comments: {
    _id: string
    user: {
      _id: string
      username: string
      avatar: string
    }
    content: string
    createdAt: Date
    updatedAt: Date
    likes: {
      user: string
      likedAt: Date
    }[]
    replies?: {
      _id: string
      user: {
        _id: string
        username: string
        avatar: string
      }
      content: string
      createdAt: Date
      likes: {
        user: string
        likedAt: Date
      }[]
    }[]
    reactions?: {
      user: string
      type: string
      createdAt: Date
    }[]
  }[]
  shares: {
    user: string
    sharedAt: Date
  }[]
  isPinned: boolean
  isEdited: boolean
  editedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const PostSchema = new Schema<IPost>({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  author: {
    _id: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      default: 'user'
    }
  },
  images: [{
    type: String
  }],
  tags: [{
    type: String,
    lowercase: true
  }],
  visibility: {
    type: String,
    enum: ['public', 'team', 'private'],
    default: 'public'
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: function() {
      return this.visibility === 'team'
    }
  },
  likedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      username: {
        type: String,
        required: true
      },
      avatar: {
        type: String,
        default: ''
      }
    },
    content: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    likes: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      likedAt: {
        type: Date,
        default: Date.now
      }
    }],
    replies: [{
      user: {
        _id: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        username: {
          type: String,
          required: true
        },
        avatar: {
          type: String,
          default: ''
        }
      },
      content: {
        type: String,
        required: true,
        maxlength: 500
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      likes: [{
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        likedAt: {
          type: Date,
          default: Date.now
        }
      }]
    }],
    reactions: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      type: {
        type: String,
        enum: ['like', 'love', 'laugh', 'angry', 'sad'],
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  shares: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
})

PostSchema.index({ author: 1, createdAt: -1 })
PostSchema.index({ visibility: 1, createdAt: -1 })
PostSchema.index({ teamId: 1, createdAt: -1 })
PostSchema.index({ tags: 1 })
PostSchema.index({ 'likedBy': 1 })
PostSchema.index({ 'comments.user._id': 1 })

export default mongoose.model<IPost>('Post', PostSchema)
