import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Team } from '../models/team.model'
import User from '../models/user.model'
import { catchAsync, invalidateUserCache } from '../middlewares'
import redisService from '../services/redis.service'
import { Role } from '../interfaces'
import { 
  CreateTeamRequest, 
  UpdateTeamRequest, 
  TeamResponse, 
  TeamStatsResponse,
  AddTeamMemberRequest,
  UpdateTeamMemberRoleRequest,
  RemoveTeamMemberRequest
} from '../interfaces'

// Helper function to format team response
const formatTeamResponse = (team: any): TeamResponse => ({
  id: team._id,
  name: team.name,
  description: team.description,
  createdBy: team.createdBy,
  members: team.members,
  projects: team.projects || [],
  isActive: team.isActive,
  settings: team.settings,
  memberCount: team.members.length,
  createdAt: team.createdAt,
  updatedAt: team.updatedAt
})

// Create a new team
export const createTeam = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const teamData: CreateTeamRequest = req.body

  // Create team
  const team = new Team({
    ...teamData,
    createdBy: userId,
    members: [
      {
        user: userId,
        role: 'owner',
        joinedAt: new Date()
      }
    ]
  })

  // Add additional members if provided
  if (teamData.members && teamData.members.length > 0) {
    const additionalMembers = await User.find({ _id: { $in: teamData.members } })
    additionalMembers.forEach((member: any) => {
      team.members.push({
        user: member._id,
        role: 'member',
        joinedAt: new Date()
      })
    })
  }

  await team.save()
  await team.populate('createdBy members.user', 'username email avatar role')

  // Cache the team
  await redisService.cacheTeam((team._id as any).toString(), formatTeamResponse(team));

  // Comprehensive cache invalidation for creator
  await redisService.invalidateAllTeamCaches(userId);

  // Invalidate user team caches for all members
  if (teamData.members && teamData.members.length > 0) {
    for (const memberId of teamData.members) {
      await redisService.invalidateAllTeamCaches(memberId);
    }
  }

  // Invalidate all team list caches
  await redisService.invalidatePattern(`cache:*teams*`);

  res.status(201).json({
    success: true,
    message: 'Team created successfully',
    team: formatTeamResponse(team)
  })
})

