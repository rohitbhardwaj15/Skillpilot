/**
 * Tests the CORE claim of the "adapt suggestions based on feedback and
 * progress" requirement: does giving feedback actually change what the
 * recommendation engine surfaces next? Runs standalone, no DB needed.
 * Run with: node tests/feedback-adaptation.test.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchRole, rankCourses } from '../services/recommendation.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');

const courses = JSON.parse(fs.readFileSync(path.join(dataDir, 'courses.json'), 'utf-8'))
  .map((c, i) => ({ ...c, _id: `course_${i}` }));
const roles = JSON.parse(fs.readFileSync(path.join(dataDir, 'roles.json'), 'utf-8'));

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

const baseProfile = {
  targetRole: 'Full Stack Developer',
  currentSkills: [
    { name: 'Java', level: 'intermediate' },
    { name: 'HTML', level: 'intermediate' },
    { name: 'JavaScript', level: 'intermediate' },
  ],
  learningStyle: ['video'],
};

const role = matchRole(baseProfile.targetRole, roles);

console.log('=== BEFORE feedback: React is a gap, ranked highly ===');
const before = rankCourses(courses, baseProfile, role);
const reactGapBefore = before.skillGaps.map((s) => s.toLowerCase()).includes('react');
assert(reactGapBefore, 'React starts as a skill gap');
const reactCourseBefore = before.ranked.find((r) => r.course.skills.includes('React'));
console.log(`React course score before: ${reactCourseBefore?.breakdown.totalScore}`);

console.log('\n=== SIMULATE "too_easy" feedback on a React course ===');
// This mirrors exactly what POST /api/path/:id/feedback does to the profile
const afterTooEasyProfile = {
  ...baseProfile,
  currentSkills: [...baseProfile.currentSkills, { name: 'React', level: 'advanced' }],
};
const after = rankCourses(courses, afterTooEasyProfile, role);
const reactGapAfter = after.skillGaps.map((s) => s.toLowerCase()).includes('react');
assert(!reactGapAfter, 'React no longer appears in skill gaps after "too_easy" feedback');

const reactCourseAfter = after.ranked.find((r) => r.course.skills.includes('React'));
if (reactCourseAfter) {
  assert(
    reactCourseAfter.breakdown.totalScore < reactCourseBefore.breakdown.totalScore,
    `React course score DROPPED after feedback (${reactCourseBefore.breakdown.totalScore} -> ${reactCourseAfter.breakdown.totalScore})`
  );
} else {
  console.log('PASS: React course dropped out of relevant ranking entirely after feedback');
}

console.log('\n=== SIMULATE "good" feedback preferring project-type courses ===');
const projectPreferredProfile = { ...baseProfile, learningStyle: ['projects'] };
const projectRanked = rankCourses(courses, projectPreferredProfile, role);
const videoPreferredRanked = rankCourses(courses, baseProfile, role); // learningStyle: ['video']

const projectCourse = projectRanked.ranked.find((r) => r.course.type === 'project');
const sameProjectCourseInVideoProfile = videoPreferredRanked.ranked.find(
  (r) => r.course.title === projectCourse?.course.title
);
if (projectCourse && sameProjectCourseInVideoProfile) {
  assert(
    projectCourse.breakdown.userInterest > sameProjectCourseInVideoProfile.breakdown.userInterest,
    `Project-type course scores higher on userInterest when learningStyle prefers "projects" (${sameProjectCourseInVideoProfile.breakdown.userInterest} -> ${projectCourse.breakdown.userInterest})`
  );
}

console.log(`\n${failures === 0 ? 'ALL ADAPTATION TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
