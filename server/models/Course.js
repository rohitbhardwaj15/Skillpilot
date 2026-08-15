import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  provider: { type: String },
  description: { type: String },
  skills: [{ type: String, required: true }],       // skills this course teaches
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
  url: { type: String },
});

export default mongoose.model('Course', courseSchema);
