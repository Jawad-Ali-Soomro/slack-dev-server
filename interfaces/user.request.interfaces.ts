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
  createdAt?: Date;
  updatedAt?: Date;
}
