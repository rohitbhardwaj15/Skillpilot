/**
 * Recommendation Engine  (v3 — language + courseType aware)
 *
 * Score = 0.30 * skillGapMatch
 *       + 0.25 * goalRelevance
 *       + 0.20 * prereqReadiness
 *       + 0.15 * userInterest
 *       + 0.10 * learningStyleMatch
 *       + 0.05  language bonus
 */

const WEIGHTS = {
  skillGapMatch:     0.30,
  goalRelevance:     0.25,
  prereqReadiness:   0.20,
  userInterest:      0.15,
  learningStyleMatch:0.10,
};

const LEVEL_RANK      = { none: 0, beginner: 1, intermediate: 2, advanced: 3 };
const KNOWN_THRESHOLD = 2;
const COURSE_LEVEL_RANK = { beginner: 1, intermediate: 2, advanced: 3 };

function containsAsWholePhrase(haystack, needle) {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

export function matchRole(targetRoleText, roles) {
  const text = (targetRoleText || '').toLowerCase().trim();
  for (const role of roles) {
    if (role.aliases.some((a) =>
      containsAsWholePhrase(text, a) || containsAsWholePhrase(a, text)
    )) return role;
  }
  let best = null, bestScore = 0;
  const textWords = new Set(text.split(/\s+/));
  for (const role of roles) {
    const overlap = role.role.toLowerCase().split(/\s+/).filter((w) => textWords.has(w)).length;
    if (overlap > bestScore) { bestScore = overlap; best = role; }
  }
  return best;
}

function getKnownSkillSet(currentSkills = []) {
  return new Set(
    currentSkills
      .filter((s) => (LEVEL_RANK[s.level] ?? 0) >= KNOWN_THRESHOLD)
      .map((s) => s.name.toLowerCase())
  );
}

export function computeSkillGaps(requiredSkills, currentSkills) {
  const known = getKnownSkillSet(currentSkills);
  return requiredSkills.filter((s) => !known.has(s.toLowerCase()));
}

function averageLevelRank(currentSkills = []) {
  if (!currentSkills.length) return LEVEL_RANK.beginner;
  return currentSkills.reduce((acc, s) => acc + (LEVEL_RANK[s.level] ?? 0), 0) / currentSkills.length;
}

/* ── Language filter ──────────────────────────────────────────────────── */
export function filterByLanguage(courses, preferredLang = 'English', minCount = 5) {
  if (!preferredLang || preferredLang === 'English') return courses;
  const nativeOnly = courses.filter((c) => c.language === preferredLang);
  return nativeOnly.length >= minCount
    ? courses.filter((c) => c.language === preferredLang || c.language === 'English')
    : courses;
}

/* ── Course type filter (free / paid / both) ──────────────────────────── */
export function filterByCourseType(courses, courseTypeFilter = 'both') {
  if (courseTypeFilter === 'free') return courses.filter((c) => c.is_free);
  if (courseTypeFilter === 'paid') return courses.filter((c) => !c.is_free);
  return courses;
}

/* ── Learning style filter ────────────────────────────────────────────── */
export function filterByLearningStyle(courses, learningStyle = []) {
  if (!learningStyle.length) return courses;
  if (learningStyle.includes('video') && !learningStyle.includes('projects') && !learningStyle.includes('reading')) {
    return courses.filter((c) => c.youtube_url || c.type === 'course');
  }
  if (learningStyle.includes('reading') && !learningStyle.includes('projects') && !learningStyle.includes('video')) {
    return courses.filter((c) => c.documentation_url || c.type === 'article');
  }
  return courses;
}

/* ── Scoring ──────────────────────────────────────────────────────────── */
export function scoreCourse(course, { requiredSkillsSet, gapSet, profile }) {
  const known        = getKnownSkillSet(profile.currentSkills);
  const courseSkills = course.skills.map((s) => s.toLowerCase());

  const skillGapMatch  = courseSkills.length
    ? courseSkills.filter((s) => gapSet.has(s)).length / courseSkills.length : 0;

  const goalRelevance  = courseSkills.length
    ? courseSkills.filter((s) => requiredSkillsSet.has(s)).length / courseSkills.length : 0;

  const prereqs = (course.prerequisites || []).map((p) => p.toLowerCase());
  const prereqReadiness = prereqs.length === 0
    ? 1 : prereqs.filter((p) => known.has(p)).length / prereqs.length;

  const style        = profile.learningStyle || [];
  const typeStyleMap = { project: 'projects', course: 'video', article: 'reading' };
  const userInterest = style.includes(typeStyleMap[course.type] || course.type) ? 1 : 0.4;

  const levelDiff         = Math.abs(averageLevelRank(profile.currentSkills) - (COURSE_LEVEL_RANK[course.level] ?? 2));
  const learningStyleMatch = Math.max(0, 1 - levelDiff / 2);

  const langBonus = profile.preferredLanguage &&
    course.language === profile.preferredLanguage &&
    profile.preferredLanguage !== 'English' ? 0.05 : 0;

  const totalScore =
    WEIGHTS.skillGapMatch     * skillGapMatch     +
    WEIGHTS.goalRelevance     * goalRelevance     +
    WEIGHTS.prereqReadiness   * prereqReadiness   +
    WEIGHTS.userInterest      * userInterest      +
    WEIGHTS.learningStyleMatch * learningStyleMatch +
    langBonus;

  return {
    skillGapMatch:     round(skillGapMatch),
    goalRelevance:     round(goalRelevance),
    prereqReadiness:   round(prereqReadiness),
    userInterest:      round(userInterest),
    learningStyleMatch: round(learningStyleMatch),
    langBonus:         round(langBonus),
    totalScore:        round(totalScore),
  };
}

function round(n) { return Math.round(n * 100) / 100; }

/* ── Main entry ───────────────────────────────────────────────────────── */
export function rankCourses(courses, profile, role) {
  // Apply all filters in sequence
  let filtered = filterByLanguage(courses, profile.preferredLanguage || 'English');
  filtered     = filterByCourseType(filtered, profile.courseTypeFilter || 'both');
  filtered     = filterByLearningStyle(filtered, profile.learningStyle || []);

  // Fall back to all courses if filters too aggressive
  if (filtered.length < 10) filtered = courses;

  const requiredSkillsSet = new Set(role.requiredSkills.map((s) => s.toLowerCase()));
  const gaps    = computeSkillGaps(role.requiredSkills, profile.currentSkills);
  const gapSet  = new Set(gaps.map((s) => s.toLowerCase()));

  const scored = filtered
    .map((course) => {
      const isRelevant = course.skills.map((s) => s.toLowerCase()).some((s) => requiredSkillsSet.has(s));
      if (!isRelevant) return null;
      const breakdown = scoreCourse(course, { requiredSkillsSet, gapSet, profile });
      return { course, breakdown };
    })
    .filter(Boolean)
    .sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);

  // Diversity pass
  const coveredGapSkills = new Set();
  const diverse = [];
  for (const item of scored) {
    const cs      = item.course.skills.map((s) => s.toLowerCase());
    const addsNew = cs.some((s) => gapSet.has(s) && !coveredGapSkills.has(s));
    if (addsNew || item.course.type === 'project' || coveredGapSkills.size === 0) {
      diverse.push(item);
      cs.forEach((s) => coveredGapSkills.add(s));
    }
  }

  return { ranked: diverse, skillGaps: gaps };
}
