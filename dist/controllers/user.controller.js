"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = exports.getUserById = exports.getUsers = exports.changePassword = exports.deleteAvatar = exports.uploadAvatar = exports.updateProfile = exports.getUserDetails = exports.getProfile = void 0;
const middlewares_1 = require("../middlewares");
const models_1 = require("../models");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const formatUserResponse = (user) => ({
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
exports.getProfile = (0, middlewares_1.catchAsync)(async (req, res) => {
    const user = req.user;
    res.status(200).json({
        user: formatUserResponse(user)
    });
});
exports.getUserDetails = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    // Get basic user details
    const user = await models_1.User.findById(userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }
    // Import models
    const { Project } = await Promise.resolve().then(() => __importStar(require('../models/project.model')));
    const Task = (await Promise.resolve().then(() => __importStar(require('../models/task.model')))).default;
    const Meeting = (await Promise.resolve().then(() => __importStar(require('../models/meeting.model')))).default;
    const { Team } = await Promise.resolve().then(() => __importStar(require('../models/team.model')));
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
    const formattedProjects = projects.map((project) => ({
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
    const formattedTeams = teams.map((team) => ({
        id: team._id,
        name: team.name,
        description: team.description,
        members: team.members.length,
        role: team.members.find((member) => member.user.toString() === userId)?.role || 'member',
        createdAt: team.createdAt
    }));
    // Format tasks
    const formattedTasks = tasks.map((task) => ({
        id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        role: task.assignTo.toString() === userId ? 'assignee' : 'assigner',
        projectName: task.projectId?.name,
        createdAt: task.createdAt
    }));
    // Format meetings
    const formattedMeetings = meetings.map((meeting) => ({
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
    res.status(200).json({
        success: true,
        user: userResponse
    });
});
exports.updateProfile = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { username, bio, userLocation, website, socialLinks, dateOfBirth, phone, isPrivate } = req.body;
    const userId = req.user._id;
    const updateData = {};
    if (username)
        updateData.username = username;
    if (bio !== undefined)
        updateData.bio = bio;
    if (userLocation !== undefined)
        updateData.userLocation = userLocation;
    if (website !== undefined)
        updateData.website = website;
    if (socialLinks !== undefined)
        updateData.socialLinks = socialLinks;
    if (dateOfBirth !== undefined)
        updateData.dateOfBirth = dateOfBirth;
    if (phone !== undefined)
        updateData.phone = phone;
    if (isPrivate !== undefined)
        updateData.isPrivate = isPrivate;
    if (username) {
        const existingUser = await models_1.User.findOne({ username, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({ message: "username already taken" });
        }
    }
    const user = await models_1.User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!user) {
        return res.status(404).json({ message: "user not found" });
    }
    res.status(200).json({
        message: "profile updated successfully",
        user: formatUserResponse(user)
    });
});
exports.uploadAvatar = (0, middlewares_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    if (!req.file) {
        return res.status(400).json({ message: "no file uploaded" });
    }
    const user = await models_1.User.findById(userId);
    if (user && user.avatar) {
        const oldAvatarPath = path_1.default.join(__dirname, "../uploads/profiles", path_1.default.basename(user.avatar));
        if (fs_1.default.existsSync(oldAvatarPath)) {
            fs_1.default.unlinkSync(oldAvatarPath);
        }
    }
    const avatarUrl = `/profiles/${req.file.filename}`;
    const updatedUser = await models_1.User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true });
    if (!updatedUser) {
        return res.status(404).json({ message: "user not found" });
    }
    res.status(200).json({
        message: "avatar uploaded successfully",
        user: formatUserResponse(updatedUser)
    });
});
exports.deleteAvatar = (0, middlewares_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    const user = await models_1.User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "user not found" });
    }
    if (!user.avatar) {
        return res.status(400).json({ message: "no avatar to delete" });
    }
    const avatarPath = path_1.default.join(__dirname, "../uploads/profiles", path_1.default.basename(user.avatar));
    if (fs_1.default.existsSync(avatarPath)) {
        fs_1.default.unlinkSync(avatarPath);
    }
    const updatedUser = await models_1.User.findByIdAndUpdate(userId, { $unset: { avatar: 1 } }, { new: true });
    if (!updatedUser) {
        return res.status(404).json({ message: "user not found" });
    }
    res.status(200).json({
        message: "avatar deleted successfully",
        user: formatUserResponse(updatedUser)
    });
});
exports.changePassword = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    const user = await models_1.User.findById(userId);
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
exports.getUsers = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (search) {
        filter.$or = [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }
    const users = await models_1.User.find(filter)
        .select('username email avatar role bio userLocation')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    const total = await models_1.User.countDocuments(filter);
    const userResponses = users.map(user => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=128`,
        role: user.role,
        bio: user.bio,
        userLocation: user.userLocation
    }));
    res.status(200).json({
        users: userResponses,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});
exports.getUserById = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { userId } = req.params;
    const user = await models_1.User.findById(userId)
        .select('username email avatar role bio userLocation website socialLinks dateOfBirth phone isPrivate emailVerified');
    if (!user) {
        return res.status(404).json({ message: "user not found" });
    }
    res.status(200).json({
        user: formatUserResponse(user)
    });
});
exports.searchUsers = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ message: "search query is required" });
    }
    const users = await models_1.User.find({
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
    res.status(200).json({
        users: userResponses
    });
});
