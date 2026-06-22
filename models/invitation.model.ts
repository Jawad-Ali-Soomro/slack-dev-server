import mongoose, { Document, Schema } from "mongoose";

export type InvitationTargetType = "project" | "team";
export type InvitationStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface IInvitation extends Document {
  inviter: mongoose.Types.ObjectId;
  invitee: mongoose.Types.ObjectId;
  targetType: InvitationTargetType;
  targetId: mongoose.Types.ObjectId;
  targetName: string;
  role: string;
  status: InvitationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    inviter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["project", "team"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    targetName: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "member",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

InvitationSchema.index({ invitee: 1, status: 1 });
InvitationSchema.index({ targetType: 1, targetId: 1 });

const Invitation = mongoose.model<IInvitation>("Invitation", InvitationSchema);
export default Invitation;
