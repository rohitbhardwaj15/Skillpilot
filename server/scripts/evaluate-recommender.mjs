/**
 * Offline evaluation harness — baseline vs. enhanced ablation.
 *
 * "Baseline"  = gap-match + role-fit ranking only (no semantic layer, no
 *               learned preference model, no diversity re-ranking).
 * "Enhanced"  = the full engine in recommendation.service.js (hybrid
 *               TF-IDF + dense embedding similarity, learner preference
 *               model, MMR-style diversity).
 *
 * This directly measures whether the added ML layers actually help, rather
 * than just reporting the enhanced model's numbers in isolation.
 *
 * Run with: node scripts/evaluate-recommender.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchRole, rankCourses, scoreCourse, computeSkillGaps } from '../services/recommendation.service.js';
import { orderByPrerequisites } from '../services/pathgen.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const courses = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/courses.json'), 'utf8')).map(
  (c, i) => ({ ...c, _id: String(i), qualityScore: c.qualityScore ?? 0.75 })
);
const roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/roles.json'), 'utf8'));

// One simulated learner per target role, already knowing ~30% of that
// role's required skills — a plausible "partway there" learner.
const profiles = roles.map((role) => ({
  targetRole: role.role,
  currentSkills: role.requiredSkills
    .slice(0, Math.floor(role.requiredSkills.length * 0.3))
    .map((name) => ({ name, level: 'intermediate' })),
  knowledgeState: [],
  preferredLanguage: 'English',
  courseTypeFilter: 'both',
  learningStyle: ['video'],
  feedback: [],
  interests: [],
}));

/** Gap-match + role-fit ranking only — no semantic layer, no learned
 * preference model, no diversity re-ranking. This is the "before" state
 * the ML layers in rankCourses() are meant to improve on. */
function rankBaseline(allCourses, profile, role, gaps) {
  const requiredSkillsSet = new Set(role.requiredSkills.map((s) => s.toLowerCase()));
  const gapSet = new Set(gaps.map((s) => s.toLowerCase()));

  return allCourses
    .filter((course) => course.skills.some((s) => requiredSkillsSet.has(s.toLowerCase())))
    .map((course) => ({
      course,
      breakdown: scoreCourse(course, {
        requiredSkillsSet,
        gapSet,
        profile,
        semanticMatch: 0,
        learnedPreference: 0.5,
      }),
    }))
    .sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);
}

function precisionAndCoverage(topK, gapSet) {
  const relevant = topK.filter((x) => x.course.skills.some((s) => gapSet.has(s.toLowerCase()))).length;
  const precision = topK.length ? relevant / topK.length : 0;

  const coveredGaps = new Set(topK.flatMap((x) => x.course.skills.map((s) => s.toLowerCase())).filter((s) => gapSet.has(s)));
  const coverage = gapSet.size ? coveredGaps.size / gapSet.size : 1;

  const uniqueSkills = new Set(topK.flatMap((x) => x.course.skills.map((s) => s.toLowerCase())));
  const diversity = topK.length ? Math.min(1, uniqueSkills.size / (topK.length * 2)) : 0;

  return { precision, coverage, diversity };
}

function countPrerequisiteViolations(orderedCourses, profile) {
  const known = new Set((profile.currentSkills || []).map((s) => s.name.toLowerCase()));
  let violations = 0;

  for (const item of orderedCourses) {
    for (const prereq of item.course.prerequisites || []) {
      if (!known.has(prereq.toLowerCase())) violations++;
    }
    item.course.skills.forEach((s) => known.add(s.toLowerCase()));
  }

  return violations;
}

function relativeImprovement(before, after) {
  const absolutePoints = +(after - before).toFixed(3);
  const relativePercent = before > 0 ? +(((after - before) / before) * 100).toFixed(1) : after > 0 ? 100 : 0;
  return { absolutePoints, relativePercent };
}

async function evaluate() {
  let roleHits = 0;
  let cases = 0;

  const baselineTotals = { precision: 0, coverage: 0, diversity: 0 };
  const enhancedTotals = { precision: 0, coverage: 0, diversity: 0 };
  let prerequisiteViolations = 0;

  for (const profile of profiles) {
    const role = matchRole(profile.targetRole, roles);
    if (role?.role === profile.targetRole) roleHits++;
    if (!role) continue;

    const gaps = computeSkillGaps(role.requiredSkills, profile.currentSkills, profile.knowledgeState);
    const gapSet = new Set(gaps.map((s) => s.toLowerCase()));

    // Baseline
    const baselineTop = rankBaseline(courses, profile, role, gaps).slice(0, 10);
    const baselineScores = precisionAndCoverage(baselineTop, gapSet);
    baselineTotals.precision += baselineScores.precision;
    baselineTotals.coverage += baselineScores.coverage;
    baselineTotals.diversity += baselineScores.diversity;

    // Enhanced — the real engine, including the async semantic layer.
    const { ranked } = await rankCourses(courses, profile, role);
    const enhancedTop = ranked.slice(0, 10);
    const enhancedScores = precisionAndCoverage(enhancedTop, gapSet);
    enhancedTotals.precision += enhancedScores.precision;
    enhancedTotals.coverage += enhancedScores.coverage;
    enhancedTotals.diversity += enhancedScores.diversity;

    // Prerequisite safety is measured on the enhanced model's roadmap,
    // since that's what learners actually see.
    const ordered = orderByPrerequisites(ranked, profile);
    prerequisiteViolations += countPrerequisiteViolations(ordered, profile);

    cases++;
  }

  const avg = (sum) => +(sum / Math.max(1, cases)).toFixed(3);

  const baseline = {
    precisionAt10: avg(baselineTotals.precision),
    skillCoverageAt10: avg(baselineTotals.coverage),
    recommendationDiversity: avg(baselineTotals.diversity),
  };
  const enhanced = {
    precisionAt10: avg(enhancedTotals.precision),
    skillCoverageAt10: avg(enhancedTotals.coverage),
    recommendationDiversity: avg(enhancedTotals.diversity),
  };

  return {
    cases,
    roleMatchAccuracy: +(roleHits / Math.max(1, cases)).toFixed(3),
    baseline,
    enhanced,
    improvement: {
      precisionAt10: relativeImprovement(baseline.precisionAt10, enhanced.precisionAt10),
      skillCoverageAt10: relativeImprovement(baseline.skillCoverageAt10, enhanced.skillCoverageAt10),
      recommendationDiversity: relativeImprovement(baseline.recommendationDiversity, enhanced.recommendationDiversity),
    },
    prerequisiteViolationRate: +(prerequisiteViolations / Math.max(1, cases * 10)).toFixed(3),
    methodology: {
      baseline: 'Gap-match + role-fit ranking',
      enhanced: 'Hybrid TF-IDF + dense embedding similarity + skill-gap matching + prerequisite-aware ranking + learner-preference model + MMR-style diversity',
      precision: 'Fraction of top-10 recommendations that directly address an identified target-role skill gap',
      skillCoverage: 'Fraction of identified target-role skill gaps represented by the top-10 recommendations',
      diversity: 'Normalized unique-skill representation across the top-10 recommendations',
      prerequisiteSafety: 'Recommendations are ordered through the prerequisite-aware path planner before violation measurement',
      evaluationScope: 'One simulated learner profile per target role using approximately 30% of the role skills as already-known skills',
    },
  };
}

const result = await evaluate();
console.log(JSON.stringify(result, null, 2));
fs.writeFileSync(path.join(__dirname, '../../docs/recommendation-evaluation.json'), JSON.stringify(result, null, 2) + '\n');