// Get all teams for a user
export const getTeams = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const userRole = req.user.role as Role
  const { isActive, search, page = 1, limit = 10 } = req.query

  // Try to get from cache first
  const cacheKey = `user:${userId}:teams:${JSON.stringify({ isActive, search, page, limit })}`
  const cached = await redisService.get(cacheKey)
  
  if (cached) {
    return res.status(200).json(cached)
  }

  // Build query based on role
  // Superadmin can see all teams
  // Admin can only see teams they created
  // Regular users can see teams they created or are members of
  const query: any = {}
  
  if (userRole === Role.Superadmin) {
    // Superadmin can see all teams - no restriction
    query.$or = [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  } else if (userRole === Role.Admin) {
    // Admin can only see teams they created
    query.createdBy = userId
  } else {
    // Regular users can see teams they created or are members of
    query.$or = [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  }

  if (isActive !== undefined) query.isActive = isActive === 'true'
  if (search) {
    query.$and = [
      {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }
    ]
  }

  const teams = await Team.find(query)
    .populate('createdBy', 'username email avatar role')
    .populate('members.user', 'username email avatar role')
    .populate({
      path: 'projects',
      select: 'name description logo status priority progress startDate endDate',
      populate: {
        path: 'createdBy',
        select: 'username avatar'
      }
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)

  const total = await Team.countDocuments(query)

  const response = {
    success: true,
    teams: teams.map(formatTeamResponse),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }

  // Cache the response for 5 minutes
  await redisService.set(cacheKey, response, 300)

  res.status(200).json(response)
})

// Get team by ID
export const getTeamById = catchAsync(async (req: any, res: Response) => {
  const { teamId } = req.params
  const userId = req.user._id
  const userRole = req.user.role as Role

  // Try to get from cache first
  const cached = await redisService.getTeam(teamId)
  if (cached) {
    return res.status(200).json({
      success: true,
      team: cached
    })
  }

  // Build query based on role
  const query: any = { _id: teamId }
  
  if (userRole === Role.Superadmin) {
    // Superadmin can access any team
  } else if (userRole === Role.Admin) {
    // Admin can only access teams they created
    query.createdBy = userId
  } else {
    // Regular users can access teams they created or are members of
    query.$or = [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  }

  const team = await Team.findOne(query)
    .populate('createdBy', 'username email avatar role')
    .populate('members.user', 'username email avatar role')
    .populate({
      path: 'projects',
      select: 'name description logo status priority progress startDate endDate',
      populate: {
        path: 'createdBy',
        select: 'username avatar'
      }
    })

  if (!team) {
    return res.status(404).json({
      success: false,
      message: 'Team not found'
    })
  }

  const teamResponse = formatTeamResponse(team)
  
  // Cache the team
  await redisService.cacheTeam(teamId, teamResponse)

  res.status(200).json({
    success: true,
    team: teamResponse
  })
})

// Update team
export const updateTeam = catchAsync(async (req: any, res: Response) => {
  const { teamId } = req.params
  const userId = req.user._id
  const userRole = req.user.role as Role
  const updateData: UpdateTeamRequest = req.body

  // Build query based on role
  const query: any = { _id: teamId }
  
  if (userRole === Role.Superadmin) {
    // Superadmin can update any team
  } else if (userRole === Role.Admin) {
    // Admin can only update teams they created
    query.createdBy = userId
  } else {
    // Regular users can update teams they created or are admin/owner members of
    query.$or = [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
    ]
  }

  const team = await Team.findOne(query)

  if (!team) {
    return res.status(404).json({
      success: false,
      message: 'Team not found or insufficient permissions'
    })
  }

  Object.assign(team, updateData)
  await team.save()
  await team.populate('createdBy members.user', 'username email avatar role')

  const teamResponse = formatTeamResponse(team)
  
  // Update cache
  await redisService.cacheTeam(teamId, teamResponse)
  
  // Comprehensive cache invalidation
  await redisService.invalidateAllTeamCaches(userId)
  
  // Invalidate caches for all team members
  if (team.members && team.members.length > 0) {
    for (const member of team.members) {
      const memberId = member.user?._id || member.user;
      if (memberId) {
        await redisService.invalidateAllTeamCaches(memberId)
      }
    }
  }
  
  // Invalidate all team list caches
  await redisService.invalidatePattern(`cache:*teams*`)

  res.status(200).json({
    success: true,
    message: 'Team updated successfully',
    team: teamResponse
  })
})

// Delete team
export const deleteTeam = catchAsync(async (req: any, res: Response) => {
  const { teamId } = req.params
  const userId = req.user._id
  const userRole = req.user.role as Role

  // Build query based on role
  const query: any = { _id: teamId }
  
  if (userRole === Role.Superadmin) {
    // Superadmin can delete any team
  } else {
    // Only team creator can delete (admin or regular user)
    query.createdBy = userId
  }

  const team = await Team.findOne(query)

  if (!team) {
    return res.status(404).json({
      success: false,
      message: 'Team not found or insufficient permissions'
    })
  }

  // Get team members before deletion for cache invalidation
  const teamMembers = team.members?.map((m: any) => m.user?.toString() || m.user) || []
  
  await Team.findByIdAndDelete(teamId)

  // Comprehensive cache invalidation
  await redisService.invalidateTeam(teamId)
  await redisService.invalidateAllTeamCaches(userId)
  
  // Invalidate caches for all team members
  for (const memberId of teamMembers) {
    if (memberId) {
      await redisService.invalidateAllTeamCaches(memberId)
    }
  }
  
  // Invalidate all team list caches
  await redisService.invalidatePattern(`cache:*teams*`)

  res.status(200).json({
    success: true,
    message: 'Team deleted successfully'
  })
})

// Add member to team
export const addMember = catchAsync(async (req: any, res: Response) => {
  const { teamId } = req.params
  const userId = req.user._id
  const userRole = req.user.role as Role
  const { userId: newMemberId, role }: AddTeamMemberRequest = req.body

  // Build query based on role
  const query: any = { _id: teamId }
  
  if (userRole === Role.Superadmin) {
    // Superadmin can add members to any team
  } else if (userRole === Role.Admin) {
    // Admin can only add members to teams they created
    query.createdBy = userId
  } else {
    // Regular users can add members to teams they created or are admin/owner members of
    query.$or = [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
    ]
  }

  const team = await Team.findOne(query)

  if (!team) {
    return res.status(404).json({
      success: false,
      message: 'Team not found or insufficient permissions'
    })
  }

  // Check if user is already a member
  const existingMember = team.members.find(member => 
    member.user.toString() === newMemberId
  )

  if (existingMember) {
    return res.status(400).json({
      success: false,
      message: 'User is already a member of this team'
    })
  }

  // Verify the user exists
  const user = await User.findById(newMemberId)
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    })
  }

  team.members.push({
    user: newMemberId as any,
    role: role || 'member',
    joinedAt: new Date()
  })

  await team.save()
  await team.populate('createdBy members.user', 'username email avatar role')

  const teamResponse = formatTeamResponse(team)
  
  // Update cache
  await redisService.cacheTeam(teamId, teamResponse)
  
  // Comprehensive cache invalidation
  await redisService.invalidateAllTeamCaches(userId)
  await redisService.invalidateAllTeamCaches(newMemberId)
  
  // Invalidate caches for all team members
  if (team.members && team.members.length > 0) {
    for (const member of team.members) {
      const memberId = member.user?._id || member.user;
      if (memberId) {
        await redisService.invalidateAllTeamCaches(memberId)
      }
    }
  }
  
  // Invalidate all team list caches
  await redisService.invalidatePattern(`cache:*teams*`)

  res.status(200).json({
    success: true,
    message: 'Member added successfully',
    team: teamResponse
  })
})

