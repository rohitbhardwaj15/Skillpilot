import mongoose from 'mongoose';

const knowledgeStateSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  level: { type: Number, min: 0, max: 1, default: 0.25 },
  confidence: { type: Number, min: 0, max: 1, default: 0.35 },
  evidence: [{ type: String }],
  lastUpdated: { type: Date, default: Date.now },
}, { _id: false });

const noteSchema = new mongoose.Schema({
  nodeId:    { type: String, required: true },
  nodeTitle: { type: String },
  content:   { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const profileSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:      { type: String },
    goal:      { type: String, required: true },
    targetRole:     { type: String },
    timelineMonths: { type: Number },
    interests:      [{ type: String }],
    experienceLevel: {
      type:    String,
      enum:    ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    preferredLanguage: {
      type:    String,
      enum:    ['English','Hindi','Marathi','Tamil','Kannada','Telugu','Bengali','Gujarati','Punjabi','Others'],
      default: 'English',
    },
    courseTypeFilter: {
      type:    String,
      enum:    ['both', 'free', 'paid'],
      default: 'both',
    },
    priorLearningHistory: [{ type: String }],
    currentSkills: [
      {
        name:  String,
        level: { type: String, enum: ['none','beginner','intermediate','advanced'] },
      },
    ],
    hoursPerWeek:  { type: Number, default: 8 },
    learningStyle: {
      type:    [String],
      enum:    ['projects','video','reading','interactive'],
      default: ['projects'],
    },
    completedCourseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    feedback: [
      {
        courseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        rating:    { type: String, enum: ['too_easy','too_hard','good','perfect'] },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    knowledgeState: [knowledgeStateSchema],
    // Persisted online-logistic-regression preference model (see
    // ml.service.js / recommendation.service.js). Warm-started on every
    // subsequent feedback event instead of being retrained from zero each
    // time, so the learner's preferences genuinely accumulate over sessions.
    preferenceModel: {
      weights: { type: [Number], default: undefined },
      bias: { type: Number, default: 0 },
      trained: { type: Boolean, default: false },
      samples: { type: Number, default: 0 },
      updatedAt: { type: Date },
    },
    // Notes saved per learning path node — persisted in DB not localStorage
    notes: [noteSchema],
    // Progress streak tracking
    lastActiveDate: { type: Date },
    streakDays:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Profile', profileSchema);
