import { IMeeting } from "../models/meeting.model";

export interface CreateMeetingRequest {
  title: string;
  description: string;
  type: 'online' | 'in-person';
  assignedTo: string;
  startDate: string;
  endDate: string;
  location?: string;
  meetingLink?: string;
  tags?: string[];
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  type?: 'online' | 'in-person';
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  meetingLink?: string;
  status?: 'scheduled' | 'completed' | 'pending' | 'cancelled';
  tags?: string[];
}

export interface MeetingResponse {
  id: string;
  title: string;
  description: string;
  type: 'online' | 'in-person' | 'physical';
  status: 'scheduled' | 'completed' | 'pending' | 'cancelled';
  assignedTo: {
    id: string;
    username: string;
    avatar?: string;
  };
  assignedBy: {
    id: string;
    username: string;
    avatar?: string;
  };
  startDate: Date;
  endDate: Date;
  location?: string;
  meetingLink?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingStats {
  totalMeetings: number;
  scheduledMeetings: number;
  completedMeetings: number;
  pendingMeetings: number;
  cancelledMeetings: number;
  onlineMeetings: number;
  inPersonMeetings: number;
  meetingsThisWeek: number;
  meetingsThisMonth: number;
}
