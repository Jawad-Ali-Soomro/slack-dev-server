import { catchAsync } from "../middlewares";
import { User } from "../models";
import { UpdateProfileRequest, ChangePasswordRequest, UserResponse, IUser } from "../interfaces";
import path from "path";
import fs from "fs";

const formatUserResponse = (user: IUser): UserResponse => ({
  id: user._id,
  email: user.email,
  username: user.username,
  role: user.role,
  avatar: user.avatar,
  bio: user.bio,
  userLocation: user.userLocation,
  website: user.website,
  socialLinks: user.socialLinks,
  dateOfBirth: user.dateOfBirth,
  phone: user.phone,
  isPrivate: user.isPrivate,
  emailVerified: user.emailVerified,
  followersCount: user.followers?.length || 0,
  followingCount: user.following?.length || 0
});

export const updateProfile = catchAsync(async (req: any, res: any) => {
  const { username, bio, userLocation, website, socialLinks, dateOfBirth, phone, isPrivate }: UpdateProfileRequest = req.body;
  const userId = req.user._id;

  const updateData: any = {};
  if (username) updateData.username = username;
  if (bio !== undefined) updateData.bio = bio;
  if (userLocation !== undefined) updateData.userLocation = userLocation;
  if (website !== undefined) updateData.website = website;
  if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
  if (phone !== undefined) updateData.phone = phone;
  if (isPrivate !== undefined) updateData.isPrivate = isPrivate;

  if (username) {
    const existingUser = await User.findOne({ username, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({ message: "username already taken" });
    }
  }

  const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
  
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  res.status(200).json({
    message: "profile updated successfully",
    user: formatUserResponse(user)
  });
});

export const uploadAvatar = catchAsync(async (req: any, res: any) => {
  const userId = req.user._id;
  
  if (!req.file) {
    return res.status(400).json({ message: "no file uploaded" });
  }

  const user = await User.findById(userId);
  
  if (user && user.avatar) {
    const oldAvatarPath = path.join(__dirname, "../uploads/profiles", path.basename(user.avatar));
    if (fs.existsSync(oldAvatarPath)) {
      fs.unlinkSync(oldAvatarPath);
    }
  }

  const avatarUrl = `/profiles/${req.file.filename}`;
  
  const updatedUser = await User.findByIdAndUpdate(
    userId, 
    { avatar: avatarUrl }, 
    { new: true }
  );

  if (!updatedUser) {
    return res.status(404).json({ message: "user not found" });
  }

  res.status(200).json({
    message: "avatar uploaded successfully", 
    user: formatUserResponse(updatedUser)
  });
});

export const deleteAvatar = catchAsync(async (req: any, res: any) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  if (!user.avatar) {
    return res.status(400).json({ message: "no avatar to delete" });
  }

  const avatarPath = path.join(__dirname, "../uploads/profiles", path.basename(user.avatar));
  if (fs.existsSync(avatarPath)) {
    fs.unlinkSync(avatarPath);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $unset: { avatar: 1 } },
    { new: true }
  );

  if (!updatedUser) {
    return res.status(404).json({ message: "user not found" });
  }

  res.status(200).json({
    message: "avatar deleted successfully",
    user: formatUserResponse(updatedUser)
  });
});

export const changePassword = catchAsync(async (req: any, res: any) => {
  const { currentPassword, newPassword }: ChangePasswordRequest = req.body;
  const userId = req.user._id;

  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ message: "current password is incorrect" });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ message: "password changed successfully" });
});
