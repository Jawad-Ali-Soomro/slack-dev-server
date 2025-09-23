import mongoose, { Document, Schema } from 'mongoose'

export interface IFriendRequest extends Document {
  sender: mongoose.Types.ObjectId
  receiver: mongoose.Types.ObjectId
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
  updatedAt: Date
}

export interface IFriendship extends Document {
  user1: mongoose.Types.ObjectId
  user2: mongoose.Types.ObjectId
  createdAt: Date
}

const FriendRequestSchema = new Schema<IFriendRequest>({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
})

const FriendshipSchema = new Schema<IFriendship>({
  user1: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user2: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

// Indexes for better performance
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true })
FriendRequestSchema.index({ receiver: 1, status: 1 })
FriendshipSchema.index({ user1: 1, user2: 1 }, { unique: true })
FriendshipSchema.index({ user1: 1 })
FriendshipSchema.index({ user2: 1 })

export const FriendRequest = mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema)
export const Friendship = mongoose.model<IFriendship>('Friendship', FriendshipSchema)

