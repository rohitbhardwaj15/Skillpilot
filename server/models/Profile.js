import mongoose from 'mongoose';

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
    // Preferred study language — used by recommendation engine to filter
    // and rank courses in the learner's comfortable language.
    preferredLanguage: {
      type:    String,
      enum:    ['English','Hindi','Marathi','Tamil','Kannada','Telugu','Bengali','Gujarati','Punjabi','Others'],
      default: 'English',
    },
    // Courses/certifications completed BEFORE using SkillPilot (free text)
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
  },
  { timestamps: true }
);

export default mongoose.model('Profile', profileSchema);
