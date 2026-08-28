import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  matchRole,
  rankCourses,
} from '../services/recommendation.service.js';

import {
  semanticCourseScores,
} from '../services/ml.service.js';

import {
  orderByPrerequisites,
} from '../services/pathgen.service.js';

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

/* ───────────────────────────────────────────────
 * Load dataset
 * ─────────────────────────────────────────────── */

const courses = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      '../../data/courses.json'
    ),
    'utf8'
  )
).map((course, index) => ({
  ...course,
  _id: String(index),
  qualityScore:
    course.qualityScore ?? 0.75,
}));

const roles = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      '../../data/roles.json'
    ),
    'utf8'
  )
);

/* ───────────────────────────────────────────────
 * Baseline recommender
 *
 * Simple gap + role-fit ranking.
 * This acts as the control system for
 * measuring the value of the enhanced model.
 * ─────────────────────────────────────────────── */

function baselineRank(
  courseList,
  profile,
  role
) {
  const required = new Set(
    role.requiredSkills.map((skill) =>
      skill.toLowerCase()
    )
  );

  const gaps = new Set(
    role.requiredSkills
      .filter((skill) =>
        !profile.currentSkills.some(
          (current) =>
            current.name.toLowerCase() ===
              skill.toLowerCase() &&
            [
              'intermediate',
              'advanced',
            ].includes(current.level)
        )
      )
      .map((skill) =>
        skill.toLowerCase()
      )
      )
  );

  return courseList
    .map((course) => {
      const skills = course.skills.map(
        (skill) => skill.toLowerCase()
      );

      const gapMatch =
        skills.filter((skill) =>
          gaps.has(skill)
        ).length /
        Math.max(1, skills.length);

      const roleFit =
        skills.filter((skill) =>
          required.has(skill)
        ).length /
        Math.max(1, skills.length);

      return {
        course,

        score:
          0.6 * gapMatch +
          0.4 * roleFit,
      };
    })
    .filter(
      (item) => item.score > 0
    )
    .sort(
      (a, b) =>
        b.score - a.score
    );
}

/* ───────────────────────────────────────────────
 * Relevance labels
 * ─────────────────────────────────────────────── */

function getSkillGaps(
  profile,
  role
) {
  return new Set(
    role.requiredSkills
      .filter((skill) =>
        !profile.currentSkills.some(
          (current) =>
            current.name.toLowerCase() ===
              skill.toLowerCase() &&
            [
              'intermediate',
              'advanced',
            ].includes(current.level)
        )
      )
      .map((skill) =>
        skill.toLowerCase()
      )
  );
}

/* ───────────────────────────────────────────────
 * Metrics
 * ─────────────────────────────────────────────── */

function metrics(
  ranked,
  profile,
  role
) {
  const top = ranked.slice(0, 10);

  const gaps = getSkillGaps(
    profile,
    role
  );

  /*
   * Precision:
   * How many top-10 recommendations
   * directly address an identified skill gap.
   */
  const relevant =
    top.filter((item) =>
      item.course.skills.some(
        (skill) =>
          gaps.has(
            skill.toLowerCase()
          )
      )
    ).length;

  const precisionAt10 =
    top.length
      ? relevant / top.length
      : 0;

  /*
   * Skill coverage:
   * Percentage of identified skill gaps
   * represented in the top 10.
   */
  const covered =
    new Set(
      top
        .flatMap((item) =>
          item.course.skills.map(
            (skill) =>
              skill.toLowerCase()
          )
        )
        .filter((skill) =>
          gaps.has(skill)
        )
    );

  const skillCoverageAt10 =
    gaps.size
      ? covered.size / gaps.size
      : 1;

  /*
   * Diversity:
   * Number of unique skills represented
   * across the top recommendations.
   *
   * Normalized to make comparisons easier.
   */
  const uniqueSkills =
    new Set(
      top.flatMap((item) =>
        item.course.skills.map(
          (skill) =>
            skill.toLowerCase()
        )
      )
    );

  const diversity =
    Math.min(
      1,
      uniqueSkills.size /
        Math.max(
          1,
          top.length * 2
        )
    );

  return {
    precisionAt10,
    skillCoverageAt10,
    diversity,
  };
}

/* ───────────────────────────────────────────────
 * Prerequisite validation
 * ─────────────────────────────────────────────── */

function countPrerequisiteViolations(
  ranked,
  profile
) {
  const ordered =
    orderByPrerequisites(
      ranked,
      profile
    );

  const learned = new Set(
    profile.currentSkills.map(
      (skill) =>
        skill.name.toLowerCase()
    )
  );

  let violations = 0;

  for (const item of ordered) {
    const prerequisites =
      item.course.prerequisites ||
      [];

    for (const prerequisite of prerequisites) {
      if (
        !learned.has(
          prerequisite.toLowerCase()
        )
      ) {
        violations++;
      }
    }

    for (const skill of item.course.skills) {
      learned.add(
        skill.toLowerCase()
      );
    }
  }

  return violations;
}

/* ───────────────────────────────────────────────
 * Test profiles
 * ─────────────────────────────────────────────── */

function createEvaluationProfile(role) {
  const skillCount =
    role.requiredSkills.length;

  /*
   * Simulate a learner who knows roughly
   * 30% of the target role skills.
   */
  const knownCount = Math.max(
    1,
    Math.floor(
      skillCount * 0.3
    )
  );

  return {
    targetRole: role.role,

    goal:
      `Become a ${role.role}`,

    currentSkills:
      role.requiredSkills
        .slice(0, knownCount)
        .map((name) => ({
          name,
          level: 'intermediate',
        })),

    knowledgeState: [],

    preferredLanguage:
      'English',

    courseTypeFilter:
      'both',

    learningStyle: [
      'video',
    ],

    feedback: [],

    interests: [],
  };
}

