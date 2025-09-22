import mongoose, { Document, Schema } from "mongoose";

export interface IMeeting extends Document {
  title: string;
  description: string;
  type: 'online' | 'in-person' | 'physical';
  status: 'scheduled' | 'completed' | 'pending' | 'cancelled';
  assignedTo: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  location?: string;
  meetingLink?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['online', 'in-person', 'physical'],
    required: true,
    default: 'online'
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'pending', 'cancelled'],
    required: true,
    default: 'scheduled'
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(this: IMeeting, value: Date) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  location: {
    type: String,
    trim: true,
    maxlength: 200
  },
  meetingLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(this: IMeeting, value: string) {
        if (this.type === 'online' && !value) {
          return false;
        }
        return true;
      },
      message: 'Meeting link is required for online meetings'
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }]
}, {
  timestamps: true
});

// Index for better query performance
MeetingSchema.index({ assignedTo: 1, status: 1 });
MeetingSchema.index({ assignedBy: 1, status: 1 });
MeetingSchema.index({ startDate: 1 });
MeetingSchema.index({ status: 1, type: 1 });

const Meeting = mongoose.model<IMeeting>("Meeting", MeetingSchema);
export default Meeting;
