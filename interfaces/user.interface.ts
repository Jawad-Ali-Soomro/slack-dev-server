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
}

export enum Role {
  User = "user",
  Admin = "admin",
  Superadmin = "superadmin"
}