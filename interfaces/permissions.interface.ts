import mongoose, { Document } from "mongoose";

export interface IPermissions extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  canCreateTeam: boolean;
  canCreateProject: boolean;
  canCreateTask: boolean;
  canCreateMeeting: boolean;
  canManageUsers: boolean;
  canViewAllData: boolean;
  grantedBy: mongoose.Types.ObjectId; // Admin who granted these permissions
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePermissionsRequest {
  canCreateTeam: boolean;
  canCreateProject: boolean;
  canCreateTask: boolean;
  canCreateMeeting: boolean;
  canManageUsers: boolean;
  canViewAllData: boolean;
}

export interface UpdatePermissionsRequest {
  canCreateTeam?: boolean;
  canCreateProject?: boolean;
  canCreateTask?: boolean;
  canCreateMeeting?: boolean;
  canManageUsers?: boolean;
  canViewAllData?: boolean;
}
