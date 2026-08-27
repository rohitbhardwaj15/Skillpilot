/**
 * Recommendation Engine  (v2 — language-aware)
 * ---------------------------------------------
 * Deterministic, explainable scoring — deliberately NOT an LLM call.
 *
 * Score = 0.30 * skillGapMatch
 *       + 0.25 * goalRelevance
 *       + 0.20 * prereqReadiness
 *       + 0.15 * userInterest
 *       + 0.10 * learningStyleMatch
 *
 * Language filtering:
 *   Before scoring, the catalog is filtered to keep only courses whose
 *   `language` matches the learner's preferred language.  If that would
 *   leave fewer than 5 relevant courses we fall back to also including
 *   English courses, so the roadmap is never empty.
 */

const WEIGHTS = {
  skillGapMatch:    0.30,
  goalRelevance:    0.25,
  prereqReadiness:  0.20,
  userInterest:     0.15,
  learningStyleMatch: 0.10,
};

const LEVEL_RANK      = { none: 0, beginner: 1, intermediate: 2, advanced: 3 };
const KNOWN_THRESHOLD = 2;   // 'intermediate' or above counts as "already known"

/* ─── helpers ─────────────────────────────────────────────────────────── */

function containsAsWholePhrase(haystack, needle) {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
  return pattern.test(haystack);
}

export function matchRole(targetRoleText, roles) {
  const text = targetRoleText.toLowerCase().trim();

  for (const role of roles) {
    if (
      role.aliases.some(
        (a) => containsAsWholePhrase(text, a) || containsAsWholePhrase(a, text)
      )
    ) return role;
  }

  // fallback: word-overlap with role name
  let best = null, bestScore = 0;
  const textWords = new Set(text.split(/\s+/));
  for (const role of roles) {
    const roleWords = role.role.toLowerCase().split(/\s+/);
    const overlap   = roleWords.filter((w) => textWords.has(w)).length;
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
  return requiredSkills.filter((skill) => !known.has(skill.toLowerCase()));
}

function averageLevelRank(currentSkills = []) {
  if (currentSkills.length === 0) return LEVEL_RANK.beginner;
  const sum = currentSkills.reduce(
    (acc, s) => acc + (LEVEL_RANK[s.level] ?? 0), 0
  );
  return sum / currentSkills.length;
}

const COURSE_LEVEL_RANK = { beginner: 1, intermediate: 2, advanced: 3 };

/* ─── language filter ─────────────────────────────────────────────────── */

/**
 * Returns the subset of courses that match the learner's preferred language.
 * Falls back to also including English if the filtered set is too small.
 *
 * @param {Array}  courses          – full course catalog
 * @param {string} preferredLang   – e.g. "Hindi", "Tamil", "English"
 * @param {number} minCount        – minimum before English fallback kicks in
 */
export function filterByLanguage(courses, preferredLang = 'English', minCount = 5) {
  if (!preferredLang || preferredLang === 'English') return courses;

  const preferred = courses.filter(
    (c) => c.language === preferredLang || c.language === 'English'
  );
  const nativOnly = preferred.filter((c) => c.language === preferredLang);

  // If there are enough native-language courses, prefer them; otherwise mix
  return nativOnly.length >= minCount ? preferred : courses;
}

/* ─── scoring ────────────────────────────────────────────────────────── */

export function scoreCourse(course, { requiredSkillsSet, gapSet, profile }) {
  const known       = getKnownSkillSet(profile.currentSkills);
  const courseSkills = course.skills.map((s) => s.toLowerCase());

  // 1. skillGapMatch
  const gapHits      = courseSkills.filter((s) => gapSet.has(s)).length;
  const skillGapMatch = courseSkills.length ? gapHits / courseSkills.length : 0;

  // 2. goalRelevance
  const relevanceHits = courseSkills.filter((s) => requiredSkillsSet.has(s)).length;
  const goalRelevance  = courseSkills.length ? relevanceHits / courseSkills.length : 0;

  // 3. prereqReadiness
  const prereqs = (course.prerequisites || []).map((p) => p.toLowerCase());
  const prereqReadiness =
    prereqs.length === 0
      ? 1
      : prereqs.filter((p) => known.has(p)).length / prereqs.length;

  // 4. userInterest — course type vs learner's stated style
  const style  = profile.learningStyle || [];
  const typeStyleMap = { project: 'projects', course: 'video', article: 'reading' };
  const mappedStyle  = typeStyleMap[course.type] || course.type;
  const userInterest = style.includes(mappedStyle) ? 1 : 0.4;

  // 5. learningStyleMatch — difficulty proximity
  const learnerLevel      = averageLevelRank(profile.currentSkills);
  const courseLevel       = COURSE_LEVEL_RANK[course.level] ?? 2;
  const levelDiff         = Math.abs(learnerLevel - courseLevel);
  const learningStyleMatch = Math.max(0, 1 - levelDiff / 2);

  // 6. Language bonus — small bonus for native-language courses
  const langBonus =
    profile.preferredLanguage &&
    course.language === profile.preferredLanguage &&
    profile.preferredLanguage !== 'English'
      ? 0.05
      : 0;

  const totalScore =
    WEIGHTS.skillGapMatch    * skillGapMatch    +
    WEIGHTS.goalRelevance    * goalRelevance    +
    WEIGHTS.prereqReadiness  * prereqReadiness  +
    WEIGHTS.userInterest     * userInterest     +
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

/* ─── main entry ─────────────────────────────────────────────────────── */

/**
 * Given a profile, the matched role, and the full course catalog,
 * returns a ranked, language-filtered list of candidate courses.
 */
export function rankCourses(courses, profile, role) {
  // Step 0: language filter
  const langFiltered = filterByLanguage(
    courses,
    profile.preferredLanguage || 'English'
  );

  const requiredSkillsSet = new Set(role.requiredSkills.map((s) => s.toLowerCase()));
  const gaps    = computeSkillGaps(role.requiredSkills, profile.currentSkills);
  const gapSet  = new Set(gaps.map((s) => s.toLowerCase()));

  const scored = langFiltered
    .map((course) => {
      const courseSkills = course.skills.map((s) => s.toLowerCase());
      const isRelevant   = courseSkills.some((s) => requiredSkillsSet.has(s));
      if (!isRelevant) return null;
      const breakdown = scoreCourse(course, { requiredSkillsSet, gapSet, profile });
      return { course, breakdown };
    })
    .filter(Boolean)
    .sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);

  // Diversity pass — avoid flooding roadmap with same-skill duplicates
  const coveredGapSkills = new Set();
  const diverse = [];
  for (const item of scored) {
    const cs = item.course.skills.map((s) => s.toLowerCase());
    const addsNew  = cs.some((s) => gapSet.has(s) && !coveredGapSkills.has(s));
    const isProject = item.course.type === 'project';
    if (addsNew || isProject || coveredGapSkills.size === 0) {
      diverse.push(item);
      cs.forEach((s) => coveredGapSkills.add(s));
    }
  }

  return { ranked: diverse, skillGaps: gaps };
}
