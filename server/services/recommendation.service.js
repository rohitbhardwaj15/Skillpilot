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
  skillGapMatch:     0.20,
  goalRelevance:     0.16,
  prereqReadiness:   0.12,
  userInterest:      0.10,
  learningStyleMatch:0.08,
  semanticMatch:     0.26,
  languageMatch:     0.06,
  quality:           0.03,
};

import {
  semanticCourseScores,
  trainPreferenceModel,
  predictPreference,
  buildFeedbackExamples,
} from './ml.service.js';

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

function getKnownSkillSet(currentSkills = [], knowledgeState = []) {
  const known = new Set(currentSkills
    .filter((s) => (LEVEL_RANK[s.level] ?? 0) >= KNOWN_THRESHOLD)
    .map((s) => s.name.toLowerCase()));
  // Evidence-backed mastery takes precedence over self-reporting.
  for (const state of knowledgeState || []) {
    if (Number(state.level) >= 0.55 && Number(state.confidence) >= 0.45) known.add(state.skill.toLowerCase());
  }
  return known;
}

export function computeSkillGaps(requiredSkills, currentSkills, knowledgeState = []) {
  const known = getKnownSkillSet(currentSkills, knowledgeState);
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
export function scoreCourse(course, { requiredSkillsSet, gapSet, profile, semanticMatch = 0, learnedPreference = 0.5 }) {
  const known        = getKnownSkillSet(profile.currentSkills, profile.knowledgeState);
  const courseSkills = course.skills.map((s) => s.toLowerCase());

  const skillGapMatch  = courseSkills.length
    ? courseSkills.filter((s) => gapSet.has(s)).length / courseSkills.length : 0;

  const goalRelevance  = courseSkills.length
    ? courseSkills.filter((s) => requiredSkillsSet.has(s)).length / courseSkills.length : 0;

  const prereqs = (course.prerequisites || []).map((p) => p.toLowerCase());
  const prereqReadiness = prereqs.length === 0
    ? 1 : prereqs.filter((p) => known.has(p)).length / prereqs.length;

  const style        = profile.learningStyle || [];
  const typeStyleMap = { project: 'projects', course: 'video', article: 'reading', assessment: 'interactive' };
  const userInterest = style.includes(typeStyleMap[course.type] || course.type) ? 1 : 0.4;

  const levelDiff         = Math.abs(averageLevelRank(profile.currentSkills) - (COURSE_LEVEL_RANK[course.level] ?? 2));
  const learningStyleMatch = Math.max(0, 1 - levelDiff / 2);

  const languageMatch = profile.preferredLanguage &&
    course.language === profile.preferredLanguage ? 1 : 0;

  const quality = Number.isFinite(Number(course.qualityScore)) ? Number(course.qualityScore) : 0.5;

  const deterministicScore =
    WEIGHTS.skillGapMatch      * skillGapMatch +
    WEIGHTS.goalRelevance      * goalRelevance +
    WEIGHTS.prereqReadiness    * prereqReadiness +
    WEIGHTS.userInterest       * userInterest +
    WEIGHTS.learningStyleMatch * learningStyleMatch +
    WEIGHTS.semanticMatch      * semanticMatch +
    WEIGHTS.languageMatch      * languageMatch;

  // Blend learned learner preference with content/skill intelligence.
  // The ML component is deliberately capped so safety/relevance signals remain dominant.
  const totalScore = (0.75 * deterministicScore) + (0.25 * learnedPreference);

  return {
    skillGapMatch: round(skillGapMatch),
    goalRelevance: round(goalRelevance),
    prereqReadiness: round(prereqReadiness),
    userInterest: round(userInterest),
    learningStyleMatch: round(learningStyleMatch),
    semanticMatch: round(semanticMatch),
    languageMatch: round(languageMatch),
    quality: round(quality),
    learnedPreference: round(learnedPreference),
    deterministicScore: round(deterministicScore),
    totalScore: round(totalScore),
  };
}

function round(n) { return Math.round(n * 100) / 100; }

function explainWhy(course, breakdown, profile, role, gaps) {
  const reasons = [];
  const blockers = [];
  const gapSkills = course.skills.filter(s => gaps.some(g => g.toLowerCase() === s.toLowerCase()));
  if (gapSkills.length) reasons.push(`Covers ${gapSkills.slice(0, 2).join(', ')} — current skill gap`);
  if (breakdown.semanticMatch >= 0.18) reasons.push('Semantically aligned with your goal');
  if (breakdown.prereqReadiness >= 0.99) reasons.push('Prerequisites are satisfied');
  if (breakdown.quality >= 0.75) reasons.push('High resource quality score');
  if (profile.preferredLanguage && course.language === profile.preferredLanguage) reasons.push(`Matches your ${course.language} preference`);
  for (const p of course.prerequisites || []) {
    const known = getKnownSkillSet(profile.currentSkills, profile.knowledgeState);
    if (!known.has(p.toLowerCase())) blockers.push(`Requires ${p}, which is not yet mastered`);
  }
  if (!gapSkills.length) blockers.push('Covers fewer of your current role skill gaps');
  if (breakdown.goalRelevance < 0.2) blockers.push('Lower relevance to your target role');
  return { why: reasons.slice(0, 4), whyNot: blockers.slice(0, 3) };
}

/* ── Main entry ───────────────────────────────────────────────────────── */
export function rankCourses(courses, profile, role) {
  let filtered = filterByLanguage(courses, profile.preferredLanguage || 'English');
  filtered     = filterByCourseType(filtered, profile.courseTypeFilter || 'both');
  filtered     = filterByLearningStyle(filtered, profile.learningStyle || []);

  if (filtered.length < 10) filtered = courses;

  const requiredSkillsSet = new Set(role.requiredSkills.map((s) => s.toLowerCase()));
  const gaps    = computeSkillGaps(role.requiredSkills, profile.currentSkills, profile.knowledgeState);
  const gapSet  = new Set(gaps.map((s) => s.toLowerCase()));

  // NLP/ML layer: represent the learner and every course as TF-IDF vectors
  // and use cosine similarity as a semantic relevance signal.
  const semanticScores = semanticCourseScores(filtered, profile, role, gaps);

  const baseScoreBuilder = (course, opts = {}) => {
    const semanticMatch = semanticScores.get(String(course._id || course.id || course.title)) || 0;
    return scoreCourse(course, {
      requiredSkillsSet, gapSet, profile, semanticMatch, learnedPreference: 0.5,
    });
  };

  // Supervised learner model: train only from this user's historical feedback.
  const feedbackExamples = buildFeedbackExamples(profile, filtered, baseScoreBuilder);
  const preferenceModel = trainPreferenceModel(feedbackExamples);

  const scored = filtered
    .map((course) => {
      const isRelevant = course.skills.map((s) => s.toLowerCase()).some((s) => requiredSkillsSet.has(s))
        || (semanticScores.get(String(course._id || course.id || course.title)) || 0) >= 0.18;
      if (!isRelevant) return null;

      const semanticMatch = semanticScores.get(String(course._id || course.id || course.title)) || 0;
      const base = scoreCourse(course, {
        requiredSkillsSet, gapSet, profile, semanticMatch, learnedPreference: 0.5,
      });
      const learnedPreference = predictPreference(preferenceModel, base);
      const breakdown = scoreCourse(course, {
        requiredSkillsSet, gapSet, profile, semanticMatch, learnedPreference,
      });
      const explanation = explainWhy(course, breakdown, profile, role, gaps);
      return {
        course,
        breakdown,
        explanation,
        ml: {
          semanticModel: 'tfidf-cosine',
          preferenceModel: preferenceModel.trained ? 'online-logistic-regression' : 'cold-start-prior',
          feedbackSamples: preferenceModel.samples,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);

  // Diversity pass: maximize uncovered skill gaps instead of returning near-duplicates.
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

  // Preserve prerequisite providers even when the diversity pass would otherwise
  // remove them. This prevents a high-scoring advanced course from hiding the
  // foundational resource needed to reach it.
  const selectedIds = new Set(diverse.map(item => String(item.course._id || item.course.id || item.course.title)));
  for (const item of scored) {
    if (selectedIds.has(String(item.course._id || item.course.id || item.course.title))) continue;
    const providesPrerequisite = diverse.some(selected =>
      (selected.course.prerequisites || []).some(prereq =>
        item.course.skills.some(skill => skill.toLowerCase() === prereq.toLowerCase())
      )
    );
    if (providesPrerequisite) {
      diverse.push(item);
      selectedIds.add(String(item.course._id || item.course.id || item.course.title));
    }
  }

  return {
    ranked: diverse,
    skillGaps: gaps,
    model: {
      semantic: 'TF-IDF + cosine similarity',
      personalization: preferenceModel.trained ? 'online logistic regression from feedback' : 'cold-start prior',
      feedbackSamples: preferenceModel.samples,
      features: ['skill gap', 'goal relevance', 'prerequisite readiness', 'learning preference', 'semantic similarity', 'language'],
    },
  };
}

