import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    goal: { type: String, required: true },          // raw text goal, e.g. "become a full-stack dev"
    targetRole: { type: String },                      // extracted by LLM, e.g. "Full Stack Developer"
    timelineMonths: { type: Number },
    interests: [{ type: String }],
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    // Courses/certifications the learner completed BEFORE using SkillPilot —
    // free text since these come from outside our own course catalog and
    // won't match a Course _id. Captured per the brief's requirement to
    // profile "previous learning history".
    priorLearningHistory: [{ type: String }],
    currentSkills: [
      {
        name: String,
        level: { type: String, enum: ['none', 'beginner', 'intermediate', 'advanced'] },
      },
    ],
    hoursPerWeek: { type: Number, default: 8 },
    learningStyle: {
      type: [String],
      enum: ['projects', 'video', 'reading', 'interactive'],
      default: ['projects'],
    },
    completedCourseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    feedback: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        rating: { type: String, enum: ['too_easy', 'too_hard', 'good', 'perfect'] },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Profile', profileSchema);