// Remove member from team
export const removeMember = catchAsync(async (req: any, res: Response) => {
  const { teamId } = req.params
  const userId = req.user._id
  const userRole = req.user.role as Role
  const { userId: memberToRemove }: RemoveTeamMemberRequest = req.body

  // Build query based on role
  const query: any = { _id: teamId }
  
  if (userRole === Role.Superadmin) {
    // Superadmin can remove members from any team
  } else if (userRole === Role.Admin) {
    // Admin can only remove members from teams they created
    query.createdBy = userId
  } else {
    // Regular users can remove members from teams they created or are admin/owner members of
    query.$or = [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
    ]
  }

  const team = await Team.findOne(query)

  if (!team) {
    return res.status(404).json({
      success: false,
      message: 'Team not found or insufficient permissions'
    })
  }

  // Cannot remove the owner
  if (team.createdBy.toString() === memberToRemove) {
    return res.status(400).json({
      success: false,
      message: 'Cannot remove the team owner'
    })
  }

  team.members = team.members.filter(member => 
    member.user.toString() !== memberToRemove
  )

  await team.save()
  await team.populate('createdBy members.user', 'username email avatar role')

  const teamResponse = formatTeamResponse(team)
  
  // Update cache
  await redisService.cacheTeam(teamId, teamResponse)
  
  // Comprehensive cache invalidation
  await redisService.invalidateAllTeamCaches(userId)
  await redisService.invalidateAllTeamCaches(memberToRemove)
  
  // Invalidate caches for all team members
  if (team.members && team.members.length > 0) {
    for (const member of team.members) {
      const memberId = member.user?._id || member.user;
      if (memberId) {
        await redisService.invalidateAllTeamCaches(memberId)
      }
    }
  }
  
  // Invalidate all team list caches
  await redisService.invalidatePattern(`cache:*teams*`)

  res.status(200).json({
    success: true,
    message: 'Member removed successfully',
    team: teamResponse
  })
})

