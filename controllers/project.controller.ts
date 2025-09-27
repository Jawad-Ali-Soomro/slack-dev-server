import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Project } from '../models/project.model'
import User from '../models/user.model'
import Task from '../models/task.model'
import Meeting from '../models/meeting.model'
import { catchAsync } from '../middlewares'
import redisService from '../services/redis.service'
import { 
  CreateProjectRequest, 
  UpdateProjectRequest, 
  ProjectResponse, 
  ProjectStatsResponse,
  AddMemberRequest,
  UpdateMemberRoleRequest,
  AddLinkRequest,
  UpdateLinkRequest,
  RemoveLinkRequest,
  RemoveMemberRequest
} from '../interfaces'
import path from 'path'
import fs from 'fs'

// Helper function to format project response
const formatProjectResponse = (project: any): ProjectResponse => ({
  id: project._id,
  name: project.name,
  description: project.description,
  logo: project.logo,
  status: project.status,
  priority: project.priority,
  startDate: project.startDate,
  endDate: project.endDate,
  createdBy: project.createdBy,
  teamId: project.teamId,
  members: project.members,
  links: project.links,
  tags: project.tags,
  progress: project.progress,
  isPublic: project.isPublic,
  settings: project.settings,
  stats: project.stats,
  tasks: project.tasks || [],
  meetings: project.meetings || [],
  createdAt: project.createdAt,
  updatedAt: project.updatedAt
})

// Create a new project
export const createProject = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const projectData: CreateProjectRequest = req.body

   if (projectData && projectData.logo) {
    const oldLogoPath = path.join(__dirname, "../uploads/logos", path.basename(projectData.logo));
    if (fs.existsSync(oldLogoPath)) {
      fs.unlinkSync(oldLogoPath);
    }
  }

  // Create project
  const project = new Project({
    ...projectData,
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
  if (projectData.members && projectData.members.length > 0) {
    const additionalMembers = await User.find({ _id: { $in: projectData.members } })
    additionalMembers.forEach((member: any) => {
      project.members.push({
        user: member._id,
        role: 'member',
        joinedAt: new Date()
      })
    })
  }

  await project.save()
  await project.populate('createdBy members.user', 'username email avatar role')

  // If project has a teamId, add it to the team's projects array
  if (project.teamId) {
    const Team = require('../models/team.model').Team
    await Team.findByIdAndUpdate(project.teamId, {
      $addToSet: { projects: project._id }
    })
  }

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    project: formatProjectResponse(project)
  })
})

// Get all projects for a user
export const getProjects = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id
  const { status, priority, search, page = 1, limit = 10 } = req.query

  // Try to get from cache first
  const cacheKey = `user:${userId}:projects:${JSON.stringify({ status, priority, search, page, limit })}`
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

  if (status) query.status = status
  if (priority) query.priority = priority
  if (search) {
    query.$and = [
      {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      }
    ]
  }

  const projects = await Project.find(query)
    .populate('createdBy', 'username email avatar role')
    .populate('members.user', 'username email avatar role')
    .populate({
      path: 'tasks',
      select: 'title status priority assignTo',
      populate: {
        path: 'assignTo',
        select: 'username avatar'
      }
    })
    .populate({
      path: 'meetings',
      select: 'title status type startDate assignedTo',
      populate: {
        path: 'assignedTo',
        select: 'username avatar'
      }
    })
    .populate('teamId', 'name description')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)

  const total = await Project.countDocuments(query)

  const response = {
    success: true,
    projects: projects.map(formatProjectResponse),
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

// Get project by ID
export const getProjectById = catchAsync(async (req: any, res: Response) => {
  const { projectId } = req.params
  const userId = req.user._id

  // Try to get from cache first
  const cached = await redisService.getProject(projectId)
  if (cached) {
    return res.status(200).json({
      success: true,
      project: cached
    })
  }

  let project = await Project.findOne({
    _id: projectId,
    $or: [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  })
    .populate('createdBy', 'username email avatar role')
    .populate('members.user', 'username email avatar role')
    .populate('teamId', 'name description')
    .populate({
      path: 'tasks',
      select: 'title status priority assignTo',
      populate: {
        path: 'assignTo',
        select: 'username avatar'
      }
    })
    .populate({
      path: 'meetings',
      select: 'title status type startDate assignedTo',
      populate: {
        path: 'assignedTo',
        select: 'username avatar'
      }
    })

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    })
  }



  // Debug: Check if there are any tasks with this projectId
  const tasksWithProject = await Task.find({ projectId: project._id })
 
  // Debug: Check if there are any meetings with this projectId
  const meetingsWithProject = await Meeting.find({ projectId: project._id })
 
  // Sync tasks and meetings with project if they exist but aren't in the arrays
  if (tasksWithProject.length > 0 || meetingsWithProject.length > 0) {
    const taskIds = tasksWithProject.map(t => t._id)
    const meetingIds = meetingsWithProject.map(m => m._id)
    
    await Project.findByIdAndUpdate(project._id, {
      $addToSet: { 
        tasks: { $each: taskIds },
        meetings: { $each: meetingIds }
      }
    })
    
    // Refetch the project with updated arrays
    const updatedProject = await Project.findById(project._id)
      .populate('createdBy', 'username email avatar role')
      .populate('members.user', 'username email avatar role')
      .populate('teamId', 'name description')
      .populate({
        path: 'tasks',
        select: 'title status priority assignTo',
        populate: {
          path: 'assignTo',
          select: 'username avatar'
        }
      })
      .populate({
        path: 'meetings',
        select: 'title status type startDate assignedTo',
        populate: {
          path: 'assignedTo',
          select: 'username avatar'
        }
      })
    
    if (updatedProject) {
      project = updatedProject
    }
  }

  const projectResponse = formatProjectResponse(project)
  
  // Cache the project
  await redisService.cacheProject(projectId, projectResponse)

  res.status(200).json({
    success: true,
    project: projectResponse
  })
})

