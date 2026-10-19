import { Availability, IUser, JobRole } from "./user.interface";

export interface UpdateProfileRequest {
  username?: string;
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
  availability?: string;
  jobRole?: string;
  statusMessage?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  role: string;
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
  followersCount?: number;
  followingCount?: number;
  emailVerified?: boolean;
  availability?: string;
  jobRole?: string;
  statusMessage?: string;
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


export const formatUserResponse = (user: IUser): UserResponse => ({
  id: user._id,
  email: user.email,
  username: user.username,
  role: user.role,
  avatar: user.avatar,
  emailVerified: user.emailVerified,
  isPrivate: user.isPrivate,
  createdAt: user.createdAt,
  socialLinks: user?.socialLinks,
  availability: (user as any).availability || Availability.Available,
  jobRole: (user as any).jobRole || JobRole.Unassigned,
  statusMessage: (user as any).statusMessage
});
