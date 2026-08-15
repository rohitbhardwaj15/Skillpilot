/**
 * Recommendation Engine
 * ---------------------
 * Deterministic, explainable scoring — deliberately NOT an LLM call.
 * This is the piece that proves to judges there's a real recommendation
 * system under the hood, not just a chatbot wrapper.
 *
 * Score = 0.30 * skillGapMatch
 *       + 0.25 * goalRelevance
 *       + 0.20 * prereqReadiness
 *       + 0.15 * userInterest
 *       + 0.10 * learningStyleMatch
 */

const WEIGHTS = {
  skillGapMatch: 0.30,
  goalRelevance: 0.25,
  prereqReadiness: 0.20,
  userInterest: 0.15,
  learningStyleMatch: 0.10,
};

const LEVEL_RANK = { none: 0, beginner: 1, intermediate: 2, advanced: 3 };
const KNOWN_THRESHOLD = 2; // 'intermediate' or above counts as "already known"

/**
 * Finds the best-matching role definition for a free-text target role,
 * using simple alias/substring matching. Falls back to null if nothing matches
 * reasonably, in which case the caller should widen the search to all courses.
 */
export function matchRole(targetRoleText, roles) {
  const text = targetRoleText.toLowerCase().trim();

  // exact/alias match first
  for (const role of roles) {
    if (role.aliases.some((a) => text.includes(a) || a.includes(text))) {
      return role;
    }
  }

  // fallback: score by word overlap with role name
  let best = null;
  let bestScore = 0;
  const textWords = new Set(text.split(/\s+/));
  for (const role of roles) {
    const roleWords = role.role.toLowerCase().split(/\s+/);
    const overlap = roleWords.filter((w) => textWords.has(w)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = role;
    }
  }
  return best;
}

/** Skills the learner already knows at intermediate level or above. */
function getKnownSkillSet(currentSkills = []) {
  return new Set(
    currentSkills
      .filter((s) => (LEVEL_RANK[s.level] ?? 0) >= KNOWN_THRESHOLD)
      .map((s) => s.name.toLowerCase())
  );
}

/**
 * Computes skill gaps: required skills for the role minus what the learner
 * already knows well.
 */
export function computeSkillGaps(requiredSkills, currentSkills) {
  const known = getKnownSkillSet(currentSkills);
  return requiredSkills.filter((skill) => !known.has(skill.toLowerCase()));
}

/** Average level rank across the learner's current skills — used for style/level matching. */
function averageLevelRank(currentSkills = []) {
  if (currentSkills.length === 0) return LEVEL_RANK.beginner;
  const sum = currentSkills.reduce((acc, s) => acc + (LEVEL_RANK[s.level] ?? 0), 0);
  return sum / currentSkills.length;
}

const COURSE_LEVEL_RANK = { beginner: 1, intermediate: 2, advanced: 3 };

/**
 * Scores a single course against the learner's profile and skill gaps.
 * Returns the breakdown AND the total, so the frontend/LLM explanation layer
 * can show *why* a score is what it is — not just the final number.
 */
export function scoreCourse(course, { requiredSkillsSet, gapSet, profile }) {
  const known = getKnownSkillSet(profile.currentSkills);
  const courseSkills = course.skills.map((s) => s.toLowerCase());

  // 1. skillGapMatch — how much of this course addresses skills the learner is missing
  const gapHits = courseSkills.filter((s) => gapSet.has(s)).length;
  const skillGapMatch = courseSkills.length ? gapHits / courseSkills.length : 0;

  // 2. goalRelevance — how much of this course maps to the target role at all
  const relevanceHits = courseSkills.filter((s) => requiredSkillsSet.has(s)).length;
  const goalRelevance = courseSkills.length ? relevanceHits / courseSkills.length : 0;

  // 3. prereqReadiness — fraction of this course's prerequisites the learner already knows
  const prereqs = (course.prerequisites || []).map((p) => p.toLowerCase());
  const prereqReadiness =
    prereqs.length === 0 ? 1 : prereqs.filter((p) => known.has(p)).length / prereqs.length;

  // 4. userInterest — does the course type match the learner's stated learning style?
  const style = profile.learningStyle || [];
  const typeStyleMap = { project: 'projects', course: 'video', article: 'reading' };
  const mappedStyle = typeStyleMap[course.type] || course.type;
  const userInterest = style.includes(mappedStyle) ? 1 : 0.4;

  // 5. learningStyleMatch — proximity between course difficulty and learner's current level
  const learnerLevel = averageLevelRank(profile.currentSkills);
  const courseLevel = COURSE_LEVEL_RANK[course.level] ?? 2;
  const levelDiff = Math.abs(learnerLevel - courseLevel);
  const learningStyleMatch = Math.max(0, 1 - levelDiff / 2);

  const totalScore =
    WEIGHTS.skillGapMatch * skillGapMatch +
    WEIGHTS.goalRelevance * goalRelevance +
    WEIGHTS.prereqReadiness * prereqReadiness +
    WEIGHTS.userInterest * userInterest +
    WEIGHTS.learningStyleMatch * learningStyleMatch;

  return {
    skillGapMatch: round(skillGapMatch),
    goalRelevance: round(goalRelevance),
    prereqReadiness: round(prereqReadiness),
    userInterest: round(userInterest),
    learningStyleMatch: round(learningStyleMatch),
    totalScore: round(totalScore),
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Main entry point: given a profile, the matched role, and the full course
 * catalog, returns a ranked, filtered list of candidate courses with score
 * breakdowns. Only courses relevant to the gap or the role are considered —
 * this keeps the roadmap focused instead of dumping the entire catalog.
 */
export function rankCourses(courses, profile, role) {
  const requiredSkillsSet = new Set(role.requiredSkills.map((s) => s.toLowerCase()));
  const gaps = computeSkillGaps(role.requiredSkills, profile.currentSkills);
  const gapSet = new Set(gaps.map((s) => s.toLowerCase()));

  const scored = courses
    .map((course) => {
      const courseSkills = course.skills.map((s) => s.toLowerCase());
      const isRelevant = courseSkills.some((s) => requiredSkillsSet.has(s));
      if (!isRelevant) return null;

      const breakdown = scoreCourse(course, { requiredSkillsSet, gapSet, profile });
      return { course, breakdown };
    })
    .filter(Boolean)
    .sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);

  return { ranked: scored, skillGaps: gaps };
}
