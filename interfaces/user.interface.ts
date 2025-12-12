import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
  _id: string;
  email: string;
  username: string;
  password: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  role: Role;
  emailVerificationToken?: string;
  emailVerified?: boolean;
  emailVerificationTokenExpires?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
  avatar?: string;
  bio?: string;
  userLocation?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
    facebook?: string;
  };
  dateOfBirth?: Date;
  phone?: string;
  isPrivate?: boolean;
  followers?: mongoose.Types.ObjectId[];
  following?: mongoose.Types.ObjectId[];
  projects?: mongoose.Types.ObjectId[];
  teams?: mongoose.Types.ObjectId[];
  awards?: Array<{
    awardId: string;
    name: string;
    icon: string;
    description: string;
    pointsRequired: number;
    earnedAt: Date;
  }>;
  totalChallengePoints?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum Role {
  User = "user",
  Admin = "admin",
  Superadmin = "superadmin"
}