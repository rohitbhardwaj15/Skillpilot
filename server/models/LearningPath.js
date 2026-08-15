import mongoose from 'mongoose';

const courseInPhaseSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: String,
    skills: [String],
    level: String,
    durationWeeks: Number,
    scoreBreakdown: {
      skillGapMatch: Number,
      goalRelevance: Number,
      prereqReadiness: Number,
      userInterest: Number,
      learningStyleMatch: Number,
      totalScore: Number,
    },
    status: {
      type: String,
      enum: ['upcoming', 'current', 'done'],
      default: 'upcoming',
    },
  },
  { _id: false }
);

const phaseSchema = new mongoose.Schema(
  {
    phaseNumber: Number,
    title: String,
    courses: [courseInPhaseSchema],
    durationWeeks: Number,
  },
  { _id: false }
);

const learningPathSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    targetRole: String,
    skillGaps: [String],
    phases: [phaseSchema],
    estimatedDurationWeeks: Number,
  },
  { timestamps: true }
);

export default mongoose.model('LearningPath', learningPathSchema);
