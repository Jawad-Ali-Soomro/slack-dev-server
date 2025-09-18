import mongoose, { Document, Schema } from "mongoose";

export interface IFollow extends Document {
  follower: mongoose.Types.ObjectId;
  following: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const FollowSchema = new Schema<IFollow>({
  follower: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  following: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  }
}, {
  timestamps: true
});

FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follow = mongoose.model<IFollow>("Follow", FollowSchema);
export default Follow;
