import { catchAsync } from "../middlewares";
import { Meeting, User, Notification } from "../models";
import { CreateMeetingRequest, UpdateMeetingRequest, MeetingResponse, MeetingStats } from "../interfaces";

export const createMeeting = catchAsync(async (req: any, res: any) => {
  const { title, description, type, assignedTo, startDate, endDate, location, meetingLink, tags }: CreateMeetingRequest = req.body;
  const assignedBy = req.user._id;

  const assignToUser = await User.findById(assignedTo);
  if (!assignToUser) {
    return res.status(404).json({ message: "AssignedTo user not found" });
  }

  // Validate meeting times
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end <= start) {
    return res.status(400).json({ message: "End date must be after start date" });
  }

  // Check for conflicting meetings
  const conflictingMeeting = await Meeting.findOne({
    assignedTo,
    $or: [
      {
        startDate: { $lt: end },
        endDate: { $gt: start }
      }
    ],
    status: { $in: ['scheduled', 'pending'] }
  });

  if (conflictingMeeting) {
    return res.status(400).json({ message: "User has a conflicting meeting at this time" });
  }

  const meeting = await Meeting.create({
    title,
    description,
    type,
    assignedTo,
    assignedBy,
    startDate: start,
    endDate: end,
    location,
    meetingLink,
    tags
  });

  await meeting.populate([
    { path: "assignedTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" }
  ]);

  // Create notification for meeting assignment
  await Notification.create({
    recipient: assignedTo,
    sender: assignedBy,
    type: "meeting_assigned",
    message: `${req.user.username} scheduled a meeting with you: "${title}"`,
    meetingId: meeting._id
  });

  const meetingResponse: MeetingResponse = {
    id: (meeting._id as any).toString(),
    title: meeting.title,
    description: meeting.description,
    type: meeting.type,
    status: meeting.status,
    assignedTo: meeting.assignedTo ? {
      id: (meeting.assignedTo as any)._id.toString(),
      username: (meeting.assignedTo as any).username,
      avatar: (meeting.assignedTo as any).avatar
    } : {
      id: 'deleted-user',
      username: 'Deleted User',
      avatar: undefined
    },
    assignedBy: meeting.assignedBy ? {
      id: (meeting.assignedBy as any)._id.toString(),
      username: (meeting.assignedBy as any).username,
      avatar: (meeting.assignedBy as any).avatar
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
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt
  };

  res.status(201).json({
    message: "Meeting created and scheduled successfully",
    meeting: meetingResponse
  });
});

