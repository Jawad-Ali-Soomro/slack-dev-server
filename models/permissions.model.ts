import mongoose, { Document, Schema } from "mongoose";
import { IPermissions } from "../interfaces/permissions.interface";

const PermissionsSchema = new Schema<IPermissions>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  canCreateTeam: {
    type: Boolean,
    default: false
  },
  canCreateProject: {
    type: Boolean,
    default: false
  },
  canCreateTask: {
    type: Boolean,
    default: false
  },
  canCreateMeeting: {
    type: Boolean,
    default: false
  },
  canManageUsers: {
    type: Boolean,
    default: false
  },
  canViewAllData: {
    type: Boolean,
    default: false
  },
  grantedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
PermissionsSchema.index({ userId: 1 });
PermissionsSchema.index({ grantedBy: 1 });

export const Permissions = mongoose.model<IPermissions>("Permissions", PermissionsSchema);