// Update member role
export const updateMemberRole = catchAsync(async (req: any, res: Response) => {
  const { teamId } = req.params
  const userId = req.user._id
  const userRole = req.user.role as Role
  const { userId: memberId, role }: UpdateTeamMemberRoleRequest = req.body

  // Build query based on role
  const query: any = { _id: teamId }
  
  if (userRole === Role.Superadmin) {
    // Superadmin can update member roles in any team
  } else {
    // Only team creator can update member roles (admin or regular user)
    query.createdBy = userId
  }

  const team = await Team.findOne(query)

  if (!team) {
    return res.status(404).json({
      success: false,
      message: 'Team not found or insufficient permissions'
    })
  }

  const member = team.members.find(m => m.user.toString() === memberId)
  if (!member) {
    return res.status(404).json({
      success: false,
      message: 'Member not found'
    })
  }

  member.role = role
  await team.save()
  await team.populate('createdBy members.user', 'username email avatar role')

  const teamResponse = formatTeamResponse(team)
  
  // Update cache
  await redisService.cacheTeam(teamId, teamResponse)
  
  // Comprehensive cache invalidation
  await redisService.invalidateAllTeamCaches(userId)
  await redisService.invalidateAllTeamCaches(memberId)
  
  // Invalidate caches for all team members
  if (team.members && team.members.length > 0) {
    for (const member of team.members) {
      const memId = member.user?._id || member.user;
      if (memId) {
        await redisService.invalidateAllTeamCaches(memId)
      }
    }
  }
  
  // Invalidate all team list caches
  await redisService.invalidatePattern(`cache:*teams*`)

  res.status(200).json({
    success: true,
    message: 'Member role updated successfully',
    team: teamResponse
  })
})

// Get team statistics
export const getTeamStats = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const userRole = req.user.role as Role

  // Build query based on role
  const query: any = {}
  
  if (userRole === Role.Superadmin) {
    // Superadmin can see stats for all teams
    query.$or = [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  } else if (userRole === Role.Admin) {
    // Admin can only see stats for teams they created
    query.createdBy = userId
  } else {
    // Regular users can see stats for teams they created or are members of
    query.$or = [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  }

  const teams = await Team.find(query)

  const stats: TeamStatsResponse = {
    totalTeams: teams.length,
    activeTeams: teams.filter(t => t.isActive).length,
    totalMembers: teams.reduce((sum, t) => sum + t.members.length, 0),
    totalProjects: teams.reduce((sum, t) => sum + t.projects.length, 0),
    teamsByRole: {
      owner: teams.filter(t => t.createdBy.toString() === userId).length,
      admin: teams.filter(t => 
        t.members.some(m => m.user.toString() === userId && m.role === 'admin')
      ).length,
      member: teams.filter(t => 
        t.members.some(m => m.user.toString() === userId && m.role === 'member')
      ).length
    }
  }

  res.status(200).json({
    success: true,
    stats
  })
})

// Get team members for assignment dropdowns
export const getTeamMembers = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const userRole = req.user.role as Role
  const { teamId } = req.params

  // Build query based on role
  const query: any = { _id: teamId }
  
  if (userRole === Role.Superadmin) {
    // Superadmin can access members of any team
  } else if (userRole === Role.Admin) {
    // Admin can only access members of teams they created
    query.createdBy = userId
  } else {
    // Regular users can access members of teams they created or are members of
    query.$or = [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  }

  const team = await Team.findOne(query)
    .populate('members.user', 'username email avatar role')

  if (!team) {
    return res.status(404).json({
      success: false,
      message: 'Team not found'
    })
  }

  const members = team.members.map(member => ({
    id: (member.user as any)._id,
    username: (member.user as any).username,
    email: (member.user as any).email,
    avatar: (member.user as any).avatar,
    role: member.role
  }))

  res.status(200).json({
    success: true,
    members
  })
})
