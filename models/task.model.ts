import mongoose, { Document, Schema } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  assignTo: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
  tags?: string[];
  /** Browser/page capture from Chrome extension — shown in task drawer only */
  captureMetadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  repository: {
    repoId: string,
    repoName: string
  }
  linkedPullRequest?: {
    number: number;
    url: string;
    title?: string;
    syncedAt: Date;
  };
  overdueEmailSent: boolean;
}

const TaskSchema = new Schema<ITask>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  repository: {
    repoId: String,
    repoName: String
  },
  assignTo: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: "Project"
  },
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "cancelled"],
    default: "pending"
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  dueDate: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  captureMetadata: {
    type: Schema.Types.Mixed,
  },
  overdueEmailSent: {
    type: Boolean,
    default: false,
  },
  linkedPullRequest: {
    number: Number,
    url: String,
    title: String,
    syncedAt: Date,
  },

}, {
  timestamps: true
});

TaskSchema.index({ assignTo: 1, status: 1 });
TaskSchema.index({ assignedBy: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ createdAt: -1 });
TaskSchema.index({ overdueEmailSent: 1, status: 1, dueDate: 1 });

const Task =
  mongoose.models.Task ||
  mongoose.model("Task", TaskSchema)
export default Task;