/* ───────────────────────────────────────────────
 * Aggregate evaluation
 * ─────────────────────────────────────────────── */

let roleHits = 0;
let cases = 0;

const baseline = {
  precisionAt10: 0,
  skillCoverageAt10: 0,
  diversity: 0,
};

const enhanced = {
  precisionAt10: 0,
  skillCoverageAt10: 0,
  diversity: 0,
};

let prerequisiteViolations = 0;

for (const targetRole of roles) {
  const profile =
    createEvaluationProfile(
      targetRole
    );

  /*
   * Role matching accuracy.
   */
  const matchedRole =
    matchRole(
      profile.targetRole,
      roles
    );

  if (
    matchedRole?.role ===
    profile.targetRole
  ) {
    roleHits++;
  }

  cases++;

  /*
   * Baseline model.
   */
  const baselineRanked =
    baselineRank(
      courses,
      profile,
      matchedRole
    );

  const baselineMetrics =
    metrics(
      baselineRanked,
      profile,
      matchedRole
    );

  /*
   * Enhanced hybrid model:
   *
   * TF-IDF
   * +
   * Dense embedding
   * +
   * Skill gap
   * +
   * Prerequisite readiness
   * +
   * Learner preference
   * +
   * MMR diversity
   */
  const {
    ranked: enhancedRanked,
  } = rankCourses(
    courses,
    profile,
    matchedRole
  );

  const enhancedMetrics =
    metrics(
      enhancedRanked,
      profile,
      matchedRole
    );

  /*
   * Aggregate baseline metrics.
   */
  for (
    const key of Object.keys(
      baseline
    )
  ) {
    baseline[key] +=
      baselineMetrics[key];
  }

  /*
   * Aggregate enhanced metrics.
   */
  for (
    const key of Object.keys(
      enhanced
    )
  ) {
    enhanced[key] +=
      enhancedMetrics[key];
  }

  /*
   * Validate prerequisite-safe ordering.
   */
  prerequisiteViolations +=
    countPrerequisiteViolations(
      enhancedRanked,
      profile
    );
}

/* ───────────────────────────────────────────────
 * Average metrics
 * ─────────────────────────────────────────────── */

for (
  const key of Object.keys(
    baseline
  )
) {
  baseline[key] /=
    Math.max(1, cases);

  enhanced[key] /=
    Math.max(1, cases);
}

/* ───────────────────────────────────────────────
 * Formatting helpers
 * ─────────────────────────────────────────────── */

function round(value) {
  return Number(
    value.toFixed(3)
  );
}

function percentage(value) {
  return Number(
    (value * 100).toFixed(1)
  );
}

function improvement(
  enhancedValue,
  baselineValue
) {
  const difference =
    enhancedValue -
    baselineValue;

  const percentChange =
    baselineValue > 0
      ? difference /
        baselineValue
      : 0;

  return {
    absolutePoints:
      percentage(difference),

    relativePercent:
      percentage(percentChange),
  };
}

/* ───────────────────────────────────────────────
 * Final evaluation report
 * ─────────────────────────────────────────────── */

const output = {
  cases,

  roleMatchAccuracy:
    round(
      roleHits /
        Math.max(1, cases)
    ),

  baseline: {
    precisionAt10:
      round(
        baseline.precisionAt10
      ),

    skillCoverageAt10:
      round(
        baseline.skillCoverageAt10
      ),

    recommendationDiversity:
      round(
        baseline.diversity
      ),
  },

  enhanced: {
    precisionAt10:
      round(
        enhanced.precisionAt10
      ),

    skillCoverageAt10:
      round(
        enhanced.skillCoverageAt10
      ),

    recommendationDiversity:
      round(
        enhanced.diversity
      ),
  },

  improvement: {
    precisionAt10:
      improvement(
        enhanced.precisionAt10,
        baseline.precisionAt10
      ),

    skillCoverageAt10:
      improvement(
        enhanced.skillCoverageAt10,
        baseline.skillCoverageAt10
      ),

    recommendationDiversity:
      improvement(
        enhanced.diversity,
        baseline.diversity
      ),
  },

  prerequisiteViolationRate:
    round(
      prerequisiteViolations /
        Math.max(
          1,
          cases * 10
        )
    ),

  methodology: {
    baseline:
      'Gap-match + role-fit ranking',

    enhanced:
      'Hybrid TF-IDF + dense embedding similarity + skill-gap matching + prerequisite-aware ranking + learner-preference model + MMR-style diversity',

    precision:
      'Fraction of top-10 recommendations that directly address an identified target-role skill gap',

    skillCoverage:
      'Fraction of identified target-role skill gaps represented by the top-10 recommendations',

    diversity:
      'Normalized unique-skill representation across the top-10 recommendations',

    prerequisiteSafety:
      'Recommendations are ordered through the prerequisite-aware path planner before violation measurement',

    evaluationScope:
      'One simulated learner profile per target role using approximately 30% of the role skills as already-known skills',
  },
};

/* ───────────────────────────────────────────────
 * Output
 * ─────────────────────────────────────────────── */

console.log(
  JSON.stringify(
    output,
    null,
    2
  )
);

fs.writeFileSync(
  path.join(
    __dirname,
    '../../docs/recommendation-evaluation.json'
  ),
  JSON.stringify(
    output,
    null,
    2
  )
);
