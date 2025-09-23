import { catchAsync } from "../middlewares";
import { Meeting, User, Notification } from "../models";
import { CreateMeetingRequest, UpdateMeetingRequest, MeetingResponse, MeetingStatus, MeetingType } from "../interfaces";
import redisService from "../services/redis.service";

const formatMeetingResponse = (meeting: any): MeetingResponse => ({
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
  attendees: meeting.attendees?.map((attendee: any) => ({
    id: attendee._id.toString(),
    username: attendee.username,
    avatar: attendee.avatar
  })),
  createdAt: meeting.createdAt,
  updatedAt: meeting.updatedAt
});

// Create meeting with Redis caching
export const createMeeting = catchAsync(async (req: any, res: any) => {
  const { title, description, type, assignedTo, startDate, endDate, location, meetingLink, tags, attendees }: CreateMeetingRequest = req.body;
  const assignedBy = req.user._id;

  const assignToUser = await User.findById(assignedTo);
  if (!assignToUser) {
    return res.status(404).json({ message: "AssignedTo user not found" });
  }

  const meeting = await Meeting.create({
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

  // Cache the new meeting
  await redisService.cacheMeeting((meeting._id as any).toString(), formatMeetingResponse(meeting));

  // Invalidate user meeting caches
  await redisService.invalidateUserMeetings(assignedBy.toString());
  await redisService.invalidateUserMeetings(assignedTo);
  await redisService.invalidateDashboardData(assignedBy.toString());
  await redisService.invalidateDashboardData(assignedTo);
  await redisService.invalidatePattern('meetings:*');

  // Create notification
  await Notification.create({
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
export const getMeetings = catchAsync(async (req: any, res: any) => {
  const { status, type, assignedTo, assignedBy, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  // Try to get from cache first
  const cacheKey = `meetings:${JSON.stringify({ status, type, assignedTo, assignedBy, page, limit })}`;
  const cachedMeetings = await redisService.get(cacheKey);
  
  if (cachedMeetings) {
    return res.status(200).json(cachedMeetings);
  }

  const filter: any = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (assignedBy) filter.assignedBy = assignedBy;

  const meetings = await Meeting.find(filter)
    .populate([
      { path: "assignedTo", select: "username avatar" },
      { path: "assignedBy", select: "username avatar" },
      { path: "attendees", select: "username avatar" }
    ])
    .sort({ startDate: -1 })
    .skip(skip)
    .limit(parseInt(limit as string));

  const total = await Meeting.countDocuments(filter);

  const response = {
    meetings: meetings.map(formatMeetingResponse),
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string))
    }
  };

  // Cache the response for 5 minutes
  await redisService.set(cacheKey, response, 300);

  res.status(200).json(response);
});

// Get meeting by ID with Redis caching
export const getMeetingById = catchAsync(async (req: any, res: any) => {
  const { meetingId } = req.params;

  // Try cache first
  const cachedMeeting = await redisService.getMeeting(meetingId);
  if (cachedMeeting) {
    return res.status(200).json({ meeting: cachedMeeting });
  }

  const meeting = await Meeting.findById(meetingId).populate([
    { path: "assignedTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" },
    { path: "attendees", select: "username avatar" }
  ]);
  
  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  const meetingResponse = formatMeetingResponse(meeting);
  
  // Cache the meeting
  await redisService.cacheMeeting(meetingId, meetingResponse);

  res.status(200).json({ meeting: meetingResponse });
});

// Update meeting with comprehensive editing
export const updateMeeting = catchAsync(async (req: any, res: any) => {
  const { meetingId } = req.params;
  const updates: UpdateMeetingRequest = req.body;
  const currentUserId = req.user._id;

  const originalMeeting = await Meeting.findById(meetingId);
  if (!originalMeeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  // Only the user who assigned the meeting can update it
  if (originalMeeting.assignedBy.toString() !== currentUserId.toString()) {
    return res.status(403).json({ message: "Only the user who assigned this meeting can update it" });
  }

  const meeting = await Meeting.findByIdAndUpdate(
    meetingId,
    { ...updates },
    { new: true, runValidators: true }
  ).populate([
    { path: "assignedTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" },
    { path: "attendees", select: "username avatar" }
  ]);

  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  const meetingResponse = formatMeetingResponse(meeting);

  // Update cache
  await redisService.cacheMeeting(meetingId, meetingResponse);
  
  // Invalidate related caches
  await redisService.invalidateUserMeetings(originalMeeting.assignedBy.toString());
  await redisService.invalidateUserMeetings(originalMeeting.assignedTo.toString());
  await redisService.invalidateDashboardData(originalMeeting.assignedBy.toString());
  await redisService.invalidateDashboardData(originalMeeting.assignedTo.toString());
  await redisService.invalidatePattern('meetings:*');

  // Create notification for assignee
  await Notification.create({
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
export const updateMeetingStatus = catchAsync(async (req: any, res: any) => {
  const { meetingId } = req.params;
  const { status }: { status: MeetingStatus } = req.body;
  const currentUserId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
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
  await redisService.cacheMeeting(meetingId, meetingResponse);
  
  // Invalidate related caches
  await redisService.invalidateUserMeetings(meeting.assignedBy.toString());
  await redisService.invalidateUserMeetings(meeting.assignedTo.toString());
  await redisService.invalidateDashboardData(meeting.assignedBy.toString());
  await redisService.invalidateDashboardData(meeting.assignedTo.toString());
  await redisService.invalidatePattern('meetings:*');

  // Create notification for assigner
  await Notification.create({
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
export const rescheduleMeeting = catchAsync(async (req: any, res: any) => {
  const { meetingId } = req.params;
  const { startDate, endDate, location, meetingLink } = req.body;
  const currentUserId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  // Only the user who assigned the meeting can reschedule it
  if (meeting.assignedBy.toString() !== currentUserId.toString()) {
    return res.status(403).json({ message: "Only the user who assigned this meeting can reschedule it" });
  }

  // Update meeting details
  if (startDate) meeting.startDate = startDate;
  if (endDate) meeting.endDate = endDate;
  if (location) meeting.location = location;
  if (meetingLink) meeting.meetingLink = meetingLink;

  await meeting.save();

  await meeting.populate([
    { path: "assignedTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" },
    { path: "attendees", select: "username avatar" }
  ]);

  const meetingResponse = formatMeetingResponse(meeting);

  // Update cache
  await redisService.cacheMeeting(meetingId, meetingResponse);
  
  // Invalidate related caches
  await redisService.invalidateUserMeetings(meeting.assignedBy.toString());
  await redisService.invalidateUserMeetings(meeting.assignedTo.toString());
  await redisService.invalidateDashboardData(meeting.assignedBy.toString());
  await redisService.invalidateDashboardData(meeting.assignedTo.toString());
  await redisService.invalidatePattern('meetings:*');

  // Create notification for assignee
  await Notification.create({
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
export const reassignMeeting = catchAsync(async (req: any, res: any) => {
  const { meetingId } = req.params;
  const { assignedTo } = req.body;
  const currentUserId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  // Only the user who assigned the meeting can reassign it
  if (meeting.assignedBy.toString() !== currentUserId.toString()) {
    return res.status(403).json({ message: "Only the user who assigned this meeting can reassign it" });
  }

  const newAssignee = await User.findById(assignedTo);
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
  await redisService.cacheMeeting(meetingId, meetingResponse);
  
  // Invalidate related caches
  await redisService.invalidateUserMeetings(meeting.assignedBy.toString());
  await redisService.invalidateUserMeetings(oldAssignee.toString());
  await redisService.invalidateUserMeetings(assignedTo);
  await redisService.invalidateDashboardData(meeting.assignedBy.toString());
  await redisService.invalidateDashboardData(oldAssignee.toString());
  await redisService.invalidateDashboardData(assignedTo);

  // Create notifications
  await Notification.create({
    recipient: assignedTo,
    sender: currentUserId,
    type: "meeting_reassigned",
    message: `${req.user.username} reassigned meeting "${meeting.title}" to you`,
    meetingId: meeting._id
  });

  await Notification.create({
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
export const updateAttendees = catchAsync(async (req: any, res: any) => {
  const { meetingId } = req.params;
  const { attendees } = req.body;
  const currentUserId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  // Only the user who assigned the meeting can update attendees
  if (meeting.assignedBy.toString() !== currentUserId.toString()) {
    return res.status(403).json({ message: "Only the user who assigned this meeting can update attendees" });
  }

  // Validate attendees exist
  const attendeeUsers = await User.find({ _id: { $in: attendees } });
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
  await redisService.cacheMeeting(meetingId, meetingResponse);
  
  // Invalidate related caches
  await redisService.invalidateUserMeetings(meeting.assignedBy.toString());
  await redisService.invalidateUserMeetings(meeting.assignedTo.toString());
  await redisService.invalidateDashboardData(meeting.assignedBy.toString());
  await redisService.invalidateDashboardData(meeting.assignedTo.toString());
  await redisService.invalidatePattern('meetings:*');

  res.status(200).json({
    message: "Meeting attendees updated successfully",
    meeting: meetingResponse
  });
});

// Delete meeting
export const deleteMeeting = catchAsync(async (req: any, res: any) => {
  const { meetingId } = req.params;
  const currentUserId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  // Only the user who assigned the meeting can delete it
  if (meeting.assignedBy.toString() !== currentUserId.toString()) {
    return res.status(403).json({ message: "Only the user who assigned this meeting can delete it" });
  }

  await Meeting.findByIdAndDelete(meetingId);

  // Invalidate caches
  await redisService.invalidateMeeting(meetingId);
  await redisService.invalidateUserMeetings(meeting.assignedBy.toString());
  await redisService.invalidateUserMeetings(meeting.assignedTo.toString());
  await redisService.invalidateDashboardData(meeting.assignedBy.toString());
  await redisService.invalidateDashboardData(meeting.assignedTo.toString());
  await redisService.invalidatePattern('meetings:*');

  res.status(200).json({ message: "Meeting deleted successfully" });
});

// Get meeting statistics
export const getMeetingStats = catchAsync(async (req: any, res: any) => {
  const currentUserId = req.user._id;

  // Try cache first
  const cachedStats = await redisService.get(`meeting_stats:${currentUserId}`);
  if (cachedStats) {
    return res.status(200).json(cachedStats);
  }

  const totalMeetings = await Meeting.countDocuments({
    $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }]
  });
  const scheduledMeetings = await Meeting.countDocuments({
    $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }],
    status: MeetingStatus.SCHEDULED
  });
  const completedMeetings = await Meeting.countDocuments({
    $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }],
    status: MeetingStatus.COMPLETED
  });
  const cancelledMeetings = await Meeting.countDocuments({
    $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }],
    status: MeetingStatus.CANCELLED
  });
  const pendingMeetings = await Meeting.countDocuments({
    $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }],
    status: MeetingStatus.PENDING
  });

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const meetingsThisWeek = await Meeting.countDocuments({
    $or: [{ assignedTo: currentUserId }, { assignedBy: currentUserId }],
    createdAt: { $gte: oneWeekAgo }
  });
  const meetingsThisMonth = await Meeting.countDocuments({
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
  await redisService.set(`meeting_stats:${currentUserId}`, stats, 300);

  res.status(200).json(stats);
});
