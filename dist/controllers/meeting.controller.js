"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeetingStats = exports.deleteMeeting = exports.updateMeetingStatus = exports.updateMeeting = exports.getMeetingById = exports.getMeetings = exports.createMeeting = void 0;
const middlewares_1 = require("../middlewares");
const models_1 = require("../models");
const interfaces_1 = require("../interfaces");
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
exports.createMeeting = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { title, description, type, assignedTo, startDate, endDate, location, meetingLink, tags, attendees } = req.body;
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
        { path: "attendees", select: "username avatar" }
    ]);
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
exports.getMeetings = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { status, type, assignedTo, assignedBy, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
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
        { path: "attendees", select: "username avatar" }
    ])
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    const total = await models_1.Meeting.countDocuments(filter);
    res.status(200).json({
        meetings: meetings.map(formatMeetingResponse),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});
exports.getMeetingById = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { meetingId } = req.params;
    const meeting = await models_1.Meeting.findById(meetingId).populate([
        { path: "assignedTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "attendees", select: "username avatar" }
    ]);
    if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
    }
    res.status(200).json({ meeting: formatMeetingResponse(meeting) });
});
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
    res.status(200).json({
        message: "Meeting updated successfully",
        meeting: formatMeetingResponse(meeting)
    });
});
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
    await models_1.Notification.create({
        recipient: meeting.assignedBy,
        sender: currentUserId,
        type: "meeting_status_updated",
        message: `${req.user.username} updated meeting "${meeting.title}" status to ${status}`,
        meetingId: meeting._id
    });
    res.status(200).json({
        message: "Meeting status updated successfully",
        meeting: formatMeetingResponse(meeting)
    });
});
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
    res.status(200).json({ message: "Meeting deleted successfully" });
});
exports.getMeetingStats = (0, middlewares_1.catchAsync)(async (req, res) => {
    const currentUserId = req.user._id;
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
    res.status(200).json({
        totalMeetings,
        scheduledMeetings,
        completedMeetings,
        cancelledMeetings,
        pendingMeetings,
        meetingsThisWeek,
        meetingsThisMonth,
        completionRate: parseFloat(completionRate.toFixed(2))
    });
});
