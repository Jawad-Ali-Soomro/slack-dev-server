import { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catchAsync';
import { Permissions } from '../models/permissions.model';
import { User } from '../models';
import { CreatePermissionsRequest, UpdatePermissionsRequest } from '../interfaces/permissions.interface';

// Get all users with their permissions (Admin only)
export const getAllUsersWithPermissions = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  // Check if user is admin
  const adminUser = await User.findById(userId);
  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }

  const users = await User.find({})
    .select('username email role avatar createdAt')
    .sort({ createdAt: -1 });

  const usersWithPermissions = await Promise.all(
    users.map(async (user) => {
      const permissions = await Permissions.findOne({ userId: user._id });
      return {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
        permissions: permissions ? {
          canCreateTeam: permissions.canCreateTeam,
          canCreateProject: permissions.canCreateProject,
          canCreateTask: permissions.canCreateTask,
          canCreateMeeting: permissions.canCreateMeeting,
          canManageUsers: permissions.canManageUsers,
          canViewAllData: permissions.canViewAllData,
          grantedBy: permissions.grantedBy,
          createdAt: permissions.createdAt,
          updatedAt: permissions.updatedAt
        } : null
      };
    })
  );

  res.json({
    success: true,
    users: usersWithPermissions
  });
});

// Get permissions for a specific user
export const getUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { targetUserId } = req.params;

  // Check if user is admin or requesting their own permissions
  const currentUser = await User.findById(userId);
  if (!currentUser || (currentUser.role !== 'admin' && userId !== targetUserId)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied.'
    });
  }

  const permissions = await Permissions.findOne({ userId: targetUserId })
    .populate('grantedBy', 'username');

  if (!permissions) {
    return res.json({
      success: true,
      permissions: {
        canCreateTeam: false,
        canCreateProject: false,
        canCreateTask: false,
        canCreateMeeting: false,
        canManageUsers: false,
        canViewAllData: false
      }
    });
  }

  res.json({
    success: true,
    permissions: {
      canCreateTeam: permissions.canCreateTeam,
      canCreateProject: permissions.canCreateProject,
      canCreateTask: permissions.canCreateTask,
      canCreateMeeting: permissions.canCreateMeeting,
      canManageUsers: permissions.canManageUsers,
      canViewAllData: permissions.canViewAllData,
      grantedBy: permissions.grantedBy,
      createdAt: permissions.createdAt,
      updatedAt: permissions.updatedAt
    }
  });
});

// Create or update permissions (Admin only)
export const createOrUpdatePermissions = catchAsync(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id;
  const { userId } = req.params;
  const permissionData: CreatePermissionsRequest = req.body;

  // Check if user is admin
  const adminUser = await User.findById(adminId);
  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }

  // Check if target user exists
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found.'
    });
  }

  // Create or update permissions
  const permissions = await Permissions.findOneAndUpdate(
    { userId },
    {
      ...permissionData,
      grantedBy: adminId
    },
    { 
      upsert: true, 
      new: true, 
      runValidators: true 
    }
  ).populate('grantedBy', 'username');

  res.json({
    success: true,
    message: 'Permissions updated successfully',
    permissions: {
      userId: permissions.userId,
      canCreateTeam: permissions.canCreateTeam,
      canCreateProject: permissions.canCreateProject,
      canCreateTask: permissions.canCreateTask,
      canCreateMeeting: permissions.canCreateMeeting,
      canManageUsers: permissions.canManageUsers,
      canViewAllData: permissions.canViewAllData,
      grantedBy: permissions.grantedBy,
      createdAt: permissions.createdAt,
      updatedAt: permissions.updatedAt
    }
  });
});

// Delete permissions (Admin only)
export const deletePermissions = catchAsync(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id;
  const { userId } = req.params;

  // Check if user is admin
  const adminUser = await User.findById(adminId);
  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }

  const permissions = await Permissions.findOneAndDelete({ userId });

  if (!permissions) {
    return res.status(404).json({
      success: false,
      message: 'Permissions not found.'
    });
  }

  res.json({
    success: true,
    message: 'Permissions deleted successfully'
  });
});
