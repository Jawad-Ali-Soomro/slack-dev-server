import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Team } from '../models/team.model'
import User from '../models/user.model'
import { catchAsync } from '../middlewares'
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

  res.status(200).json({
    success: true,
    teams: teams.map(formatTeamResponse),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  })
})

// Get team by ID
export const getTeamById = catchAsync(async (req: any, res: Response) => {
  const { teamId } = req.params
  const userId = req.user._id

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

  res.status(200).json({
    success: true,
    team: formatTeamResponse(team)
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

  res.status(200).json({
    success: true,
    message: 'Team updated successfully',
    team: formatTeamResponse(team)
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


  res.status(200).json({
    success: true,
    message: 'Member added successfully',
    team: formatTeamResponse(team)
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

  res.status(200).json({
    success: true,
    message: 'Member removed successfully',
    team: formatTeamResponse(team)
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

  res.status(200).json({
    success: true,
    message: 'Member role updated successfully',
    team: formatTeamResponse(team)
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
