import { catchAsync } from "../middlewares";
import { Meeting, User, Notification } from "../models";
import { CreateMeetingRequest, UpdateMeetingRequest, MeetingResponse, MeetingStats, MeetingStatus, MeetingType } from "../interfaces";

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

export const getMeetings = catchAsync(async (req: any, res: any) => {
  const { status, type, assignedTo, assignedBy, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

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

  res.status(200).json({
    meetings: meetings.map(formatMeetingResponse),
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string))
    }
  });
});

export const getMeetingById = catchAsync(async (req: any, res: any) => {
  const { meetingId } = req.params;

  const meeting = await Meeting.findById(meetingId).populate([
    { path: "assignedTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" },
    { path: "attendees", select: "username avatar" }
  ]);
  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  res.status(200).json({ meeting: formatMeetingResponse(meeting) });
});

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

  res.status(200).json({
    message: "Meeting updated successfully",
    meeting: formatMeetingResponse(meeting)
  });
});

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

  await Notification.create({
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

  res.status(200).json({ message: "Meeting deleted successfully" });
});

export const getMeetingStats = catchAsync(async (req: any, res: any) => {
  const currentUserId = req.user._id;

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