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
  followersCount?: number;
  followingCount?: number;
}

export enum Role {
  User = "user",
  Admin = "admin",
  Superadmin = "superadmin"
}