// Update project
export const updateProject = catchAsync(async (req: any, res: Response) => {
  const { projectId } = req.params
  const userId = req.user._id
  const updateData: UpdateProjectRequest = req.body

  const project = await Project.findOne({
    _id: projectId,
    $or: [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
    ]
  })

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or insufficient permissions'
    })
  }

  Object.assign(project, updateData)
  await project.save()
  await project.populate('createdBy members.user', 'username email avatar role')

  const projectResponse = formatProjectResponse(project)
  
  // Update cache
  await redisService.cacheProject(projectId, projectResponse)
  
  // Invalidate user project caches
  await redisService.invalidateUserProjects(userId)
  await redisService.invalidatePattern(`user:${userId}:projects:*`)

  res.status(200).json({
    success: true,
    message: 'Project updated successfully',
    project: projectResponse
  })
})

// Delete project
export const deleteProject = catchAsync(async (req: any, res: Response) => {
  const { projectId } = req.params
  const userId = req.user._id

  const project = await Project.findOne({
    _id: projectId,
    createdBy: userId
  })

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or insufficient permissions'
    })
  }

  await Project.findByIdAndDelete(projectId)

  // Invalidate caches
  await redisService.invalidateProject(projectId)
  await redisService.invalidateUserProjects(userId)
  await redisService.invalidatePattern(`user:${userId}:projects:*`)

  res.status(200).json({
    success: true,
    message: 'Project deleted successfully'
  })
})

// Add member to project
export const addMember = catchAsync(async (req: any, res: Response) => {
  const { projectId } = req.params
  const userId = req.user._id
  const { userId: newMemberId, role }: AddMemberRequest = req.body

  const project = await Project.findOne({
    _id: projectId,
    $or: [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
    ]
  })

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or insufficient permissions'
    })
  }

  // Check if user is already a member
  const existingMember = project.members.find(member => 
    member.user.toString() === newMemberId
  )

  if (existingMember) {
    return res.status(400).json({
      success: false,
      message: 'User is already a member of this project'
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

    project.members.push({
      user: newMemberId as any,
      role: role || 'member',
      joinedAt: new Date()
    })

  await project.save()
  await project.populate('createdBy members.user', 'username email avatar role')


  res.status(200).json({
    success: true,
    message: 'Member added successfully',
    project: formatProjectResponse(project)
  })
})

// Remove member from project
export const removeMember = catchAsync(async (req: any, res: Response) => {
  const { projectId } = req.params
  const userId = req.user._id
  const { userId: memberToRemove }: RemoveMemberRequest = req.body

  const project = await Project.findOne({
    _id: projectId,
    $or: [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
    ]
  })

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or insufficient permissions'
    })
  }

  // Cannot remove the owner
  if (project.createdBy.toString() === memberToRemove) {
    return res.status(400).json({
      success: false,
      message: 'Cannot remove the project owner'
    })
  }

  project.members = project.members.filter(member => 
    member.user.toString() !== memberToRemove
  )

  await project.save()
  await project.populate('createdBy members.user', 'username email avatar role')

  res.status(200).json({
    success: true,
    message: 'Member removed successfully',
    project: formatProjectResponse(project)
  })
})

// Update member role
export const updateMemberRole = catchAsync(async (req: any, res: Response) => {
  const { projectId } = req.params
  const userId = req.user._id
  const { userId: memberId, role }: UpdateMemberRoleRequest = req.body

  const project = await Project.findOne({
    _id: projectId,
    createdBy: userId // Only owner can update roles
  })

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or insufficient permissions'
    })
  }

  const member = project.members.find(m => m.user.toString() === memberId)
  if (!member) {
    return res.status(404).json({
      success: false,
      message: 'Member not found'
    })
  }

  member.role = role
  await project.save()
  await project.populate('createdBy members.user', 'username email avatar role')

  res.status(200).json({
    success: true,
    message: 'Member role updated successfully',
    project: formatProjectResponse(project)
  })
})

