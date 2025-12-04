import mongoose, { Document, Schema } from "mongoose";

export interface INote extends Document {
  title: string;
  description?: string;
  department: string;
  subject: string;
  fileUrl?: string; // PDF file URL
  fileName?: string;
  createdBy: mongoose.Types.ObjectId;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    fileUrl: { type: String, trim: true },
    fileName: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

// Index for faster queries
NoteSchema.index({ department: 1, subject: 1 });
NoteSchema.index({ createdBy: 1 });
NoteSchema.index({ department: 1 });

export const Note = mongoose.model<INote>("Note", NoteSchema);

