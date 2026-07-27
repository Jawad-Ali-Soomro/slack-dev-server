import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser, Role, Availability, JobRole } from "../interfaces/index";

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: Role,
    default: Role.User,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationTokenExpires: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetTokenExpires: {
    type: Date,
  },
  avatar: {
    type: String,
  },
  bio: {
    type: String,
    maxlength: 500,
  },
  userLocation: {
    type: String,
  },
  website: {
    type: String,
  },
  socialLinks: {
    twitter: {
      type: String,
    },
    linkedin: {
      type: String,
    },
    github: {
      id: { type: String },
      username: { type: String },
      email: { type: String },
      avatarUrl: { type: String },
      profileUrl: { type: String },
      accessToken: { type: String },
      refreshToken: { type: String },
      scope: { type: String },
      connectedAt: { type: Date },
    },
    instagram: {
      type: String,
    },
    facebook: {
      type: String,
    },
  },
  dateOfBirth: {
    type: Date,
  },
  phone: {
    type: String,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  followers: {
    type: [Schema.Types.ObjectId],
    ref: "User",
    default: [],
  },
  following: {
    type: [Schema.Types.ObjectId],
    ref: "User",
    default: [],
  },
  projects: [
    {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
  ],
  teams: [
    {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
  ],
  awards: [
    {
      awardId: { type: String, required: true },
      name: { type: String, required: true },
      icon: { type: String, required: true },
      description: { type: String, required: true },
      pointsRequired: { type: Number, required: true },
      earnedAt: { type: Date, default: Date.now },
    },
  ],
  totalChallengePoints: {
    type: Number,
    default: 0,
  },
  availability: {
    type: String,
    enum: Object.values(Availability),
    default: Availability.Available,
  },
  jobRole: {
    type: String,
    enum: Object.values(JobRole),
    default: JobRole.Unassigned,
  },
  statusMessage: {
    type: String,
    maxlength: 140,
  },
});

UserSchema.pre("save", async function (next) {
  const user = this as any;

  if (user.isModified("email") && user.email) {
    user.email = user.email.toLowerCase().trim();
  }

  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 10);
  }

  next();
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>("User", UserSchema);
export default User;
