import mongoose, { Document, Schema } from 'mongoose';

export interface ICodeSession extends Document {
  _id: string;
  title: string;
  description?: string;
  language: string;
  code: string;
  owner: mongoose.Types.ObjectId;
  participants: Array<{
    user: mongoose.Types.ObjectId;
    joinedAt: Date;
    lastActive: Date;
    cursorPosition?: {
      line: number;
      column: number;
    };
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
  maxParticipants?: number;
  isPublic: boolean;
  inviteCode?: string;
  invitedUsers?: mongoose.Types.ObjectId[];
  tags?: string[];
  
  // Methods
  addParticipant(userId: string): boolean;
  removeParticipant(userId: string): boolean;
  updateParticipantActivity(userId: string, cursorPosition?: { line: number; column: number }): boolean;
  generateInviteCode(): string;
  addInvitedUser(userId: string): boolean;
  canUserJoin(userId: string): boolean;
}

const CodeSessionSchema = new Schema<ICodeSession>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  language: {
    type: String,
    required: true,
    enum: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'html', 'css', 'sql', 'json', 'xml', 'yaml', 'markdown'],
    default: 'javascript'
  },
  code: {
    type: String,
    default: ''
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    cursorPosition: {
      line: Number,
      column: Number
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  maxParticipants: {
    type: Number,
    default: 10,
    min: 2,
    max: 50
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  invitedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }]
}, {
  timestamps: true
});

// Indexes for better performance
CodeSessionSchema.index({ owner: 1, isActive: 1 });
CodeSessionSchema.index({ 'participants.user': 1, isActive: 1 });
CodeSessionSchema.index({ isPublic: 1, isActive: 1 });
CodeSessionSchema.index({ language: 1, isActive: 1 });
CodeSessionSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
CodeSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for participant count
CodeSessionSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Method to add participant
CodeSessionSchema.methods.addParticipant = function(userId: string) {
  const existingParticipant = this.participants.find((p: any) => p.user.toString() === userId);
  if (!existingParticipant && this.participants.length < this.maxParticipants) {
    this.participants.push({
      user: userId,
      joinedAt: new Date(),
      lastActive: new Date()
    });
    return true;
  }
  return false;
};

// Method to remove participant
CodeSessionSchema.methods.removeParticipant = function(userId: string) {
  const participantIndex = this.participants.findIndex((p: any) => p.user.toString() === userId);
  if (participantIndex !== -1) {
    this.participants.splice(participantIndex, 1);
    return true;
  }
  return false;
};

// Method to update participant activity
CodeSessionSchema.methods.updateParticipantActivity = function(userId: string, cursorPosition?: { line: number; column: number }) {
  const participant = this.participants.find((p: any) => p.user.toString() === userId);
  if (participant) {
    participant.lastActive = new Date();
    if (cursorPosition) {
      participant.cursorPosition = cursorPosition;
    }
    return true;
  }
  return false;
};

// Method to generate invite code
CodeSessionSchema.methods.generateInviteCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  this.inviteCode = result;
  return result;
};

// Method to add invited user
CodeSessionSchema.methods.addInvitedUser = function(userId: string) {
  if (!this.invitedUsers.includes(userId)) {
    this.invitedUsers.push(userId);
    return true;
  }
  return false;
};

// Method to check if user can join (public or invited)
CodeSessionSchema.methods.canUserJoin = function(userId: string) {
  if (this.isPublic) return true;
  if (this.invitedUsers.includes(userId)) return true;
  if (this.owner.toString() === userId) return true;
  return false;
};

export default mongoose.model<ICodeSession>('CodeSession', CodeSessionSchema);
