import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser, Role } from "../interfaces";

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true},
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: Role,
    default: Role.User
  },
  emailVerificationToken: {
    type: String
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationTokenExpires: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetTokenExpires: {
    type: Date
  },
  avatar: {
    type: String
  },
  bio: {
    type: String,
    maxlength: 500
  },
  userLocation: {
    type: String
  },
  website: {
    type: String
  },
  socialLinks: {
    twitter: {
      type: String
    },
    linkedin: {
      type: String
    },
    github: {
      type: String
    },
    instagram: {
      type: String
    },
    facebook: {
      type: String
    }
  },
  dateOfBirth: {
    type: Date
  },
  phone: {
    type: String
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  followers: {
    type: [Schema.Types.ObjectId],
    ref: "User",
    default: []
  },
  following: {
    type: [Schema.Types.ObjectId],
    ref: "User",
    default: []
  },
  projects: [{
    type: Schema.Types.ObjectId,
    ref: "Project"
  }],
  teams: [{
    type: Schema.Types.ObjectId,
    ref: "Team"
  }]
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>("User", UserSchema);
export default User;