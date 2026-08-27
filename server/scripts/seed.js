// Run with: node scripts/seed.js
// Loads data/courses.json + data/roles.json into MongoDB.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Course from '../models/Course.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir   = path.join(__dirname, '../../data');

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('❌  Set MONGODB_URI in server/.env before seeding.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected to MongoDB');

  /* ── COURSES ─────────────────────────────────────────────────────────── */
  const coursesPath = path.join(dataDir, 'courses.json');
  const rawCourses  = JSON.parse(fs.readFileSync(coursesPath, 'utf-8'));

  // Normalise & fill defaults so mongoose doesn't reject old-format entries
  const courses = rawCourses.map((c) => ({
    title:             c.title,
    provider:          c.provider          ?? '',
    description:       c.description       ?? '',
    skills:            c.skills            ?? [],
    level:             c.level             ?? 'beginner',
    prerequisites:     c.prerequisites     ?? [],
    durationWeeks:     c.durationWeeks     ?? 2,
    type:              c.type              ?? 'course',
    url:               c.url               ?? '',
    youtube_url:       c.youtube_url       ?? '',
    documentation_url: c.documentation_url ?? '',
    language:          c.language          ?? 'English',
    is_free:           c.is_free           ?? false,
  }));

  await Course.deleteMany({});
  await Course.insertMany(courses, { ordered: false });
  console.log(`📚  Seeded ${courses.length} courses`);

  /* ── STATS ────────────────────────────────────────────────────────────── */
  const langs  = {};
  const levels = {};
  let freeCount = 0, ytCount = 0, docCount = 0;
  for (const c of courses) {
    langs[c.language]  = (langs[c.language]  ?? 0) + 1;
    levels[c.level]    = (levels[c.level]    ?? 0) + 1;
    if (c.is_free)           freeCount++;
    if (c.youtube_url)       ytCount++;
    if (c.documentation_url) docCount++;
  }
  console.log('   Languages :', langs);
  console.log('   Levels    :', levels);
  console.log(`   Free: ${freeCount}  |  YouTube: ${ytCount}  |  Docs: ${docCount}`);

  await mongoose.disconnect();
  console.log('✅  Done — MongoDB disconnected');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
