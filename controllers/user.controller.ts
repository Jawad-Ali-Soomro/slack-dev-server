import { catchAsync, invalidateUserCache } from "../middlewares";
import { User } from "../models";
import { UpdateProfileRequest, ChangePasswordRequest, UserResponse, IUser, Role } from "../interfaces";
import redisService from "../services/redis.service";
import path from "path";
import fs from "fs";
import { Team } from "../models/team.model";

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
  followingCount: user.following?.length || 0,
  awards: (user as any).awards || [],
  totalChallengePoints: (user as any).totalChallengePoints || 0
});

const invalidateUserListingCaches = async () => {
  await Promise.all([
    redisService.invalidatePattern('admin:users:*'),
    redisService.invalidatePattern('cache:*users*'),
    redisService.invalidatePattern('search:users:*')
  ]);
};

const getAdminScopedUserIds = async (adminId: string) => {
  const teams = await Team.find({ createdBy: adminId }).select('members createdBy');
  const idSet = new Set<string>([adminId]);

  teams.forEach(team => {
    idSet.add(team.createdBy.toString());
    team.members.forEach(member => idSet.add(member.user.toString()));
  });

  return Array.from(idSet);
};

const isUserWithinAdminScope = async (adminId: string, targetUserId: string) => {
  const scopedIds = await getAdminScopedUserIds(adminId);
  return scopedIds.includes(targetUserId);
};

export const getProfile = catchAsync(async (req: any, res: any) => {
  const user = req.user;
  res.status(200).json({
    user: formatUserResponse(user)
  });
});

export const getUserDetails = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;
  const cacheKey = `user:${userId}:details`;
  const user = await User.findById(userId);
  
  console.log('User object:', user ? JSON.stringify(user.toObject(), null, 2) : 'null');

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

  // Find projects where user is creator or member, but exclude team projects
  const projects = await Project.find({
    $or: [
      { createdBy: userId },
      { 'members.user': userId }
    ],
    teamId: { $exists: false } // Exclude team projects
  })
  .populate('createdBy', 'username avatar')
  .select('name description logo status priority progress createdAt members teamId')
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

  // Get awards from user object
  const userAwards = user?.awards || [];
  
  // Always calculate points from challenges to ensure accuracy
  const { Challenge } = await import('../models/challenge.model');
  const allChallenges = await Challenge.find({ 'userSolutions.userId': userId });
  let calculatedPoints = 0;
  
  allChallenges.forEach((ch: any) => {
    const userSolution = ch.userSolutions?.find(
      (sol: any) => {
        const solUserId = typeof sol.userId === 'object' && sol.userId._id 
          ? sol.userId._id.toString() 
          : sol.userId.toString();
        return solUserId === userId.toString();
      }
    );
    if (userSolution && userSolution.isCorrect) {
      calculatedPoints += userSolution.pointsEarned || 0;
    }
  });
  
  // Use calculated points (always accurate)
  const userPoints = calculatedPoints;
  
  // Update user's totalChallengePoints if calculated value is different
  if (calculatedPoints !== (user?.totalChallengePoints || 0)) {
    await User.findByIdAndUpdate(userId, { totalChallengePoints: calculatedPoints });
  }
  
  
  const userResponse = {
    ...formatUserResponse(user as any),
    projects: formattedProjects,
    teams: formattedTeams,
    tasks: formattedTasks,
    meetings: formattedMeetings,
    awards: userAwards,
    totalChallengePoints: userPoints
  };
  
  console.log('Final userResponse awards:', userResponse.awards);
  console.log('Final userResponse totalChallengePoints:', userResponse.totalChallengePoints);

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
    .select('username email avatar role bio userLocation website socialLinks dateOfBirth phone isPrivate emailVerified awards totalChallengePoints');
  
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

/**
 * Superadmin: Assign role to a user
 * Only superadmin can assign roles (admin or user)
 */