// Add link to project
export const addLink = catchAsync(async (req: any, res: Response) => {
  const { projectId } = req.params
  const userId = req.user._id
  const linkData: AddLinkRequest = req.body

  const project = await Project.findOne({
    _id: projectId,
    $or: [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin', 'member'] } } } }
    ]
  })

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or insufficient permissions'
    })
  }

  project.links.push({
    ...linkData,
    _id: new mongoose.Types.ObjectId()
  })
  await project.save()
  await project.populate('createdBy members.user', 'username email avatar role')

  res.status(200).json({
    success: true,
    message: 'Link added successfully',
    project: formatProjectResponse(project)
  })
})

// Update project link
export const updateLink = catchAsync(async (req: any, res: Response) => {
  const { projectId } = req.params
  const userId = req.user._id
  const { linkId, ...linkData }: UpdateLinkRequest = req.body

  const project = await Project.findOne({
    _id: projectId,
    $or: [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin', 'member'] } } } }
    ]
  })

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or insufficient permissions'
    })
  }

  const linkIndex = project.links.findIndex(l => l._id?.toString() === linkId)
  if (linkIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Link not found'
    })
  }

  project.links[linkIndex] = { ...project.links[linkIndex], ...linkData }
  await project.save()
  await project.populate('createdBy members.user', 'username email avatar role')

  res.status(200).json({
    success: true,
    message: 'Link updated successfully',
    project: formatProjectResponse(project)
  })
})

// Remove link from project
export const removeLink = catchAsync(async (req: any, res: Response) => {
  const { projectId } = req.params
  const userId = req.user._id
  const { linkId }: RemoveLinkRequest = req.body

  const project = await Project.findOne({
    _id: projectId,
    $or: [
      { createdBy: userId },
      { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin', 'member'] } } } }
    ]
  })

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or insufficient permissions'
    })
  }

  project.links = project.links.filter((l, index) => l._id?.toString() !== linkId)
  await project.save()
  await project.populate('createdBy members.user', 'username email avatar role')

  res.status(200).json({
    success: true,
    message: 'Link removed successfully',
    project: formatProjectResponse(project)
  })
})

// Get project statistics
export const getProjectStats = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id

  const projects = await Project.find({
    $or: [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  })

  // Get task and meeting counts for each project
  const projectIds = projects.map(p => p._id)
  
  // Get task counts per project
  const taskCounts = await Task.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    { $group: {
      _id: '$projectId',
      totalTasks: { $sum: 1 },
      completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
    }}
  ])
  
  // Get meeting counts per project
  const meetingCounts = await Meeting.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    { $group: {
      _id: '$projectId',
      totalMeetings: { $sum: 1 },
      completedMeetings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
    }}
  ])
  
  // Create lookup maps
  const taskCountMap = new Map()
  taskCounts.forEach((tc: any) => {
    taskCountMap.set(tc._id.toString(), tc)
  })
  
  const meetingCountMap = new Map()
  meetingCounts.forEach((mc: any) => {
    meetingCountMap.set(mc._id.toString(), mc)
  })
  
  // Update project stats
  for (const project of projects) {
    const projectId = (project as any)._id.toString()
    const taskStats = taskCountMap.get(projectId) || { totalTasks: 0, completedTasks: 0 }
    const meetingStats = meetingCountMap.get(projectId) || { totalMeetings: 0, completedMeetings: 0 }
    
    project.stats.totalTasks = taskStats.totalTasks
    project.stats.completedTasks = taskStats.completedTasks
    project.stats.totalMeetings = meetingStats.totalMeetings
    project.stats.completedMeetings = meetingStats.completedMeetings
  }

  const stats: ProjectStatsResponse = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    completedProjects: projects.filter(p => p.status === 'completed').length,
    onHoldProjects: projects.filter(p => p.status === 'on_hold').length,
    cancelledProjects: projects.filter(p => p.status === 'cancelled').length,
    totalMembers: projects.reduce((sum, p) => sum + p.members.length, 0),
    totalTasks: projects.reduce((sum, p) => sum + p.stats.totalTasks, 0),
    completedTasks: projects.reduce((sum, p) => sum + p.stats.completedTasks, 0),
    totalMeetings: projects.reduce((sum, p) => sum + p.stats.totalMeetings, 0),
    completedMeetings: projects.reduce((sum, p) => sum + p.stats.completedMeetings, 0),
    averageProgress: projects.length > 0 
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
      : 0,
    projectsByPriority: {
      low: projects.filter(p => p.priority === 'low').length,
      medium: projects.filter(p => p.priority === 'medium').length,
      high: projects.filter(p => p.priority === 'high').length,
      urgent: projects.filter(p => p.priority === 'urgent').length
    },
    projectsByStatus: {
      planning: projects.filter(p => p.status === 'planning').length,
      active: projects.filter(p => p.status === 'active').length,
      on_hold: projects.filter(p => p.status === 'on_hold').length,
      completed: projects.filter(p => p.status === 'completed').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length
    }
  }

  res.status(200).json({
    success: true,
    stats
  })
})
