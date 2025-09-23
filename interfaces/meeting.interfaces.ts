import { Document } from "mongoose";
import { IUser } from "./user.interface";

export enum MeetingType {
  ONLINE = "online",
  IN_PERSON = "in-person",
  HYBRID = "hybrid",
}

export enum MeetingStatus {
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  PENDING = "pending",
}

export interface IMeeting extends Document {
  title: string;
  description?: string;
  type: MeetingType;
  status: MeetingStatus;
  assignedTo: IUser["_id"] | IUser;
  assignedBy: IUser["_id"] | IUser;
  startDate: Date;
  endDate: Date;
  location?: string;
  meetingLink?: string;
  tags?: string[];
  attendees?: IUser["_id"][] | IUser[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  type: MeetingType;
  assignedTo: string; // User ID
  startDate: string; // ISO Date String
  endDate: string; // ISO Date String
  location?: string;
  meetingLink?: string;
  tags?: string[];
  attendees?: string[]; // User IDs
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  type?: MeetingType;
  status?: MeetingStatus;
  assignedTo?: string; // User ID
  startDate?: string; // ISO Date String
  endDate?: string; // ISO Date String
  location?: string;
  meetingLink?: string;
  tags?: string[];
  attendees?: string[]; // User IDs
}

export interface MeetingResponse {
  id: string;
  title: string;
  description?: string;
  type: MeetingType;
  status: MeetingStatus;
  assignedTo: { id: string; username: string; avatar?: string };
  assignedBy: { id: string; username: string; avatar?: string };
  startDate: Date;
  endDate: Date;
  location?: string;
  meetingLink?: string;
  tags?: string[];
  attendees?: { id: string; username: string; avatar?: string }[];
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