export const getMeetings = catchAsync(async (req: any, res: any) => {
  const { status, type, assignedTo, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const filter: any = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (assignedTo) filter.assignedTo = assignedTo;

  const meetings = await Meeting.find(filter)
    .populate([
      { path: "assignedTo", select: "username avatar" },
      { path: "assignedBy", select: "username avatar" }
    ])
    .sort({ startDate: 1 })
    .skip(skip)
    .limit(parseInt(limit as string));

  const total = await Meeting.countDocuments(filter);

  const meetingResponses: MeetingResponse[] = meetings.map(meeting => ({
    id: (meeting._id as any).toString(),
    title: meeting.title,
    description: meeting.description,
    type: meeting.type,
    status: meeting.status,
    assignedTo: meeting.assignedTo ? {
      id: (meeting.assignedTo as any)._id.toString(),
      username: (meeting.assignedTo as any).username,
      avatar: (meeting.assignedTo as any).avatar
    } : {
      id: 'deleted-user',
      username: 'Deleted User',
      avatar: undefined
    },
    assignedBy: meeting.assignedBy ? {
      id: (meeting.assignedBy as any)._id.toString(),
      username: (meeting.assignedBy as any).username,
      avatar: (meeting.assignedBy as any).avatar
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
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt
  }));

  res.status(200).json({
    meetings: meetingResponses,
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
    { path: "assignedBy", select: "username avatar" }
  ]);
  
  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  const meetingResponse: MeetingResponse = {
    id: (meeting._id as any).toString(),
    title: meeting.title,
    description: meeting.description,
    type: meeting.type,
    status: meeting.status,
    assignedTo: meeting.assignedTo ? {
      id: (meeting.assignedTo as any)._id.toString(),
      username: (meeting.assignedTo as any).username,
      avatar: (meeting.assignedTo as any).avatar
    } : {
      id: 'deleted-user',
      username: 'Deleted User',
      avatar: undefined
    },
    assignedBy: meeting.assignedBy ? {
      id: (meeting.assignedBy as any)._id.toString(),
      username: (meeting.assignedBy as any).username,
      avatar: (meeting.assignedBy as any).avatar
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
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt
  };

  res.status(200).json({ meeting: meetingResponse });
});

export const updateMeeting = catchAsync(async (req: any, res: any) => {
  const { meetingId } = req.params;
  const updates: UpdateMeetingRequest = req.body;
  const currentUserId = req.user._id;

  // Get the original meeting to check for conflicts and authorization
  const originalMeeting = await Meeting.findById(meetingId);
  if (!originalMeeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  // Check authorization - only assigned user or meeting creator can update
  const isAssignedBy = originalMeeting.assignedBy.toString() === currentUserId.toString();
  const isAssignedTo = originalMeeting.assignedTo.toString() === currentUserId.toString();

  if (!isAssignedBy && !isAssignedTo) {
    return res.status(403).json({ message: "You can only update meetings you created or are assigned to" });
  }

  // Check for time conflicts if updating time
  if (updates.startDate || updates.endDate) {
    const start = updates.startDate ? new Date(updates.startDate) : originalMeeting.startDate;
    const end = updates.endDate ? new Date(updates.endDate) : originalMeeting.endDate;
    
    if (end <= start) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const conflictingMeeting = await Meeting.findOne({
      _id: { $ne: meetingId },
      assignedTo: originalMeeting.assignedTo,
      $or: [
        {
          startDate: { $lt: end },
          endDate: { $gt: start }
        }
      ],
      status: { $in: ['scheduled', 'pending'] }
    });

    if (conflictingMeeting) {
      return res.status(400).json({ message: "User has a conflicting meeting at this time" });
    }
  }

  const meeting = await Meeting.findByIdAndUpdate(
    meetingId,
    { ...updates },
    { new: true, runValidators: true }
  ).populate([
    { path: "assignedTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" }
  ]);

  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  // Create notification for meeting updates
  if (updates.status && updates.status !== originalMeeting.status) {
    await Notification.create({
      recipient: meeting.assignedTo,
      sender: currentUserId,
      type: "meeting_status_updated",
      message: `${req.user.username} updated meeting "${meeting.title}" status to ${updates.status}`,
      meetingId: meeting._id
    });
  }

  const meetingResponse: MeetingResponse = {
    id: (meeting._id as any).toString(),
    title: meeting.title,
    description: meeting.description,
    type: meeting.type,
    status: meeting.status,
    assignedTo: meeting.assignedTo ? {
      id: (meeting.assignedTo as any)._id.toString(),
      username: (meeting.assignedTo as any).username,
      avatar: (meeting.assignedTo as any).avatar
    } : {
      id: 'deleted-user',
      username: 'Deleted User',
      avatar: undefined
    },
    assignedBy: meeting.assignedBy ? {
      id: (meeting.assignedBy as any)._id.toString(),
      username: (meeting.assignedBy as any).username,
      avatar: (meeting.assignedBy as any).avatar
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
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt
  };

  res.status(200).json({
    message: "Meeting updated successfully",
    meeting: meetingResponse
  });
});

export const updateMeetingStatus = catchAsync(async (req: any, res: any) => {
  const { meetingId } = req.params;
  const { status } = req.body;
  const currentUserId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  // Only the assigned user can update meeting status
  if (meeting.assignedTo.toString() !== currentUserId.toString()) {
    return res.status(403).json({ message: "Only the assigned user can update meeting status" });
  }

  const updatedMeeting = await Meeting.findByIdAndUpdate(
    meetingId,
    { status },
    { new: true, runValidators: true }
  ).populate([
    { path: "assignedTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" }
  ]);

  if (!updatedMeeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  // Create notification for status change
  await Notification.create({
    recipient: updatedMeeting.assignedBy,
    sender: currentUserId,
    type: "meeting_status_updated",
    message: `${req.user.username} updated meeting "${updatedMeeting.title}" status to ${status}`,
    meetingId: updatedMeeting._id
  });

  const meetingResponse: MeetingResponse = {
    id: (updatedMeeting._id as any).toString(),
    title: updatedMeeting.title,
    description: updatedMeeting.description,
    type: updatedMeeting.type,
    status: updatedMeeting.status,
    assignedTo: updatedMeeting.assignedTo ? {
      id: (updatedMeeting.assignedTo as any)._id.toString(),
      username: (updatedMeeting.assignedTo as any).username,
      avatar: (updatedMeeting.assignedTo as any).avatar
    } : {
      id: 'deleted-user',
      username: 'Deleted User',
      avatar: undefined
    },
    assignedBy: updatedMeeting.assignedBy ? {
      id: (updatedMeeting.assignedBy as any)._id.toString(),
      username: (updatedMeeting.assignedBy as any).username,
      avatar: (updatedMeeting.assignedBy as any).avatar
    } : {
      id: 'deleted-user',
      username: 'Deleted User',
      avatar: undefined
    },
    startDate: updatedMeeting.startDate,
    endDate: updatedMeeting.endDate,
    location: updatedMeeting.location,
    meetingLink: updatedMeeting.meetingLink,
    tags: updatedMeeting.tags,
    createdAt: updatedMeeting.createdAt,
    updatedAt: updatedMeeting.updatedAt
  };

  res.status(200).json({
    message: "Meeting status updated successfully",
    meeting: meetingResponse
  });
});

export const deleteMeeting = catchAsync(async (req: any, res: any) => {
  const { meetingId } = req.params;
  const currentUserId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  // Only the user who created the meeting can delete it
  if (meeting.assignedBy.toString() !== currentUserId.toString()) {
    return res.status(403).json({ message: "Only the user who created this meeting can delete it" });
  }

  await Meeting.findByIdAndDelete(meetingId);

  res.status(200).json({ message: "Meeting deleted successfully" });
});

export const getMeetingStats = catchAsync(async (req: any, res: any) => {
  const { assignedTo } = req.query;
  const filter: any = {};
  if (assignedTo) filter.assignedTo = assignedTo;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalMeetings,
    scheduledMeetings,
    completedMeetings,
    pendingMeetings,
    cancelledMeetings,
    onlineMeetings,
    inPersonMeetings,
    meetingsThisWeek,
    meetingsThisMonth
  ] = await Promise.all([
    Meeting.countDocuments(filter),
    Meeting.countDocuments({ ...filter, status: 'scheduled' }),
    Meeting.countDocuments({ ...filter, status: 'completed' }),
    Meeting.countDocuments({ ...filter, status: 'pending' }),
    Meeting.countDocuments({ ...filter, status: 'cancelled' }),
    Meeting.countDocuments({ ...filter, type: 'online' }),
    Meeting.countDocuments({ ...filter, type: 'in-person' }),
    Meeting.countDocuments({ ...filter, createdAt: { $gte: oneWeekAgo } }),
    Meeting.countDocuments({ ...filter, createdAt: { $gte: oneMonthAgo } })
  ]);

  const stats: MeetingStats = {
    totalMeetings,
    scheduledMeetings,
    completedMeetings,
    pendingMeetings,
    cancelledMeetings,
    onlineMeetings,
    inPersonMeetings,
    meetingsThisWeek,
    meetingsThisMonth
  };

  res.status(200).json({ stats });
});
