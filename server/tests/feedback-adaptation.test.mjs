/**
 * Tests the CORE claim of the "adapt suggestions based on feedback and
 * progress" requirement: does giving feedback actually change what the
 * recommendation engine surfaces next? Runs standalone, no DB needed.
 * Run with: node tests/feedback-adaptation.test.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchRole, rankCourses, scoreCourse, computeSkillGaps } from '../services/recommendation.service.js';

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

console.log('=== BEFORE feedback: React is a gap, scored against it ===');
const before = rankCourses(courses, baseProfile, role);
const reactGapBefore = before.skillGaps.map((s) => s.toLowerCase()).includes('react');
assert(reactGapBefore, 'React starts as a skill gap');

// Fix on ONE specific course for a clean, stable before/after comparison —
// scoring it directly (bypassing the ranked/diversity list) so the diversity
// filter changing which course ranks #1 doesn't affect this comparison.
const fixedReactCourse = courses.find((c) => c.title === 'React - The Complete Guide');
const requiredSkillsSet = new Set(role.requiredSkills.map((s) => s.toLowerCase()));
const gapSetBefore = new Set(before.skillGaps.map((s) => s.toLowerCase()));
const scoreBefore = scoreCourse(fixedReactCourse, {
  requiredSkillsSet,
  gapSet: gapSetBefore,
  profile: baseProfile,
});
console.log(`"${fixedReactCourse.title}" score before: ${scoreBefore.totalScore}`);

console.log('\n=== SIMULATE "too_easy" feedback on a React course ===');
// This mirrors exactly what POST /api/path/:id/feedback does to the profile
const afterTooEasyProfile = {
  ...baseProfile,
  currentSkills: [...baseProfile.currentSkills, { name: 'React', level: 'advanced' }],
};
const afterGaps = computeSkillGaps(role.requiredSkills, afterTooEasyProfile.currentSkills);
const reactGapAfter = afterGaps.map((s) => s.toLowerCase()).includes('react');
assert(!reactGapAfter, 'React no longer appears in skill gaps after "too_easy" feedback');

const gapSetAfter = new Set(afterGaps.map((s) => s.toLowerCase()));
const scoreAfter = scoreCourse(fixedReactCourse, {
  requiredSkillsSet,
  gapSet: gapSetAfter,
  profile: afterTooEasyProfile,
});
assert(
  scoreAfter.totalScore < scoreBefore.totalScore,
  `"${fixedReactCourse.title}" score DROPPED after feedback (${scoreBefore.totalScore} -> ${scoreAfter.totalScore})`
);

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
