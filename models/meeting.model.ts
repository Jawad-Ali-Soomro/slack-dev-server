import mongoose, { Document, Schema } from "mongoose";
import { IMeeting, MeetingStatus, MeetingType } from "../interfaces";

const MeetingSchema = new Schema<IMeeting>({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: {
    type: String,
    enum: Object.values(MeetingType),
    default: MeetingType.ONLINE,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(MeetingStatus),
    default: MeetingStatus.SCHEDULED,
    required: true,
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  projectId: { type: Schema.Types.ObjectId, ref: "Project" },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String, trim: true },
  meetingLink: { type: String, trim: true },
  tags: [{ type: String, trim: true }],
  attendees: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

// Ensure endDate is after startDate
MeetingSchema.path('endDate').validate(function (this: IMeeting, value: Date) {
  return this.startDate && value >= this.startDate;
}, 'End date must be after start date');

// Require location for in-person meetings
MeetingSchema.pre('save', function (next) {
  if (this.type === MeetingType.IN_PERSON && !this.location) {
    next(new Error('Location is required for in-person meetings'));
  } else if (this.type === MeetingType.ONLINE && !this.meetingLink) {
    next(new Error('Meeting link is required for online meetings'));
  } else {
    next();
  }
});

const Meeting =
  mongoose.models.Meeting ||
  mongoose.model("Meeting", MeetingSchema)

export default Meeting;