/**
 * Standalone test for the recommendation engine — runs WITHOUT MongoDB,
 * directly against data/courses.json and data/roles.json.
 * Run with: node tests/recommendation-engine.test.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchRole, rankCourses } from '../services/recommendation.service.js';
import { orderByPrerequisites, groupIntoPhases } from '../services/pathgen.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');

const courses = JSON.parse(fs.readFileSync(path.join(dataDir, 'courses.json'), 'utf-8'))
  .map((c, i) => ({ ...c, _id: `course_${i}` }));
const roles = JSON.parse(fs.readFileSync(path.join(dataDir, 'roles.json'), 'utf-8'));

// Sample learner — matches the example scenario from the brief itself
const profile = {
  targetRole: 'Full Stack Developer',
  currentSkills: [
    { name: 'Java', level: 'intermediate' },
    { name: 'HTML', level: 'intermediate' },
  ],
  learningStyle: ['projects'],
};

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('=== Role Matching ===');
const role = matchRole(profile.targetRole, roles);
assert(role?.role === 'Full Stack Developer', 'matches "Full Stack Developer" text to the correct role');

console.log('\n=== Skill Gap + Ranking ===');
const { ranked, skillGaps } = await rankCourses(courses, profile, role);
assert(!skillGaps.map((s) => s.toLowerCase()).includes('html'), 'HTML excluded from gaps (learner already knows it)');
assert(skillGaps.map((s) => s.toLowerCase()).includes('react'), 'React correctly identified as a gap');
assert(ranked.length > 0, 'at least one relevant course found');
console.log(`Top match: ${ranked[0].course.title} (score ${ranked[0].breakdown.totalScore})`);

console.log('\n=== Prerequisite Ordering ===');
const ordered = orderByPrerequisites(ranked, profile);
// A course may teach both a prerequisite and its dependent skill (e.g. a full-stack
// foundations course teaches JavaScript + React together). In that case requiring a
// separate JavaScript course before React would be incorrect. Instead verify the
// actual invariant: every explicit prerequisite must be known or taught earlier.
let prerequisiteViolations = 0;
const knownSkills = new Set(profile.currentSkills.filter(s => ['intermediate','advanced'].includes(s.level)).map(s => s.name.toLowerCase()));
for (const entry of ordered) {
  for (const prereq of (entry.course.prerequisites || [])) {
    const p = prereq.toLowerCase();
    if (!knownSkills.has(p)) prerequisiteViolations++;
  }
  entry.course.skills.forEach(s => knownSkills.add(s.toLowerCase()));
}
assert(prerequisiteViolations === 0, 'no course is placed before an unsatisfied prerequisite');

console.log('\n=== Phase Grouping ===');
const phases = groupIntoPhases(ordered);
assert(phases.length > 0, 'roadmap has at least one phase');
assert(phases[0].courses[0].status === 'current', 'first course in phase 1 is marked current');
phases.forEach((p) => {
  console.log(`${p.title} (${p.durationWeeks}w): ${p.courses.map((c) => c.title).join(', ')}`);
});

console.log(`\n${failures === 0 ? '✅ ALL TESTS PASSED' : `❌ ${failures} TEST(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
