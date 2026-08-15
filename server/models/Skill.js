import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String },                 // e.g. "web-dev", "data-science"
  prerequisites: [{ type: String }],           // names of skills required first
  relatedSkills: [{ type: String }],
});

export default mongoose.model('Skill', skillSchema);
