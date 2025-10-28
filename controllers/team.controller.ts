import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Team } from '../models/team.model'
import User from '../models/user.model'
import { catchAsync, invalidateUserCache } from '../middlewares'
import redisService from '../services/redis.service'
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

  // Invalidate user team caches
  await redisService.invalidateUserTeams(userId);

  res.status(201).json({
    success: true,
    message: 'Team created successfully',
    team: formatTeamResponse(team)
  })
})

// Get all teams for a user
export const getTeams = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const { isActive, search, page = 1, limit = 10 } = req.query

  // Try to get from cache first
  const cacheKey = `user:${userId}:teams:${JSON.stringify({ isActive, search, page, limit })}`
  const cached = await redisService.get(cacheKey)
  
  if (cached) {
    return res.status(200).json(cached)
  }

  const query: any = {
    $or: [
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

  // Try to get from cache first
  const cached = await redisService.getTeam(teamId)
  if (cached) {
    return res.status(200).json({
      success: true,
      team: cached
    })
  }

  const team = await Team.findOne({
    _id: teamId,
    $or: [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  })
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
  const updateData: UpdateTeamRequest = req.body

  const team = await Team.findOne({
    _id: teamId,
    $or: [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
    ]
  })

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
  
  // Invalidate user team caches
  await redisService.invalidateUserTeams(userId)
  await redisService.invalidatePattern(`user:${userId}:teams:*`)

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

  const team = await Team.findOne({
    _id: teamId,
    createdBy: userId
  })

  if (!team) {
    return res.status(404).json({
      success: false,
      message: 'Team not found or insufficient permissions'
    })
  }

  await Team.findByIdAndDelete(teamId)

  // Invalidate caches
  await redisService.invalidateTeam(teamId)
  await redisService.invalidateUserTeams(userId)
  await redisService.invalidatePattern(`user:${userId}:teams:*`)

  res.status(200).json({
    success: true,
    message: 'Team deleted successfully'
  })
})

// Add member to team
export const addMember = catchAsync(async (req: any, res: Response) => {
  const { teamId } = req.params
  const userId = req.user._id
  const { userId: newMemberId, role }: AddTeamMemberRequest = req.body

  const team = await Team.findOne({
    _id: teamId,
    $or: [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
    ]
  })

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
  
  // Invalidate user team caches
  await redisService.invalidateUserTeams(userId)
  await redisService.invalidatePattern(`user:${userId}:teams:*`)

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
  const { userId: memberToRemove }: RemoveTeamMemberRequest = req.body

  const team = await Team.findOne({
    _id: teamId,
    $or: [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
    ]
  })

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
  
  // Invalidate user team caches
  await redisService.invalidateUserTeams(userId)
  await redisService.invalidatePattern(`user:${userId}:teams:*`)

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
  const { userId: memberId, role }: UpdateTeamMemberRoleRequest = req.body

  const team = await Team.findOne({
    _id: teamId,
    createdBy: userId // Only owner can update roles
  })

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
  
  // Invalidate user team caches
  await redisService.invalidateUserTeams(userId)
  await redisService.invalidatePattern(`user:${userId}:teams:*`)

  res.status(200).json({
    success: true,
    message: 'Member role updated successfully',
    team: teamResponse
  })
})

// Get team statistics
export const getTeamStats = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id

  const teams = await Team.find({
    $or: [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  })

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
  const { teamId } = req.params

  const team = await Team.findOne({
    _id: teamId,
    $or: [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  })
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
