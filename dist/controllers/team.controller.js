"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamMembers = exports.getTeamStats = exports.updateMemberRole = exports.removeMember = exports.addMember = exports.deleteTeam = exports.updateTeam = exports.getTeamById = exports.getTeams = exports.createTeam = void 0;
const team_model_1 = require("../models/team.model");
const user_model_1 = __importDefault(require("../models/user.model"));
const middlewares_1 = require("../middlewares");
// Helper function to format team response
const formatTeamResponse = (team) => ({
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
});
// Create a new team
exports.createTeam = (0, middlewares_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const teamData = req.body;
    // Create team
    const team = new team_model_1.Team({
        ...teamData,
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
    if (teamData.members && teamData.members.length > 0) {
        const additionalMembers = await user_model_1.default.find({ _id: { $in: teamData.members } });
        additionalMembers.forEach((member) => {
            team.members.push({
                user: member._id,
                role: 'member',
                joinedAt: new Date()
            });
        });
    }
    await team.save();
    await team.populate('createdBy members.user', 'username email avatar role');
    res.status(201).json({
        success: true,
        message: 'Team created successfully',
        team: formatTeamResponse(team)
    });
});
// Get all teams for a user
exports.getTeams = (0, middlewares_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const { isActive, search, page = 1, limit = 10 } = req.query;
    const query = {
        $or: [
            { createdBy: userId },
            { 'members.user': userId }
        ]
    };
    if (isActive !== undefined)
        query.isActive = isActive === 'true';
    if (search) {
        query.$and = [
            {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            }
        ];
    }
    const teams = await team_model_1.Team.find(query)
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
        .skip((page - 1) * limit);
    const total = await team_model_1.Team.countDocuments(query);
    res.status(200).json({
        success: true,
        teams: teams.map(formatTeamResponse),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});
// Get team by ID
exports.getTeamById = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user._id;
    const team = await team_model_1.Team.findOne({
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
    });
    if (!team) {
        return res.status(404).json({
            success: false,
            message: 'Team not found'
        });
    }
    res.status(200).json({
        success: true,
        team: formatTeamResponse(team)
    });
});
// Update team
exports.updateTeam = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user._id;
    const updateData = req.body;
    const team = await team_model_1.Team.findOne({
        _id: teamId,
        $or: [
            { createdBy: userId },
            { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
        ]
    });
    if (!team) {
        return res.status(404).json({
            success: false,
            message: 'Team not found or insufficient permissions'
        });
    }
    Object.assign(team, updateData);
    await team.save();
    await team.populate('createdBy members.user', 'username email avatar role');
    res.status(200).json({
        success: true,
        message: 'Team updated successfully',
        team: formatTeamResponse(team)
    });
});
// Delete team
exports.deleteTeam = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user._id;
    const team = await team_model_1.Team.findOne({
        _id: teamId,
        createdBy: userId
    });
    if (!team) {
        return res.status(404).json({
            success: false,
            message: 'Team not found or insufficient permissions'
        });
    }
    await team_model_1.Team.findByIdAndDelete(teamId);
    res.status(200).json({
        success: true,
        message: 'Team deleted successfully'
    });
});
// Add member to team
exports.addMember = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user._id;
    const { userId: newMemberId, role } = req.body;
    const team = await team_model_1.Team.findOne({
        _id: teamId,
        $or: [
            { createdBy: userId },
            { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
        ]
    });
    if (!team) {
        return res.status(404).json({
            success: false,
            message: 'Team not found or insufficient permissions'
        });
    }
    // Check if user is already a member
    const existingMember = team.members.find(member => member.user.toString() === newMemberId);
    if (existingMember) {
        return res.status(400).json({
            success: false,
            message: 'User is already a member of this team'
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
    team.members.push({
        user: newMemberId,
        role: role || 'member',
        joinedAt: new Date()
    });
    await team.save();
    await team.populate('createdBy members.user', 'username email avatar role');
    res.status(200).json({
        success: true,
        message: 'Member added successfully',
        team: formatTeamResponse(team)
    });
});
// Remove member from team
exports.removeMember = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user._id;
    const { userId: memberToRemove } = req.body;
    const team = await team_model_1.Team.findOne({
        _id: teamId,
        $or: [
            { createdBy: userId },
            { 'members.user': { $in: [userId], $elemMatch: { role: { $in: ['owner', 'admin'] } } } }
        ]
    });
    if (!team) {
        return res.status(404).json({
            success: false,
            message: 'Team not found or insufficient permissions'
        });
    }
    // Cannot remove the owner
    if (team.createdBy.toString() === memberToRemove) {
        return res.status(400).json({
            success: false,
            message: 'Cannot remove the team owner'
        });
    }
    team.members = team.members.filter(member => member.user.toString() !== memberToRemove);
    await team.save();
    await team.populate('createdBy members.user', 'username email avatar role');
    res.status(200).json({
        success: true,
        message: 'Member removed successfully',
        team: formatTeamResponse(team)
    });
});
// Update member role
exports.updateMemberRole = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user._id;
    const { userId: memberId, role } = req.body;
    const team = await team_model_1.Team.findOne({
        _id: teamId,
        createdBy: userId // Only owner can update roles
    });
    if (!team) {
        return res.status(404).json({
            success: false,
            message: 'Team not found or insufficient permissions'
        });
    }
    const member = team.members.find(m => m.user.toString() === memberId);
    if (!member) {
        return res.status(404).json({
            success: false,
            message: 'Member not found'
        });
    }
    member.role = role;
    await team.save();
    await team.populate('createdBy members.user', 'username email avatar role');
    res.status(200).json({
        success: true,
        message: 'Member role updated successfully',
        team: formatTeamResponse(team)
    });
});
// Get team statistics
exports.getTeamStats = (0, middlewares_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const teams = await team_model_1.Team.find({
        $or: [
            { createdBy: userId },
            { 'members.user': userId }
        ]
    });
    const stats = {
        totalTeams: teams.length,
        activeTeams: teams.filter(t => t.isActive).length,
        totalMembers: teams.reduce((sum, t) => sum + t.members.length, 0),
        totalProjects: teams.reduce((sum, t) => sum + t.projects.length, 0),
        teamsByRole: {
            owner: teams.filter(t => t.createdBy.toString() === userId).length,
            admin: teams.filter(t => t.members.some(m => m.user.toString() === userId && m.role === 'admin')).length,
            member: teams.filter(t => t.members.some(m => m.user.toString() === userId && m.role === 'member')).length
        }
    };
    res.status(200).json({
        success: true,
        stats
    });
});
// Get team members for assignment dropdowns
exports.getTeamMembers = (0, middlewares_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const { teamId } = req.params;
    const team = await team_model_1.Team.findOne({
        _id: teamId,
        $or: [
            { createdBy: userId },
            { 'members.user': userId }
        ]
    })
        .populate('members.user', 'username email avatar role');
    if (!team) {
        return res.status(404).json({
            success: false,
            message: 'Team not found'
        });
    }
    const members = team.members.map(member => ({
        id: member.user._id,
        username: member.user.username,
        email: member.user.email,
        avatar: member.user.avatar,
        role: member.role
    }));
    res.status(200).json({
        success: true,
        members
    });
});
