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
exports.getMeetingStats = exports.deleteMeeting = exports.updateAttendees = exports.reassignMeeting = exports.rescheduleMeeting = exports.updateMeetingStatus = exports.updateMeeting = exports.getMeetingById = exports.getMeetings = exports.createMeeting = void 0;
const middlewares_1 = require("../middlewares");
const models_1 = require("../models");
const interfaces_1 = require("../interfaces");
const redis_service_1 = __importDefault(require("../services/redis.service"));
const formatMeetingResponse = (meeting) => ({
    id: meeting._id.toString(),
    title: meeting.title,
    description: meeting.description,
    type: meeting.type,
    status: meeting.status,
    assignedTo: meeting.assignedTo ? {
        id: meeting.assignedTo._id.toString(),
        username: meeting.assignedTo.username,
        avatar: meeting.assignedTo.avatar
    } : {
        id: 'deleted-user',
        username: 'Deleted User',
        avatar: undefined
    },
    assignedBy: meeting.assignedBy ? {
        id: meeting.assignedBy._id.toString(),
        username: meeting.assignedBy.username,
        avatar: meeting.assignedBy.avatar
    } : {
        id: 'deleted-user',
        username: 'Deleted User',
        avatar: undefined
    },
    project: meeting.projectId ? {
        id: meeting.projectId._id.toString(),
        name: meeting.projectId.name,
        logo: meeting.projectId.logo
    } : null,
    startDate: meeting.startDate,
    endDate: meeting.endDate,
    location: meeting.location,
    meetingLink: meeting.meetingLink,
    tags: meeting.tags,
    attendees: meeting.attendees?.map((attendee) => ({
        id: attendee._id.toString(),
        username: attendee.username,
        avatar: attendee.avatar
    })),
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt
});
// Create meeting with Redis caching
exports.createMeeting = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { title, description, type, assignedTo, startDate, endDate, location, meetingLink, tags, attendees, projectId } = req.body;
    const assignedBy = req.user._id;
    const assignToUser = await models_1.User.findById(assignedTo);
    if (!assignToUser) {
        return res.status(404).json({ message: "AssignedTo user not found" });
    }
    const meeting = await models_1.Meeting.create({
        title,
        description,
        type,
        assignedTo,
        assignedBy,
        projectId: projectId || undefined,
        startDate,
        endDate,
        location,
        meetingLink,
        tags,
        attendees: attendees || [],
    });
    await meeting.populate([
        { path: "assignedTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "attendees", select: "username avatar" },
        { path: "projectId", select: "name logo" }
    ]);
    // Add meeting to project if projectId is provided
    if (projectId) {
        const { Project } = await Promise.resolve().then(() => __importStar(require('../models/project.model')));
        await Project.findByIdAndUpdate(projectId, {
            $addToSet: { meetings: meeting._id }
        });
    }
    // Cache the new meeting
    await redis_service_1.default.cacheMeeting(meeting._id.toString(), formatMeetingResponse(meeting));
    // Invalidate user meeting caches
    await redis_service_1.default.invalidateUserMeetings(assignedBy.toString());
    await redis_service_1.default.invalidateUserMeetings(assignedTo);
    await redis_service_1.default.invalidateDashboardData(assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(assignedTo);
    await redis_service_1.default.invalidatePattern('meetings:*');
    // Create notification
    await models_1.Notification.create({
        recipient: assignedTo,
        sender: assignedBy,
        type: "meeting_assigned",
        message: `${req.user.username} assigned you a new meeting: "${title}"`,
        meetingId: meeting._id
    });
    res.status(201).json({
        message: "Meeting created and assigned successfully",
        meeting: formatMeetingResponse(meeting)
    });
});
// Get meetings with Redis caching
exports.getMeetings = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { status, type, assignedTo, assignedBy, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    // Try to get from cache first
    const cacheKey = `meetings:${JSON.stringify({ status, type, assignedTo, assignedBy, page, limit })}`;
    const cachedMeetings = await redis_service_1.default.get(cacheKey);
    if (cachedMeetings) {
        return res.status(200).json(cachedMeetings);
    }
    const filter = {};
    if (status)
        filter.status = status;
    if (type)
        filter.type = type;
    if (assignedTo)
        filter.assignedTo = assignedTo;
    if (assignedBy)
        filter.assignedBy = assignedBy;
    const meetings = await models_1.Meeting.find(filter)
        .populate([
        { path: "assignedTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "attendees", select: "username avatar" },
        { path: "projectId", select: "name logo" }
    ])
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    const total = await models_1.Meeting.countDocuments(filter);
    const response = {
        meetings: meetings.map(formatMeetingResponse),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    };
    // Cache the response for 5 minutes
    await redis_service_1.default.set(cacheKey, response, 300);
    res.status(200).json(response);
});
// Get meeting by ID with Redis caching
exports.getMeetingById = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { meetingId } = req.params;
    // Try cache first
    const cachedMeeting = await redis_service_1.default.getMeeting(meetingId);
    if (cachedMeeting) {
        return res.status(200).json({ meeting: cachedMeeting });
    }
    const meeting = await models_1.Meeting.findById(meetingId).populate([
        { path: "assignedTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "attendees", select: "username avatar" },
        { path: "projectId", select: "name logo" }
    ]);
    if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
    }
    const meetingResponse = formatMeetingResponse(meeting);
    // Cache the meeting
    await redis_service_1.default.cacheMeeting(meetingId, meetingResponse);
    res.status(200).json({ meeting: meetingResponse });
});
// Update meeting with comprehensive editing
exports.updateMeeting = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { meetingId } = req.params;
    const updates = req.body;
    const currentUserId = req.user._id;
    const originalMeeting = await models_1.Meeting.findById(meetingId);
    if (!originalMeeting) {
        return res.status(404).json({ message: "Meeting not found" });
    }
    // Only the user who assigned the meeting can update it
    if (originalMeeting.assignedBy.toString() !== currentUserId.toString()) {
        return res.status(403).json({ message: "Only the user who assigned this meeting can update it" });
    }
    const meeting = await models_1.Meeting.findByIdAndUpdate(meetingId, { ...updates }, { new: true, runValidators: true }).populate([
        { path: "assignedTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "attendees", select: "username avatar" }
    ]);
    if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
    }
    const meetingResponse = formatMeetingResponse(meeting);
    // Update cache
    await redis_service_1.default.cacheMeeting(meetingId, meetingResponse);
    // Invalidate related caches
    await redis_service_1.default.invalidateUserMeetings(originalMeeting.assignedBy.toString());
    await redis_service_1.default.invalidateUserMeetings(originalMeeting.assignedTo.toString());
    await redis_service_1.default.invalidateDashboardData(originalMeeting.assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(originalMeeting.assignedTo.toString());
    await redis_service_1.default.invalidatePattern('meetings:*');
    // Create notification for assignee
    await models_1.Notification.create({
        recipient: meeting.assignedTo,
        sender: currentUserId,
        type: "meeting_updated",
        message: `${req.user.username} updated meeting "${meeting.title}"`,
        meetingId: meeting._id
    });
    res.status(200).json({
        message: "Meeting updated successfully",
        meeting: meetingResponse
    });
});
// Update meeting status (only by assignee)
exports.updateMeetingStatus = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { meetingId } = req.params;
    const { status } = req.body;
    const currentUserId = req.user._id;
    const meeting = await models_1.Meeting.findById(meetingId);
    if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
    }
    // Only the assigned user can update the meeting status
    if (meeting.assignedTo.toString() !== currentUserId.toString()) {
        return res.status(403).json({ message: "Only the assigned user can update meeting status" });
    }
    meeting.status = status;
    await meeting.save();
    await meeting.populate([
        { path: "assignedTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "attendees", select: "username avatar" }
    ]);
    const meetingResponse = formatMeetingResponse(meeting);
    // Update cache
    await redis_service_1.default.cacheMeeting(meetingId, meetingResponse);
    // Invalidate related caches
    await redis_service_1.default.invalidateUserMeetings(meeting.assignedBy.toString());
    await redis_service_1.default.invalidateUserMeetings(meeting.assignedTo.toString());
    await redis_service_1.default.invalidateDashboardData(meeting.assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(meeting.assignedTo.toString());
    await redis_service_1.default.invalidatePattern('meetings:*');
    // Create notification for assigner
    await models_1.Notification.create({
        recipient: meeting.assignedBy,
        sender: currentUserId,
        type: "meeting_status_updated",
        message: `${req.user.username} updated meeting "${meeting.title}" status to ${status}`,
        meetingId: meeting._id
    });
    res.status(200).json({
        message: "Meeting status updated successfully",
        meeting: meetingResponse
    });
});
// Reschedule meeting
exports.rescheduleMeeting = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { meetingId } = req.params;
    const { startDate, endDate, location, meetingLink } = req.body;
    const currentUserId = req.user._id;
    const meeting = await models_1.Meeting.findById(meetingId);
    if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
    }
    // Only the user who assigned the meeting can reschedule it
    if (meeting.assignedBy.toString() !== currentUserId.toString()) {
        return res.status(403).json({ message: "Only the user who assigned this meeting can reschedule it" });
    }
    // Update meeting details
    if (startDate)
        meeting.startDate = startDate;
    if (endDate)
        meeting.endDate = endDate;
    if (location)
        meeting.location = location;
    if (meetingLink)
        meeting.meetingLink = meetingLink;
    await meeting.save();
    await meeting.populate([
        { path: "assignedTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "attendees", select: "username avatar" }
    ]);
    const meetingResponse = formatMeetingResponse(meeting);
    // Update cache
    await redis_service_1.default.cacheMeeting(meetingId, meetingResponse);
    // Invalidate related caches
    await redis_service_1.default.invalidateUserMeetings(meeting.assignedBy.toString());
    await redis_service_1.default.invalidateUserMeetings(meeting.assignedTo.toString());
    await redis_service_1.default.invalidateDashboardData(meeting.assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(meeting.assignedTo.toString());
    await redis_service_1.default.invalidatePattern('meetings:*');
    // Create notification for assignee
    await models_1.Notification.create({
        recipient: meeting.assignedTo,
        sender: currentUserId,
        type: "meeting_rescheduled",
        message: `${req.user.username} rescheduled meeting "${meeting.title}"`,
        meetingId: meeting._id
    });
    res.status(200).json({
        message: "Meeting rescheduled successfully",
        meeting: meetingResponse
    });
});
// Reassign meeting
exports.reassignMeeting = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { meetingId } = req.params;
    const { assignedTo } = req.body;
    const currentUserId = req.user._id;
    const meeting = await models_1.Meeting.findById(meetingId);
    if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
    }
    // Only the user who assigned the meeting can reassign it
    if (meeting.assignedBy.toString() !== currentUserId.toString()) {
        return res.status(403).json({ message: "Only the user who assigned this meeting can reassign it" });
    }
    const newAssignee = await models_1.User.findById(assignedTo);
    if (!newAssignee) {
        return res.status(404).json({ message: "New assignee not found" });
    }
    const oldAssignee = meeting.assignedTo;
    meeting.assignedTo = assignedTo;
    await meeting.save();
    await meeting.populate([
        { path: "assignedTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "attendees", select: "username avatar" }
    ]);
    const meetingResponse = formatMeetingResponse(meeting);
    // Update cache
    await redis_service_1.default.cacheMeeting(meetingId, meetingResponse);
    // Invalidate related caches
    await redis_service_1.default.invalidateUserMeetings(meeting.assignedBy.toString());
    await redis_service_1.default.invalidateUserMeetings(oldAssignee.toString());
    await redis_service_1.default.invalidateUserMeetings(assignedTo);
    await redis_service_1.default.invalidateDashboardData(meeting.assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(oldAssignee.toString());
    await redis_service_1.default.invalidateDashboardData(assignedTo);
    // Create notifications
    await models_1.Notification.create({
        recipient: assignedTo,
        sender: currentUserId,
        type: "meeting_reassigned",
        message: `${req.user.username} reassigned meeting "${meeting.title}" to you`,
        meetingId: meeting._id
    });
    await models_1.Notification.create({
        recipient: oldAssignee,
        sender: currentUserId,
        type: "meeting_unassigned",
        message: `Meeting "${meeting.title}" has been reassigned`,
        meetingId: meeting._id
    });
    res.status(200).json({
        message: "Meeting reassigned successfully",
        meeting: meetingResponse
    });
});
// Add/Remove attendees
exports.updateAttendees = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { meetingId } = req.params;
    const { attendees } = req.body;
    const currentUserId = req.user._id;
    const meeting = await models_1.Meeting.findById(meetingId);
    if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
    }
    // Only the user who assigned the meeting can update attendees
    if (meeting.assignedBy.toString() !== currentUserId.toString()) {
        return res.status(403).json({ message: "Only the user who assigned this meeting can update attendees" });
    }
    // Validate attendees exist
    const attendeeUsers = await models_1.User.find({ _id: { $in: attendees } });
    if (attendeeUsers.length !== attendees.length) {
        return res.status(400).json({ message: "Some attendees not found" });
    }
    meeting.attendees = attendees;
    await meeting.save();
    await meeting.populate([
        { path: "assignedTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "attendees", select: "username avatar" }
    ]);
    const meetingResponse = formatMeetingResponse(meeting);
    // Update cache
    await redis_service_1.default.cacheMeeting(meetingId, meetingResponse);
    // Invalidate related caches
    await redis_service_1.default.invalidateUserMeetings(meeting.assignedBy.toString());
    await redis_service_1.default.invalidateUserMeetings(meeting.assignedTo.toString());
    await redis_service_1.default.invalidateDashboardData(meeting.assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(meeting.assignedTo.toString());
    await redis_service_1.default.invalidatePattern('meetings:*');
    res.status(200).json({
        message: "Meeting attendees updated successfully",
        meeting: meetingResponse
    });
});
// Delete meeting
exports.deleteMeeting = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { meetingId } = req.params;
    const currentUserId = req.user._id;
    const meeting = await models_1.Meeting.findById(meetingId);
    if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
    }
    // Only the user who assigned the meeting can delete it
    if (meeting.assignedBy.toString() !== currentUserId.toString()) {
        return res.status(403).json({ message: "Only the user who assigned this meeting can delete it" });
    }
    await models_1.Meeting.findByIdAndDelete(meetingId);
    // Invalidate caches
    await redis_service_1.default.invalidateMeeting(meetingId);
    await redis_service_1.default.invalidateUserMeetings(meeting.assignedBy.toString());
    await redis_service_1.default.invalidateUserMeetings(meeting.assignedTo.toString());
    await redis_service_1.default.invalidateDashboardData(meeting.assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(meeting.assignedTo.toString());
    await redis_service_1.default.invalidatePattern('meetings:*');
    res.status(200).json({ message: "Meeting deleted successfully" });
});
// Get meeting statistics
exports.getMeetingStats = (0, middlewares_1.catchAsync)(async (req, res) => {
    const currentUserId = req.user._id;
    // Try cache first
    const cachedStats = await redis_service_1.default.get(`meeting_stats:${currentUserId}`);
    if (cachedStats) {
        return res.status(200).json(cachedStats);
    }
    const totalMeetings = await models_1.Meeting.countDocuments({
        $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }]
    });
    const scheduledMeetings = await models_1.Meeting.countDocuments({
        $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }],
        status: interfaces_1.MeetingStatus.SCHEDULED
    });
    const completedMeetings = await models_1.Meeting.countDocuments({
        $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }],
        status: interfaces_1.MeetingStatus.COMPLETED
    });
    const cancelledMeetings = await models_1.Meeting.countDocuments({
        $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }],
        status: interfaces_1.MeetingStatus.CANCELLED
    });
    const pendingMeetings = await models_1.Meeting.countDocuments({
        $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }],
        status: interfaces_1.MeetingStatus.PENDING
    });
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const meetingsThisWeek = await models_1.Meeting.countDocuments({
        $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }],
        createdAt: { $gte: oneWeekAgo }
    });
    const meetingsThisMonth = await models_1.Meeting.countDocuments({
        $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }],
        createdAt: { $gte: oneMonthAgo }
    });
    const completionRate = totalMeetings > 0 ? (completedMeetings / totalMeetings) * 100 : 0;
    const stats = {
        totalMeetings,
        scheduledMeetings,
        completedMeetings,
        cancelledMeetings,
        pendingMeetings,
        meetingsThisWeek,
        meetingsThisMonth,
        completionRate: parseFloat(completionRate.toFixed(2))
    };
    // Cache stats for 5 minutes
    await redis_service_1.default.set(`meeting_stats:${currentUserId}`, stats, 300);
    res.status(200).json(stats);
});
