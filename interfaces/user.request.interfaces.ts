export interface UpdateProfileRequest {
  username?: string;
  email?: string;
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
  emailVerified?: boolean;
}
