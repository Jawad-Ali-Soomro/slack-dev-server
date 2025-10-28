import { catchAsync, invalidateUserCache } from "../middlewares";
import { User } from "../models";
import { UpdateProfileRequest, ChangePasswordRequest, UserResponse, IUser } from "../interfaces";
import redisService from "../services/redis.service";
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

export const getProfile = catchAsync(async (req: any, res: any) => {
  const user = req.user;
  res.status(200).json({
    user: formatUserResponse(user)
  });
});

export const getUserDetails = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  // Try to get from cache first
  const cacheKey = `user:${userId}:details`;
  const cached = await redisService.get(cacheKey);
  
  if (cached) {
    return res.status(200).json(cached);
  }

  // Get basic user details
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Import models
  const { Project } = await import('../models/project.model');
  const Task = (await import('../models/task.model')).default;
  const Meeting = (await import('../models/meeting.model')).default;
  const { Team } = await import('../models/team.model');

  // Find projects where user is creator or member
  const projects = await Project.find({
    $or: [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  })
  .populate('createdBy', 'username avatar')
  .select('name description logo status priority progress createdAt members')
  .sort({ createdAt: -1 });

  // Find tasks where user is assignee or assigner
  const tasks = await Task.find({
    $or: [
      { assignTo: userId },
      { assignedBy: userId }
    ]
  })
  .populate('assignTo assignedBy', 'username avatar')
  .populate('projectId', 'name')
  .select('title status priority createdAt assignTo assignedBy projectId')
  .sort({ createdAt: -1 });

  // Find meetings where user is assigned or creator
  const meetings = await Meeting.find({
    $or: [
      { assignedTo: userId },
      { assignedBy: userId }
    ]
  })
  .populate('assignedTo assignedBy', 'username avatar')
  .populate('projectId', 'name')
  .select('title status type startDate createdAt assignedTo assignedBy projectId')
  .sort({ createdAt: -1 });

  // Find teams where user is member
  const teams = await Team.find({
    'members.user': userId
  })
  .populate('createdBy', 'username avatar')
  .select('name description members createdAt')
  .sort({ createdAt: -1 });

  // Format projects
  const formattedProjects = projects.map((project: any) => ({
    id: project._id,
    name: project.name,
    description: project.description,
    logo: project.logo,
    status: project.status,
    priority: project.priority,
    progress: project.progress,
    role: project.createdBy.toString() === userId ? 'creator' : 'member',
    createdAt: project.createdAt
  }));

  // Format teams with member count and user role
  const formattedTeams = teams.map((team: any) => ({
    id: team._id,
    name: team.name,
    description: team.description,
    members: team.members.length,
    role: team.members.find((member: any) => 
      member.user.toString() === userId
    )?.role || 'member',
    createdAt: team.createdAt
  }));

  // Format tasks
  const formattedTasks = tasks.map((task: any) => ({
    id: task._id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    role: task.assignTo.toString() === userId ? 'assignee' : 'assigner',
    projectName: task.projectId?.name,
    createdAt: task.createdAt
  }));

  // Format meetings
  const formattedMeetings = meetings.map((meeting: any) => ({
    id: meeting._id,
    title: meeting.title,
    status: meeting.status,
    type: meeting.type,
    startDate: meeting.startDate,
    role: meeting.assignedTo.toString() === userId ? 'attendee' : 'organizer',
    projectName: meeting.projectId?.name,
    createdAt: meeting.createdAt
  }));

  const userResponse = {
    ...formatUserResponse(user),
    projects: formattedProjects,
    teams: formattedTeams,
    tasks: formattedTasks,
    meetings: formattedMeetings
  };

  const response = {
    success: true,
    user: userResponse
  };

  // Cache the response for 10 minutes
  await redisService.set(cacheKey, response, 600);

  res.status(200).json(response);
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

  // Invalidate user cache
  await invalidateUserCache(userId);

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

  // Invalidate user cache
  await invalidateUserCache(userId);

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

  // Invalidate user cache
  await invalidateUserCache(userId);

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

export const getUsers = catchAsync(async (req: any, res: any) => {
  const { page = 1, limit = 20, search } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  // Try to get from cache first
  const cacheKey = `users:${JSON.stringify({ page, limit, search })}`;
  const cached = await redisService.get(cacheKey);
  
  if (cached) {
    return res.status(200).json(cached);
  }

  const filter: any = {};
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(filter)
    .select('username email avatar role bio userLocation')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit as string));

  const total = await User.countDocuments(filter);

  const userResponses = users.map(user => ({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=128`,
    role: user.role,
    bio: user.bio,
    userLocation: user.userLocation
  }));

  const response = {
    users: userResponses,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string))
    }
  };

  // Cache the response for 5 minutes
  await redisService.set(cacheKey, response, 300);

  res.status(200).json(response);
});

export const getUserById = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;

  // Try to get from cache first
  const cached = await redisService.getUser(userId);
  if (cached) {
    return res.status(200).json({ user: cached });
  }

  const user = await User.findById(userId)
    .select('username email avatar role bio userLocation website socialLinks dateOfBirth phone isPrivate emailVerified');
  
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  const userResponse = formatUserResponse(user);
  
  // Cache the user for 1 hour
  await redisService.cacheUser(userId, userResponse);

  res.status(200).json({
    user: userResponse
  });
});

export const searchUsers = catchAsync(async (req: any, res: any) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ message: "search query is required" });
  }

  // Try to get from cache first
  const cacheKey = `search:users:${q}`;
  const cached = await redisService.get(cacheKey);
  
  if (cached) {
    return res.status(200).json(cached);
  }

  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } }
    ]
  })
    .select('username email avatar role bio userLocation')
    .limit(10);

  const userResponses = users.map(user => ({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=128`,
    role: user.role,
    bio: user.bio,
    userLocation: user.userLocation
  }));

  const response = {
    users: userResponses
  };

  // Cache the response for 3 minutes
  await redisService.set(cacheKey, response, 180);

  res.status(200).json(response);
});
