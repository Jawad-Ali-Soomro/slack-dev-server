import { Request, Response } from 'express';
import { catchAsync, invalidateCachePattern, invalidateUserCache } from '../middlewares';
import { Permissions } from '../models/permissions.model';
import { User } from '../models';
import { CreatePermissionsRequest } from '../interfaces/permissions.interface';
import { Role } from '../interfaces';
import { Team } from '../models/team.model';

const invalidateUserPermissionCaches = async (userId: string) => {
  await invalidateUserCache(userId);
  await invalidateCachePattern('admin:users:*');
  await invalidateCachePattern('search:users:*');
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

// Get all users with their permissions (Admin only)
export const getAllUsersWithPermissions = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  // Check if user is admin or superadmin
  const adminUser = await User.findById(userId);
  if (!adminUser || (adminUser.role !== Role.Admin && adminUser.role !== Role.Superadmin)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or superadmin role required.'
    });
  }

  let userFilter: any = {};

  if (adminUser.role === Role.Admin) {
    const scopedIds = await getAdminScopedUserIds(adminUser._id.toString());
    userFilter = { _id: { $in: scopedIds } };
  }

  const users = await User.find(userFilter)
    .select('username email role avatar emailVerified createdAt')
    .sort({ createdAt: -1 });

  const usersWithPermissions = await Promise.all(
    users.map(async (user) => {
      const permissions = await Permissions.findOne({ userId: user._id });
      return {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
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

  // Check if user is admin/superadmin or requesting their own permissions
  const currentUser = await User.findById(userId);
  const isSelfRequest = userId === targetUserId;
  const isPrivileged = currentUser?.role === Role.Admin || currentUser?.role === Role.Superadmin;

  if (!currentUser || (!isSelfRequest && !isPrivileged)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied.'
    });
  }

  if (!isSelfRequest && currentUser.role === Role.Admin) {
    const scopedIds = await getAdminScopedUserIds(currentUser._id.toString());
    if (!scopedIds.includes(targetUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Admins can only view permissions for their team members.'
      });
    }
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

  // Check if user is admin or superadmin
  const adminUser = await User.findById(adminId);
  if (!adminUser || (adminUser.role !== Role.Admin && adminUser.role !== Role.Superadmin)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or superadmin role required.'
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

  if (targetUser.role === Role.Superadmin && adminUser.role !== Role.Superadmin) {
    return res.status(403).json({
      success: false,
      message: 'Only superadmin can update superadmin permissions.'
    });
  }

  if (adminUser.role === Role.Admin) {
    const scopedIds = await getAdminScopedUserIds(adminUser._id.toString());
    if (!scopedIds.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Admins can only update permissions for their team members.'
      });
    }
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

  await invalidateUserPermissionCaches(userId);

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

  // Check if user is admin or superadmin
  const adminUser = await User.findById(adminId);
  if (!adminUser || (adminUser.role !== Role.Admin && adminUser.role !== Role.Superadmin)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or superadmin role required.'
    });
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found.'
    });
  }

  if (targetUser.role === Role.Superadmin && adminUser.role !== Role.Superadmin) {
    return res.status(403).json({
      success: false,
      message: 'Only superadmin can manage superadmin permissions.'
    });
  }

  if (adminUser.role === Role.Admin) {
    const scopedIds = await getAdminScopedUserIds(adminUser._id.toString());
    if (!scopedIds.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Admins can only delete permissions for their team members.'
      });
    }
  }

  const permissions = await Permissions.findOneAndDelete({ userId });

  if (!permissions) {
    return res.status(404).json({
      success: false,
      message: 'Permissions not found.'
    });
  }

  await invalidateUserPermissionCaches(userId);

  res.json({
    success: true,
    message: 'Permissions deleted successfully'
  });
});
