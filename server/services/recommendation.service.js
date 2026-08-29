/**
 * Recommendation Engine (v3)
 *
 * Hybrid recommendation:
 * - Skill-gap matching
 * - Goal relevance
 * - Prerequisite readiness
 * - User interest
 * - Learning style
 * - TF-IDF similarity
 * - Dense embedding similarity
 * - Language preference
 * - Resource quality
 * - Learned learner preference
 * - MMR-style diversity
 */

const WEIGHTS = {
  skillGapMatch: 0.28,
  goalRelevance: 0.22,
  prereqReadiness: 0.15,
  userInterest: 0.07,
  learningStyleMatch: 0.05,
  semanticMatch: 0.12,
  languageMatch: 0.07,
  quality: 0.04,
};

import {
  semanticCourseScores,
  trainPreferenceModel,
  predictPreference,
  buildFeedbackExamples,
} from './ml.service.js';

const LEVEL_RANK = {
  none: 0,
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const KNOWN_THRESHOLD = 2;

const COURSE_LEVEL_RANK = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

function containsAsWholePhrase(haystack, needle) {
  if (!needle) return false;

  const escaped = needle.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  return new RegExp(
    `(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,
    'i'
  ).test(haystack);
}

export function matchRole(targetRoleText, roles) {
  const text = (targetRoleText || '').toLowerCase().trim();

  for (const role of roles) {
    if (
      role.aliases.some(
        (a) =>
          containsAsWholePhrase(text, a) ||
          containsAsWholePhrase(a, text)
      )
    ) {
      return role;
    }
  }

  let best = null;
  let bestScore = 0;

  const textWords = new Set(text.split(/\s+/));

  for (const role of roles) {
    const overlap = role.role
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => textWords.has(w)).length;

    if (overlap > bestScore) {
      bestScore = overlap;
      best = role;
    }
  }

  return best;
}

function getKnownSkillSet(
  currentSkills = [],
  knowledgeState = []
) {
  const known = new Set(
    currentSkills
      .filter(
        (s) =>
          (LEVEL_RANK[s.level] ?? 0) >=
          KNOWN_THRESHOLD
      )
      .map((s) => s.name.toLowerCase())
  );

  // Evidence-backed mastery takes precedence
  // over self-reported skills.
  for (const state of knowledgeState || []) {
    if (
      Number(state.level) >= 0.55 &&
      Number(state.confidence) >= 0.45
    ) {
      known.add(state.skill.toLowerCase());
    }
  }

  return known;
}

export function computeSkillGaps(
  requiredSkills,
  currentSkills,
  knowledgeState = []
) {
  const known = getKnownSkillSet(
    currentSkills,
    knowledgeState
  );

  return requiredSkills.filter(
    (s) => !known.has(s.toLowerCase())
  );
}

function averageLevelRank(currentSkills = []) {
  if (!currentSkills.length) {
    return LEVEL_RANK.beginner;
  }

  return (
    currentSkills.reduce(
      (acc, s) =>
        acc + (LEVEL_RANK[s.level] ?? 0),
      0
    ) / currentSkills.length
  );
}

/* ── Language filter ───────────────────────────── */

export function filterByLanguage(
  courses,
  preferredLang = 'English',
  minCount = 5
) {
  if (
    !preferredLang ||
    preferredLang === 'English'
  ) {
    return courses;
  }

  const nativeOnly = courses.filter(
    (c) => c.language === preferredLang
  );

  return nativeOnly.length >= minCount
    ? courses.filter(
        (c) =>
          c.language === preferredLang ||
          c.language === 'English'
      )
    : courses;
}

/* ── Course type filter ─────────────────────────── */

export function filterByCourseType(
  courses,
  courseTypeFilter = 'both'
) {
  if (courseTypeFilter === 'free') {
    return courses.filter((c) => c.is_free);
  }

  if (courseTypeFilter === 'paid') {
    return courses.filter((c) => !c.is_free);
  }

  return courses;
}

/* ── Learning style filter ──────────────────────── */

export function filterByLearningStyle(
  courses,
  learningStyle = []
) {
  if (!learningStyle.length) {
    return courses;
  }

  if (
    learningStyle.includes('video') &&
    !learningStyle.includes('projects') &&
    !learningStyle.includes('reading')
  ) {
    return courses.filter(
      (c) => c.youtube_url || c.type === 'course'
    );
  }

  if (
    learningStyle.includes('reading') &&
    !learningStyle.includes('projects') &&
    !learningStyle.includes('video')
  ) {
    return courses.filter(
      (c) =>
        c.documentation_url ||
        c.type === 'article'
    );
  }

  return courses;
}

/* ── Course scoring ─────────────────────────────── */

export function scoreCourse(
  course,
  {
    requiredSkillsSet,
    gapSet,
    profile,
    semanticMatch = 0,
    learnedPreference = 0.5,
  }
) {
  const known = getKnownSkillSet(
    profile.currentSkills,
    profile.knowledgeState
  );

  const courseSkills = course.skills.map((s) =>
    s.toLowerCase()
  );

  const skillGapMatch = courseSkills.length
    ? courseSkills.filter((s) =>
        gapSet.has(s)
      ).length / courseSkills.length
    : 0;

  const goalRelevance = courseSkills.length
    ? courseSkills.filter((s) =>
        requiredSkillsSet.has(s)
      ).length / courseSkills.length
    : 0;

  const prereqs = (
    course.prerequisites || []
  ).map((p) => p.toLowerCase());

  const prereqReadiness =
    prereqs.length === 0
      ? 1
      : prereqs.filter((p) =>
          known.has(p)
        ).length / prereqs.length;

  const style = profile.learningStyle || [];

  const typeStyleMap = {
    project: 'projects',
    course: 'video',
    article: 'reading',
    assessment: 'interactive',
  };

  const userInterest = style.includes(
    typeStyleMap[course.type] || course.type
  )
    ? 1
    : 0.4;

  const levelDiff = Math.abs(
    averageLevelRank(profile.currentSkills) -
      (COURSE_LEVEL_RANK[course.level] ?? 2)
  );

  const learningStyleMatch = Math.max(
    0,
    1 - levelDiff / 2
  );

  const languageMatch =
    profile.preferredLanguage &&
    course.language ===
      profile.preferredLanguage
      ? 1
      : 0;

  const quality = Number.isFinite(
    Number(course.qualityScore)
  )
    ? Number(course.qualityScore)
    : 0.5;

  const deterministicScore =
    WEIGHTS.skillGapMatch *
      skillGapMatch +
    WEIGHTS.goalRelevance *
      goalRelevance +
    WEIGHTS.prereqReadiness *
      prereqReadiness +
    WEIGHTS.userInterest *
      userInterest +
    WEIGHTS.learningStyleMatch *
      learningStyleMatch +
    WEIGHTS.semanticMatch *
      semanticMatch +
    WEIGHTS.languageMatch *
      languageMatch;

  /*
   * Learner preference is deliberately capped
   * so relevance and safety signals remain dominant.
   */
  const totalScore =
    0.75 * deterministicScore +
    0.25 * learnedPreference;

  return {
    skillGapMatch: round(skillGapMatch),
    goalRelevance: round(goalRelevance),
    prereqReadiness: round(prereqReadiness),
    userInterest: round(userInterest),
    learningStyleMatch: round(
      learningStyleMatch
    ),
    semanticMatch: round(semanticMatch),
    languageMatch: round(languageMatch),
    quality: round(quality),
    learnedPreference: round(
      learnedPreference
    ),
    deterministicScore: round(
      deterministicScore
    ),
    totalScore: round(totalScore),
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

/* ── Explain recommendation ────────────────────── */

function explainWhy(
  course,
  breakdown,
  profile,
  role,
  gaps
) {
  const reasons = [];
  const blockers = [];

  const gapSkills = course.skills.filter(
    (s) =>
      gaps.some(
        (g) =>
          g.toLowerCase() ===
          s.toLowerCase()
      )
  );

  if (gapSkills.length) {
    reasons.push(
      `Covers ${gapSkills
        .slice(0, 2)
        .join(', ')} — current skill gap`
    );
  }

  if (breakdown.semanticMatch >= 0.18) {
    reasons.push(
      'Semantically aligned with your goal'
    );
  }

  if (breakdown.prereqReadiness >= 0.99) {
    reasons.push(
      'Prerequisites are satisfied'
    );
  }

  if (breakdown.quality >= 0.75) {
    reasons.push(
      'High resource quality score'
    );
  }

  if (breakdown.learnedPreference >= 0.65) {
    reasons.push(
      'Matches patterns from your previous feedback'
    );
  }

  if (
    profile.preferredLanguage &&
    course.language ===
      profile.preferredLanguage
  ) {
    reasons.push(
      `Matches your ${course.language} preference`
    );
  }

  for (const p of course.prerequisites || []) {
    const known = getKnownSkillSet(
      profile.currentSkills,
      profile.knowledgeState
    );

    if (!known.has(p.toLowerCase())) {
      blockers.push(
        `Requires ${p}, which is not yet mastered`
      );
    }
  }

  if (!gapSkills.length) {
    blockers.push(
      'Covers fewer of your current role skill gaps'
    );
  }

  if (breakdown.goalRelevance < 0.2) {
    blockers.push(
      'Lower relevance to your target role'
    );
  }

  return {
    why: reasons.slice(0, 4),
    whyNot: blockers.slice(0, 3),
  };
}

/* ── Main recommendation engine ──────────────── */

export function rankCourses(
  courses,
  profile,
  role
) {
  let filtered = filterByLanguage(
    courses,
    profile.preferredLanguage || 'English'
  );

  filtered = filterByCourseType(
    filtered,
    profile.courseTypeFilter || 'both'
  );

  filtered = filterByLearningStyle(
    filtered,
    profile.learningStyle || []
  );

  if (filtered.length < 10) {
    filtered = courses;
  }

  const requiredSkillsSet = new Set(
    role.requiredSkills.map((s) =>
      s.toLowerCase()
    )
  );

  const gaps = computeSkillGaps(
    role.requiredSkills,
    profile.currentSkills,
    profile.knowledgeState
  );

  const gapSet = new Set(
    gaps.map((s) => s.toLowerCase())
  );

  /*
   * Hybrid semantic layer:
   *
   * TF-IDF similarity
   * +
   * dense embedding cosine similarity
   */
  const semanticScores =
    semanticCourseScores(
      filtered,
      profile,
      role,
      gaps
    );

  const baseScoreBuilder = (
    course,
    opts = {}
  ) => {
    const semanticMatch =
      semanticScores.get(
        String(
          course._id ||
            course.id ||
            course.title
        )
      ) || 0;

    return scoreCourse(course, {
      requiredSkillsSet,
      gapSet,
      profile,
      semanticMatch,
      learnedPreference: 0.5,
    });
  };

  /*
   * Train learner preference model
   * from historical feedback.
   */
  const feedbackExamples =
    buildFeedbackExamples(
      profile,
      filtered,
      baseScoreBuilder
    );

  const preferenceModel =
    trainPreferenceModel(
      feedbackExamples
    );

  const scored = filtered
    .map((course) => {
      const courseKey = String(
        course._id ||
          course.id ||
          course.title
      );

      const semanticMatch =
        semanticScores.get(courseKey) || 0;

      const isRelevant =
        course.skills
          .map((s) => s.toLowerCase())
          .some((s) =>
            requiredSkillsSet.has(s)
          ) ||
        semanticMatch >= 0.18;

      if (!isRelevant) {
        return null;
      }

      const base = scoreCourse(course, {
        requiredSkillsSet,
        gapSet,
        profile,
        semanticMatch,
        learnedPreference: 0.5,
      });

      const learnedPreference =
        predictPreference(
          preferenceModel,
          base
        );

      const breakdown = scoreCourse(
        course,
        {
          requiredSkillsSet,
          gapSet,
          profile,
          semanticMatch,
          learnedPreference,
        }
      );

      const explanation = explainWhy(
        course,
        breakdown,
        profile,
        role,
        gaps
      );

      return {
        course,
        breakdown,
        explanation,

        ml: {
          semanticModel:
            'hybrid-tfidf + dense-embedding-cosine',

          preferenceModel:
            preferenceModel.trained
              ? 'online-logistic-regression'
              : 'cold-start-prior',

          feedbackSamples:
            preferenceModel.samples,
        },
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.breakdown.totalScore -
        a.breakdown.totalScore
    );

  /*
   * MMR-style diversity pass.
   *
   * Keeps high relevance while encouraging
   * coverage of new skill gaps.
   *
   * Candidate pool is capped to keep
   * computation fast for large catalogs.
   */
  const pool = scored.slice(0, 120);

  const diverse = [];
  const coveredGapSkills = new Set();

  while (pool.length) {
    let bestIndex = 0;
    let bestAdjusted = -Infinity;

    for (
      let i = 0;
      i < pool.length;
      i++
    ) {
      const item = pool[i];

      const skills =
        item.course.skills.map((s) =>
          s.toLowerCase()
        );

      const newGaps = skills.filter(
        (s) =>
          gapSet.has(s) &&
          !coveredGapSkills.has(s)
      ).length;

      const gapCount = Math.max(
        1,
        skills.filter((s) =>
          gapSet.has(s)
        ).length
      );

      const novelty =
        newGaps / gapCount;

      const overlap = diverse.length
        ? Math.max(
            ...diverse
              .slice(-8)
              .map((d) => {
                const other = new Set(
                  d.course.skills.map(
                    (s) =>
                      s.toLowerCase()
                  )
                );

                return (
                  skills.filter((s) =>
                    other.has(s)
                  ).length /
                  Math.max(
                    1,
                    new Set([
                      ...skills,
                      ...other,
                    ]).size
                  )
                );
              })
          )
        : 0;

      /*
       * MMR-inspired adjustment:
       *
       * relevance
       * + novelty bonus
       * - similarity penalty
       */
      const adjusted =
        item.breakdown.totalScore +
        0.06 * novelty -
        0.012 * overlap;

      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = i;
      }
    }

    const [chosen] =
      pool.splice(bestIndex, 1);

    diverse.push(chosen);

    chosen.course.skills.forEach(
      (s) => {
        const normalized =
          s.toLowerCase();

        if (gapSet.has(normalized)) {
          coveredGapSkills.add(
            normalized
          );
        }
      }
    );
  }

  /*
   * Return bounded candidate set.
   * Enough alternatives remain for
   * adaptive re-ranking and roadmap planning.
   */
  const finalRanked = diverse.slice(
    0,
    Math.max(
      24,
      Math.min(60, diverse.length)
    )
  );

  return {
    ranked: finalRanked,

    skillGaps: gaps,

    model: {
      semantic:
        'Hybrid TF-IDF + dense embedding cosine + quality-aware ranking',

      personalization:
        preferenceModel.trained
          ? 'online logistic regression from feedback'
          : 'cold-start prior',

      feedbackSamples:
        preferenceModel.samples,

      features: [
        'skill gap',
        'goal relevance',
        'prerequisite readiness',
        'learning preference',
        'TF-IDF similarity',
        'dense embedding similarity',
        'language',
        'resource quality',
        'learner preference',
        'diversity',
      ],
    },
  };
}
