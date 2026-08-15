// Run with: node scripts/seed.js
// Loads data/courses.json into the courses collection.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Course from '../models/Course.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ Set MONGODB_URI in server/.env before seeding.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const dataPath = path.join(__dirname, '../../data/courses.json');
  const courses = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  await Course.deleteMany({});
  await Course.insertMany(courses);

  console.log(`✅ Seeded ${courses.length} courses.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
