"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectStats = exports.removeLink = exports.updateLink = exports.addLink = exports.updateMemberRole = exports.removeMember = exports.addMember = exports.deleteProject = exports.updateProject = exports.getProjectById = exports.getProjects = exports.createProject = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const project_model_1 = require("../models/project.model");
const user_model_1 = __importDefault(require("../models/user.model"));
const task_model_1 = __importDefault(require("../models/task.model"));
const meeting_model_1 = __importDefault(require("../models/meeting.model"));
const middlewares_1 = require("../middlewares");
const redis_service_1 = __importDefault(require("../services/redis.service"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Helper function to format project response
const formatProjectResponse = (project) => ({
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
});
// Create a new project
exports.createProject = (0, middlewares_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const projectData = req.body;
    if (projectData && projectData.logo) {
        const oldLogoPath = path_1.default.join(__dirname, "../uploads/logos", path_1.default.basename(projectData.logo));
        if (fs_1.default.existsSync(oldLogoPath)) {
            fs_1.default.unlinkSync(oldLogoPath);
        }
    }
    // Create project
    const project = new project_model_1.Project({
        ...projectData,
        createdBy: userId,
        members: [
            {
                user: userId,
                role: 'owner',
                joinedAt: new Date()
            }
        ]
    });
    // Add additional members if provided
    if (projectData.members && projectData.members.length > 0) {
        const additionalMembers = await user_model_1.default.find({ _id: { $in: projectData.members } });
        additionalMembers.forEach((member) => {
            project.members.push({
                user: member._id,
                role: 'member',
                joinedAt: new Date()
            });
        });
    }
    await project.save();
    await project.populate('createdBy members.user', 'username email avatar role');
    // If project has a teamId, add it to the team's projects array
    if (project.teamId) {
        const Team = require('../models/team.model').Team;
        await Team.findByIdAndUpdate(project.teamId, {
            $addToSet: { projects: project._id }
        });
    }
    res.status(201).json({
        success: true,
        message: 'Project created successfully',
        project: formatProjectResponse(project)
    });
});
// Get all projects for a user
exports.getProjects = (0, middlewares_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const { status, priority, search, page = 1, limit = 10 } = req.query;
    // Try to get from cache first
    const cacheKey = `user:${userId}:projects:${JSON.stringify({ status, priority, search, page, limit })}`;
    const cached = await redis_service_1.default.get(cacheKey);
    if (cached) {
        return res.status(200).json(cached);
    }
    const query = {
        $or: [
            { createdBy: userId },
            { 'members.user': userId }
        ]
    };
    if (status)
        query.status = status;
    if (priority)
        query.priority = priority;
    if (search) {
        query.$and = [
            {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { tags: { $in: [new RegExp(search, 'i')] } }
                ]
            }
        ];
    }
    const projects = await project_model_1.Project.find(query)
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
        .skip((page - 1) * limit);
    const total = await project_model_1.Project.countDocuments(query);
    const response = {
        success: true,
        projects: projects.map(formatProjectResponse),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    };
    // Cache the response for 5 minutes
    await redis_service_1.default.set(cacheKey, response, 300);
    res.status(200).json(response);
});
// Get project by ID
exports.getProjectById = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user._id;
    // Try to get from cache first
    const cached = await redis_service_1.default.getProject(projectId);
    if (cached) {
        return res.status(200).json({
            success: true,
            project: cached
        });
    }
    let project = await project_model_1.Project.findOne({
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
    });
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found'
        });
    }
    // Debug: Check if there are any tasks with this projectId
    const tasksWithProject = await task_model_1.default.find({ projectId: project._id });
    // Debug: Check if there are any meetings with this projectId
    const meetingsWithProject = await meeting_model_1.default.find({ projectId: project._id });
    // Sync tasks and meetings with project if they exist but aren't in the arrays
    if (tasksWithProject.length > 0 || meetingsWithProject.length > 0) {
        const taskIds = tasksWithProject.map(t => t._id);
        const meetingIds = meetingsWithProject.map(m => m._id);
        await project_model_1.Project.findByIdAndUpdate(project._id, {
            $addToSet: {
                tasks: { $each: taskIds },
                meetings: { $each: meetingIds }
            }
        });
        // Refetch the project with updated arrays
        const updatedProject = await project_model_1.Project.findById(project._id)
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
        });
        if (updatedProject) {
            project = updatedProject;
        }
    }
    const projectResponse = formatProjectResponse(project);
    // Cache the project
    await redis_service_1.default.cacheProject(projectId, projectResponse);
    res.status(200).json({
        success: true,
        project: projectResponse
    });
});
// Update project
exports.updateProject = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user._id;
    const updateData = req.body;
    const project = await project_model_1.Project.findOne({
        _id: projectId,
        $or: [
            { createdBy: userId },
            { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
        ]
    });
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found or insufficient permissions'
        });
    }
    Object.assign(project, updateData);
    await project.save();
    await project.populate('createdBy members.user', 'username email avatar role');
    const projectResponse = formatProjectResponse(project);
    // Update cache
    await redis_service_1.default.cacheProject(projectId, projectResponse);
    // Invalidate user project caches
    await redis_service_1.default.invalidateUserProjects(userId);
    await redis_service_1.default.invalidatePattern(`user:${userId}:projects:*`);
    res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        project: projectResponse
    });
});
// Delete project
exports.deleteProject = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user._id;
    const project = await project_model_1.Project.findOne({
        _id: projectId,
        createdBy: userId
    });
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found or insufficient permissions'
        });
    }
    await project_model_1.Project.findByIdAndDelete(projectId);
    // Invalidate caches
    await redis_service_1.default.invalidateProject(projectId);
    await redis_service_1.default.invalidateUserProjects(userId);
    await redis_service_1.default.invalidatePattern(`user:${userId}:projects:*`);
    res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
    });
});
// Add member to project
exports.addMember = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user._id;
    const { userId: newMemberId, role } = req.body;
    const project = await project_model_1.Project.findOne({
        _id: projectId,
        $or: [
            { createdBy: userId },
            { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
        ]
    });
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found or insufficient permissions'
        });
    }
    // Check if user is already a member
    const existingMember = project.members.find(member => member.user.toString() === newMemberId);
    if (existingMember) {
        return res.status(400).json({
            success: false,
            message: 'User is already a member of this project'
        });
    }
    // Verify the user exists
    const user = await user_model_1.default.findById(newMemberId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }
    project.members.push({
        user: newMemberId,
        role: role || 'member',
        joinedAt: new Date()
    });
    await project.save();
    await project.populate('createdBy members.user', 'username email avatar role');
    res.status(200).json({
        success: true,
        message: 'Member added successfully',
        project: formatProjectResponse(project)
    });
});
// Remove member from project
exports.removeMember = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user._id;
    const { userId: memberToRemove } = req.body;
    const project = await project_model_1.Project.findOne({
        _id: projectId,
        $or: [
            { createdBy: userId },
            { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
        ]
    });
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found or insufficient permissions'
        });
    }
    // Cannot remove the owner
    if (project.createdBy.toString() === memberToRemove) {
        return res.status(400).json({
            success: false,
            message: 'Cannot remove the project owner'
        });
    }
    project.members = project.members.filter(member => member.user.toString() !== memberToRemove);
    await project.save();
    await project.populate('createdBy members.user', 'username email avatar role');
    res.status(200).json({
        success: true,
        message: 'Member removed successfully',
        project: formatProjectResponse(project)
    });
});
// Update member role
exports.updateMemberRole = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user._id;
    const { userId: memberId, role } = req.body;
    const project = await project_model_1.Project.findOne({
        _id: projectId,
        createdBy: userId // Only owner can update roles
    });
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found or insufficient permissions'
        });
    }
    const member = project.members.find(m => m.user.toString() === memberId);
    if (!member) {
        return res.status(404).json({
            success: false,
            message: 'Member not found'
        });
    }
    member.role = role;
    await project.save();
    await project.populate('createdBy members.user', 'username email avatar role');
    res.status(200).json({
        success: true,
        message: 'Member role updated successfully',
        project: formatProjectResponse(project)
    });
});
// Add link to project
exports.addLink = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user._id;
    const linkData = req.body;
    const project = await project_model_1.Project.findOne({
        _id: projectId,
        $or: [
            { createdBy: userId },
            { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin', 'member'] } } } }
        ]
    });
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found or insufficient permissions'
        });
    }
    project.links.push({
        ...linkData,
        _id: new mongoose_1.default.Types.ObjectId()
    });
    await project.save();
    await project.populate('createdBy members.user', 'username email avatar role');
    res.status(200).json({
        success: true,
        message: 'Link added successfully',
        project: formatProjectResponse(project)
    });
});
// Update project link
exports.updateLink = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user._id;
    const { linkId, ...linkData } = req.body;
    const project = await project_model_1.Project.findOne({
        _id: projectId,
        $or: [
            { createdBy: userId },
            { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin', 'member'] } } } }
        ]
    });
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found or insufficient permissions'
        });
    }
    const linkIndex = project.links.findIndex(l => l._id?.toString() === linkId);
    if (linkIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Link not found'
        });
    }
    project.links[linkIndex] = { ...project.links[linkIndex], ...linkData };
    await project.save();
    await project.populate('createdBy members.user', 'username email avatar role');
    res.status(200).json({
        success: true,
        message: 'Link updated successfully',
        project: formatProjectResponse(project)
    });
});
// Remove link from project
exports.removeLink = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user._id;
    const { linkId } = req.body;
    const project = await project_model_1.Project.findOne({
        _id: projectId,
        $or: [
            { createdBy: userId },
            { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin', 'member'] } } } }
        ]
    });
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found or insufficient permissions'
        });
    }
    project.links = project.links.filter((l, index) => l._id?.toString() !== linkId);
    await project.save();
    await project.populate('createdBy members.user', 'username email avatar role');
    res.status(200).json({
        success: true,
        message: 'Link removed successfully',
        project: formatProjectResponse(project)
    });
});
// Get project statistics
exports.getProjectStats = (0, middlewares_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const projects = await project_model_1.Project.find({
        $or: [
            { createdBy: userId },
            { 'members.user': userId }
        ]
    });
    // Get task and meeting counts for each project
    const projectIds = projects.map(p => p._id);
    // Get task counts per project
    const taskCounts = await task_model_1.default.aggregate([
        { $match: { projectId: { $in: projectIds } } },
        { $group: {
                _id: '$projectId',
                totalTasks: { $sum: 1 },
                completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
            } }
    ]);
    // Get meeting counts per project
    const meetingCounts = await meeting_model_1.default.aggregate([
        { $match: { projectId: { $in: projectIds } } },
        { $group: {
                _id: '$projectId',
                totalMeetings: { $sum: 1 },
                completedMeetings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
            } }
    ]);
    // Create lookup maps
    const taskCountMap = new Map();
    taskCounts.forEach((tc) => {
        taskCountMap.set(tc._id.toString(), tc);
    });
    const meetingCountMap = new Map();
    meetingCounts.forEach((mc) => {
        meetingCountMap.set(mc._id.toString(), mc);
    });
    // Update project stats
    for (const project of projects) {
        const projectId = project._id.toString();
        const taskStats = taskCountMap.get(projectId) || { totalTasks: 0, completedTasks: 0 };
        const meetingStats = meetingCountMap.get(projectId) || { totalMeetings: 0, completedMeetings: 0 };
        project.stats.totalTasks = taskStats.totalTasks;
        project.stats.completedTasks = taskStats.completedTasks;
        project.stats.totalMeetings = meetingStats.totalMeetings;
        project.stats.completedMeetings = meetingStats.completedMeetings;
    }
    const stats = {
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
    };
    res.status(200).json({
        success: true,
        stats
    });
});
