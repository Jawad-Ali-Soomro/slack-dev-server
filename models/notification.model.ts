import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: "task_assigned" | "task_status_updated" | "task_due_soon";
  message: string;
  isRead: boolean;
  taskId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["task_assigned", "task_status_updated", "task_due_soon"],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: "Task"
  }
}, {
  timestamps: true
});

NotificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
export default Notification;
