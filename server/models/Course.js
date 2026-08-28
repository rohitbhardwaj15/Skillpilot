import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  provider:    { type: String },
  description: { type: String },
  skills:      [{ type: String, required: true }],   // skills this course teaches
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true,
  },
  prerequisites: [{ type: String }],                  // skills required BEFORE this course
  durationWeeks: { type: Number, default: 2 },
  type: {
    type: String,
    enum: ['course', 'project', 'article', 'assessment'],
    default: 'course',
  },
  url:               { type: String, default: '' },
  youtube_url:       { type: String, default: '' },   // direct YouTube playlist/video link
  documentation_url: { type: String, default: '' },   // official docs link
  language: {
    type: String,
    enum: [
      'English','Hindi','Marathi','Tamil','Kannada',
      'Telugu','Bengali','Gujarati','Punjabi','Others'
    ],
    default: 'English',
  },
  is_free: { type: Boolean, default: false },
  // Quality metadata used by the recommendation/evaluation layer.
  rating: { type: Number, min: 0, max: 5, default: 0 },
  completionRate: { type: Number, min: 0, max: 1, default: 0 },
  lastVerified: { type: Date, default: Date.now },
  qualityScore: { type: Number, min: 0, max: 1, default: 0.5 },
});

// Index for fast language + level filtering
courseSchema.index({ language: 1, level: 1 });
courseSchema.index({ skills: 1 });

export default mongoose.model('Course', courseSchema);
