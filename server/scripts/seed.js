/**
 * Seed Script — run ONCE manually: node scripts/seed.js
 * Uses a DB flag so it NEVER wipes data on server restart.
 *
 * Force re-seed:  FORCE_SEED=true node scripts/seed.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Course from '../models/Course.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir   = path.join(__dirname, '../../data');

// ── Tiny "migration flag" collection ─────────────────────────────────────
const flagSchema = new mongoose.Schema({ key: String, seededAt: Date });
const SeedFlag   = mongoose.models.SeedFlag || mongoose.model('SeedFlag', flagSchema);

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('❌  Set MONGODB_URI in server/.env before seeding.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected to MongoDB');

  // ── Check if already seeded ───────────────────────────────────────────
  const force = process.env.FORCE_SEED === 'true';
  const flag  = await SeedFlag.findOne({ key: 'courses_seeded' });

  if (flag && !force) {
    const count = await Course.countDocuments();
    console.log(`⏭   Already seeded on ${flag.seededAt.toISOString()} (${count} courses). Skipping.`);
    console.log('    To force re-seed: FORCE_SEED=true node scripts/seed.js');
    await mongoose.disconnect();
    return;
  }

  // ── Seed courses ──────────────────────────────────────────────────────
  const rawCourses = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'courses.json'), 'utf-8')
  );

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

  // ── Save flag ─────────────────────────────────────────────────────────
  await SeedFlag.deleteMany({ key: 'courses_seeded' });
  await SeedFlag.create({ key: 'courses_seeded', seededAt: new Date() });

  // ── Stats ─────────────────────────────────────────────────────────────
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

  console.log(`📚  Seeded ${courses.length} courses`);
  console.log('   Languages :', langs);
  console.log('   Levels    :', levels);
  console.log(`   Free: ${freeCount}  |  YouTube: ${ytCount}  |  Docs: ${docCount}`);
  console.log('✅  Done — MongoDB disconnected');

  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
