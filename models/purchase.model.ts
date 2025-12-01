import mongoose, { Document, Schema } from 'mongoose'

export interface IPurchase extends Document {
  user: mongoose.Types.ObjectId
  project: mongoose.Types.ObjectId
  price: number
  status: 'pending' | 'completed' | 'cancelled'
  purchasedAt: Date
  createdAt: Date
  updatedAt: Date
}

const PurchaseSchema = new Schema<IPurchase>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'PublicProject',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  purchasedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Indexes for efficient queries
PurchaseSchema.index({ user: 1, project: 1 }, { unique: true })
PurchaseSchema.index({ user: 1, status: 1 })
PurchaseSchema.index({ project: 1 })

export const Purchase = mongoose.model<IPurchase>('Purchase', PurchaseSchema)