export const assignUserRole = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const { role } = req.body;
  const currentUser = req.user;

  // Verify current user is superadmin
  if (currentUser.role !== Role.Superadmin) {
    return res.status(403).json({
      success: false,
      message: 'Only superadmin can assign user roles'
    });
  }

  // Validate role
  if (!role || !Object.values(Role).includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role. Must be one of: user, admin, superadmin'
    });
  }

  // Prevent changing superadmin role (security measure)
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent assigning superadmin role (only one superadmin or manual assignment)
  if (role === Role.Superadmin) {
    return res.status(403).json({
      success: false,
      message: 'Cannot assign superadmin role through API. This must be done manually.'
    });
  }

  // Prevent removing superadmin role
  if (targetUser.role === Role.Superadmin && role !== Role.Superadmin) {
    return res.status(403).json({
      success: false,
      message: 'Cannot change superadmin role'
    });
  }

  // Update user role
  targetUser.role = role as Role;
  await targetUser.save();

  // Invalidate caches
  await invalidateUserCache(userId);
  await invalidateUserListingCaches();

  res.status(200).json({
    success: true,
    message: `User role updated to ${role} successfully`,
    user: formatUserResponse(targetUser)
  });
});

export const updateUserVerification = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const { emailVerified } = req.body;
  const currentUser = req.user;

  if (currentUser.role !== Role.Superadmin && currentUser.role !== Role.Admin) {
    return res.status(403).json({
      success: false,
      message: 'Only admin or superadmin can update email verification'
    });
  }

  if (emailVerified === undefined || emailVerified === null ||
    (typeof emailVerified !== 'boolean' && emailVerified !== 'true' && emailVerified !== 'false')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid emailVerified value. Must be true or false.'
    });
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (currentUser.role === Role.Admin) {
    const inScope = await isUserWithinAdminScope(currentUser._id.toString(), userId);
    if (!inScope) {
      return res.status(403).json({
        success: false,
        message: 'Admins can only update verification for their team members.'
      });
    }

    if (targetUser.role === Role.Superadmin) {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot modify superadmin verification status.'
      });
    }
  }

  const normalizedValue = typeof emailVerified === 'boolean' ? emailVerified : emailVerified === 'true';

  if (targetUser.emailVerified === normalizedValue) {
    return res.status(200).json({
      success: true,
      message: 'Email verification status unchanged',
      user: formatUserResponse(targetUser)
    });
  }

  targetUser.emailVerified = normalizedValue;
  await targetUser.save();

  await invalidateUserCache(userId);
  await invalidateUserListingCaches();

  res.status(200).json({
    success: true,
    message: `Email verification status updated successfully`,
    user: formatUserResponse(targetUser)
  });
});

/**
 * Superadmin: Get all users with role filtering
 * Superadmin can see all users
 * Admin can see users in their teams
 */
export const getAllUsers = catchAsync(async (req: any, res: any) => {
  const currentUser = req.user;
  const { page = 1, limit = 20, search, role } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  // Build filter based on current user role
  let filter: any = {};

  if (currentUser.role === Role.Superadmin) {
    // Superadmin can see all users
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      filter.role = role;
    }
  } else if (currentUser.role === Role.Admin) {
    // Admin can only see users in their teams
    const teams = await Team.find({ createdBy: currentUser._id });
    const teamMemberIds = teams.flatMap(team => 
      team.members.map(member => member.user.toString())
    );
    
    // Include the admin themselves
    teamMemberIds.push(currentUser._id.toString());
    
    filter._id = { $in: teamMemberIds };
    
    if (search) {
      filter.$and = [
        {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or superadmin role required.'
    });
  }

  // Try to get from cache first
  const cacheKey = `admin:users:${JSON.stringify({ page, limit, search, role, userRole: currentUser.role })}`;
  const cached = await redisService.get(cacheKey);
  
  if (cached) {
    return res.status(200).json(cached);
  }

  const users = await User.find(filter)
    .select('username email avatar role bio userLocation emailVerified createdAt')
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
    userLocation: user.userLocation,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt
  }));

  const response = {
    success: true,
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

/**
 * Superadmin: Delete a user
 * Only superadmin can delete users
 */
export const deleteUser = catchAsync(async (req: any, res: any) => {
  const { userId } = req.params;
  const currentUser = req.user;

  // Verify current user is superadmin
  if (currentUser.role !== Role.Superadmin) {
    return res.status(403).json({
      success: false,
      message: 'Only superadmin can delete users'
    });
  }

  // Prevent self-deletion
  if (currentUser._id.toString() === userId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete your own account'
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent deleting superadmin
  if (user.role === Role.Superadmin) {
    return res.status(403).json({
      success: false,
      message: 'Cannot delete superadmin account'
    });
  }

  await User.findByIdAndDelete(userId);

  // Invalidate caches
  await invalidateUserCache(userId);
  await invalidateUserListingCaches();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});
