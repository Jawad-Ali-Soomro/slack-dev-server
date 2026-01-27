import mongoose, { Document, Schema } from "mongoose";

export interface IChallenge extends Document {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  instructions: string;
  starterCode?: string;
  solution?: string;
  answer?: string; // Expected answer/output for comparison
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    description?: string;
  }>;
  points: number;
  tags?: string[];
  createdBy: mongoose.Types.ObjectId;
  completedBy?: mongoose.Types.ObjectId[];
    userSolutions?: Array<{
      userId: mongoose.Types.ObjectId;
      solution: string;
      answer?: string; // User's submitted answer/output
      isCorrect: boolean;
      pointsEarned: number;
      submittedAt: Date;
    }>;
  createdAt: Date;
  updatedAt: Date;
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
      default: 'beginner'
    },
    category: { type: String, required: true, trim: true },
    instructions: { type: String, required: true },
    starterCode: { type: String, trim: true },
    solution: { type: String, trim: true },
    answer: { type: String, trim: true }, // Expected answer/output
    testCases: [{
      input: { type: String, required: true },
      expectedOutput: { type: String, required: true },
      description: { type: String }
    }],
    points: { type: Number, required: true, default: 10, min: 0 },
    tags: [{ type: String, trim: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    completedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    userSolutions: [{
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      solution: { type: String, required: true },
      answer: { type: String, trim: true }, // User's submitted answer/output
      isCorrect: { type: Boolean, default: false },
      pointsEarned: { type: Number, default: 0 },
      submittedAt: { type: Date, default: Date.now }
    }],
  },
  { timestamps: true }
);

// Indexes for faster queries
ChallengeSchema.index({ difficulty: 1, category: 1 });
ChallengeSchema.index({ createdBy: 1 });
ChallengeSchema.index({ category: 1 });
ChallengeSchema.index({ tags: 1 });

export const Challenge =
  mongoose.models.Challenge ||
  mongoose.model("Challenge", ChallengeSchema)



