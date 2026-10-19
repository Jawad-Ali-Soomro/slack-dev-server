import mongoose, { Document, Schema } from "mongoose";

export interface IAutomation extends Document {
  key: string;
  title: string;
  description: string;
  trigger: string;
  action: string;
  enabled: boolean;
  enabledBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationSchema = new Schema<IAutomation>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    trigger: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: false },
    enabledBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const Automation =
  mongoose.models.Automation ||
  mongoose.model<IAutomation>("Automation", AutomationSchema);

export default Automation;
