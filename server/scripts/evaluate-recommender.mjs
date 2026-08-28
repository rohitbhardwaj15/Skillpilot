import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  matchRole,
  rankCourses,
  computeSkillGaps,
} from '../services/recommendation.service.js';

import {
  orderByPrerequisites,
} from '../services/pathgen.service.js';

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

/* ───────────────────────────────────────────────
 * Load evaluation data
 * ─────────────────────────────────────────────── */

function loadJson(filePath) {
  return JSON.parse(
    fs.readFileSync(filePath, 'utf8')
  );
}

const coursesPath = path.join(
  __dirname,
  '../../data/courses.json'
);

const rolesPath = path.join(
  __dirname,
  '../../data/roles.json'
);

const courses = loadJson(
  coursesPath
).map((course, index) => ({
  ...course,
  _id: String(
    course._id ||
      course.id ||
      index
  ),
  qualityScore:
    course.qualityScore ?? 0.75,
}));

const roles = loadJson(
  rolesPath
);

/* ───────────────────────────────────────────────
 * Utility helpers
 * ─────────────────────────────────────────────── */

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .trim();
}

function unique(values = []) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(normalize)
    ),
  ];
}

function percentage(value) {
  return Number(
    (value * 100).toFixed(2)
  );
}

function average(values = []) {
  if (!values.length) return 0;

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}

/* ───────────────────────────────────────────────
 * Evaluation learner profile
 * ─────────────────────────────────────────────── */

function createEvaluationProfile(role) {
  const requiredSkills =
    role.requiredSkills || [];

  /*
   * Simulate a learner who already knows
   * approximately 30% of the target-role skills.
   */
  const knownCount = Math.max(
    1,
    Math.floor(
      requiredSkills.length * 0.3
    )
  );

  const currentSkills =
    requiredSkills
      .slice(0, knownCount)
      .map((skill) => ({
        name: skill,
        level: 'intermediate',
      }));

  return {
    currentRole:
      'Full Stack Developer',

    targetRole:
      role.role,

    goal:
      `Become a ${role.role}`,

    currentSkills,

    knowledgeState: [],

    interests: [],

    learningStyle: [
      'video',
      'project-based',
    ],

    preferredLanguage:
      'English',

    courseTypeFilter:
      'both',

    feedback: [],
  };
}

/* ───────────────────────────────────────────────
 * Skill gap evaluation
 * ─────────────────────────────────────────────── */

function getGaps(
  profile,
  role
) {
  const currentSkills =
    unique(
      (profile.currentSkills || [])
        .map(
          (skill) =>
            typeof skill === 'string'
              ? skill
              : skill.name
        )
    );

  const requiredSkills =
    unique(
      role.requiredSkills || []
    );

  return requiredSkills.filter(
    (skill) =>
      !currentSkills.includes(
        skill
      )
  );
}

/* ───────────────────────────────────────────────
 * Relevance
 * ─────────────────────────────────────────────── */

function calculateRelevance(
  ranked,
  profile,
  role,
  limit = 10
) {
  const top =
    ranked.slice(0, limit);

  const gaps = new Set(
    getGaps(
      profile,
      role
    )
  );

  if (!top.length) {
    return {
      precision: 0,
      coverage: 0,
      diversity: 0,
    };
  }

  let relevantCourses = 0;

  const coveredSkills =
    new Set();

  const uniqueSkills =
    new Set();

  for (const item of top) {
    const course =
      item.course || item;

    const courseSkills =
      unique(
        course.skills || []
      );

    let relevant = false;

    for (
      const skill of courseSkills
    ) {
      uniqueSkills.add(skill);

      if (gaps.has(skill)) {
        coveredSkills.add(skill);
        relevant = true;
      }
    }

    if (relevant) {
      relevantCourses++;
    }
  }

  /*
   * Precision@10
   */
  const precision =
    relevantCourses /
    top.length;

  /*
   * Skill coverage@10
   */
  const coverage =
    gaps.size
      ? coveredSkills.size /
        gaps.size
      : 1;

  /*
   * Diversity:
   * Unique skill representation
   * across recommended courses.
   */
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
    precision,
    coverage,
    diversity,
  };
}

/* ───────────────────────────────────────────────
 * Baseline recommender
 * ─────────────────────────────────────────────── */

function baselineRank(
  profile,
  role
) {
  const gaps = new Set(
    getGaps(
      profile,
      role
    )
  );

  const required = new Set(
    unique(
      role.requiredSkills || []
    )
  );

  return courses
    .map((course) => {
      const skills =
        unique(
          course.skills || []
        );

      const gapMatches =
        skills.filter(
          (skill) =>
            gaps.has(skill)
        ).length;

      const roleMatches =
        skills.filter(
          (skill) =>
            required.has(skill)
        ).length;

      const gapScore =
        gapMatches /
        Math.max(
          1,
          skills.length
        );

      const roleScore =
        roleMatches /
        Math.max(
          1,
          skills.length
        );

      return {
        course,

        score:
          0.6 * gapScore +
          0.4 * roleScore,
      };
    })
    .filter(
      (item) =>
        item.score > 0
    )
    .sort(
      (a, b) =>
        b.score - a.score
    );
}

/* ───────────────────────────────────────────────
 * Prerequisite evaluation
 * ─────────────────────────────────────────────── */

function prerequisiteViolations(
  ranked,
  profile
) {
  const ordered =
    orderByPrerequisites(
      ranked,
      profile
    );

  const learned =
    new Set(
      unique(
        (profile.currentSkills || [])
          .map(
            (skill) =>
              typeof skill === 'string'
                ? skill
                : skill.name
          )
      )
    );

  let violations = 0;

  for (const item of ordered) {
    const course =
      item.course || item;

    const prerequisites =
      unique(
        course.prerequisites ||
          []
      );

    for (
      const prerequisite of
      prerequisites
    ) {
      if (
        !learned.has(
          prerequisite
        )
      ) {
        violations++;
      }
    }

    for (
      const skill of
      course.skills || []
    ) {
      learned.add(
        normalize(skill)
      );
    }
  }

  return violations;
}

/* ───────────────────────────────────────────────
 * Role matching evaluation
 * ─────────────────────────────────────────────── */

function evaluateRoleMatching(
  profile
) {
  const matched =
    matchRole(
      profile.targetRole,
      roles
    );

  return Boolean(
    matched &&
      normalize(
        matched.role
      ) ===
        normalize(
          profile.targetRole
        )
  );
}

/* ───────────────────────────────────────────────
 * Main evaluation
 * ─────────────────────────────────────────────── */

const baselineResults = [];
const enhancedResults = [];

let roleMatches = 0;
let totalCases = 0;

let baselineViolations = 0;
let enhancedViolations = 0;

for (const role of roles) {
  if (
    !role ||
    !role.role
  ) {
    continue;
  }

  const profile =
    createEvaluationProfile(
      role
    );

  totalCases++;

  /* ── Role matching ─────────────── */

  if (
    evaluateRoleMatching(
      profile
    )
  ) {
    roleMatches++;
  }

  /* ── Baseline ──────────────────── */

  const baseline =
    baselineRank(
      profile,
      role
    );

  const baselineMetrics =
    calculateRelevance(
      baseline,
      profile,
      role,
      10
    );

  baselineResults.push(
    baselineMetrics
  );

  baselineViolations +=
    prerequisiteViolations(
      baseline,
      profile
    );

  /* ── Enhanced ──────────────────── */

  let enhanced = [];

  try {
    const result =
      rankCourses(
        courses,
        profile,
        role
      );

    /*
     * Support both:
     *
     * rankCourses() -> array
     *
     * rankCourses() -> { ranked }
     */
    enhanced =
      Array.isArray(result)
        ? result
        : result?.ranked || [];
  } catch (error) {
    console.error(
      `Enhanced ranking failed for ${role.role}:`,
      error.message
    );
  }

  const enhancedMetrics =
    calculateRelevance(
      enhanced,
      profile,
      role,
      10
    );

  enhancedResults.push(
    enhancedMetrics
  );

  enhancedViolations +=
    prerequisiteViolations(
      enhanced,
      profile
    );
}

/* ───────────────────────────────────────────────
 * Aggregate metrics
 * ─────────────────────────────────────────────── */

const baseline = {
  precisionAt10:
    average(
      baselineResults.map(
        (result) =>
          result.precision
      )
    ),

  skillCoverageAt10:
    average(
      baselineResults.map(
        (result) =>
          result.coverage
      )
    ),

  recommendationDiversity:
    average(
      baselineResults.map(
        (result) =>
          result.diversity
      )
    ),
};

const enhanced = {
  precisionAt10:
    average(
      enhancedResults.map(
        (result) =>
          result.precision
      )
    ),

  skillCoverageAt10:
    average(
      enhancedResults.map(
        (result) =>
          result.coverage
      )
    ),

  recommendationDiversity:
    average(
      enhancedResults.map(
        (result) =>
          result.diversity
      )
    ),
};

/* ───────────────────────────────────────────────
 * Improvement calculations
 * ─────────────────────────────────────────────── */

function calculateImprovement(
  enhancedValue,
  baselineValue
) {
  const absolute =
    enhancedValue -
    baselineValue;

  const relative =
    baselineValue > 0
      ? absolute /
        baselineValue
      : 0;

  return {
    absolutePoints:
      percentage(absolute),

    relativePercent:
      percentage(relative),
  };
}

const output = {
  cases:
    totalCases,

  roleMatchAccuracy:
    totalCases
      ? Number(
          (
            roleMatches /
            totalCases
          ).toFixed(4)
        )
      : 0,

  baseline: {
    precisionAt10:
      Number(
        baseline.precisionAt10.toFixed(
          4
        )
      ),

    skillCoverageAt10:
      Number(
        baseline.skillCoverageAt10.toFixed(
          4
        )
      ),

    recommendationDiversity:
      Number(
        baseline.recommendationDiversity.toFixed(
          4
        )
      ),
  },

  enhanced: {
    precisionAt10:
      Number(
        enhanced.precisionAt10.toFixed(
          4
        )
      ),

    skillCoverageAt10:
      Number(
        enhanced.skillCoverageAt10.toFixed(
          4
        )
      ),

    recommendationDiversity:
      Number(
        enhanced.recommendationDiversity.toFixed(
          4
        )
      ),
  },

  improvement: {
    precisionAt10:
      calculateImprovement(
        enhanced.precisionAt10,
        baseline.precisionAt10
      ),

    skillCoverageAt10:
      calculateImprovement(
        enhanced.skillCoverageAt10,
        baseline.skillCoverageAt10
      ),

    recommendationDiversity:
      calculateImprovement(
        enhanced.recommendationDiversity,
        baseline.recommendationDiversity
      ),
  },

  prerequisiteViolationRate: {
    baseline:
      totalCases
        ? Number(
            (
              baselineViolations /
              (totalCases * 10)
            ).toFixed(4)
          )
        : 0,

    enhanced:
      totalCases
        ? Number(
            (
              enhancedViolations /
              (totalCases * 10)
            ).toFixed(4)
          )
        : 0,
  },

  methodology: {
    baseline:
      'Gap-match + role-fit ranking',

    enhanced:
      'Hybrid TF-IDF + dense embedding similarity + skill-gap matching + prerequisite-aware ranking + learner-preference model + diversity-aware ranking',

    precision:
      'Fraction of top-10 recommendations that directly address an identified target-role skill gap',

    skillCoverage:
      'Fraction of identified target-role skill gaps represented by the top-10 recommendations',

    diversity:
      'Normalized unique-skill representation across the top-10 recommendations',

    prerequisiteSafety:
      'Measures prerequisite violations in the generated recommendation sequence',

    evaluationScope:
      'One simulated learner profile per target role with approximately 30% of target-role skills already mastered',

    comparison:
      'Enhanced recommender is compared against a simple gap-match + role-fit baseline',
  },

  generatedAt:
    new Date().toISOString(),
};

/* ───────────────────────────────────────────────
 * Console report
 * ─────────────────────────────────────────────── */

console.log(
  '\n========================================'
);

console.log(
  ' SkillPilot Recommender Evaluation'
);

console.log(
  '========================================\n'
);

console.log(
  `Evaluation Cases: ${output.cases}`
);

console.log(
  `Role Match Accuracy: ${percentage(
    output.roleMatchAccuracy
  )}%\n`
);

console.log(
  'BASELINE'
);

console.log(
  `Precision@10: ${percentage(
    output.baseline.precisionAt10
  )}%`
);

console.log(
  `Skill Coverage@10: ${percentage(
    output.baseline.skillCoverageAt10
  )}%`
);

console.log(
  `Diversity: ${percentage(
    output.baseline.recommendationDiversity
  )}%\n`
);

console.log(
  'ENHANCED HYBRID MODEL'
);

console.log(
  `Precision@10: ${percentage(
    output.enhanced.precisionAt10
  )}%`
);

console.log(
  `Skill Coverage@10: ${percentage(
    output.enhanced.skillCoverageAt10
  )}%`
);

console.log(
  `Diversity: ${percentage(
    output.enhanced.recommendationDiversity
  )}%\n`
);

console.log(
  'IMPROVEMENT'
);

console.log(
  `Precision: ${
    output.improvement.precisionAt10
      .absolutePoints
  } percentage points`
);

console.log(
  `Coverage: ${
    output.improvement.skillCoverageAt10
      .absolutePoints
  } percentage points`
);

console.log(
  `Diversity: ${
    output.improvement.recommendationDiversity
      .absolutePoints
  } percentage points\n`
);

console.log(
  'Prerequisite Violation Rate'
);

console.log(
  `Baseline: ${percentage(
    output.prerequisiteViolationRate
      .baseline
  )}%`
);

console.log(
  `Enhanced: ${percentage(
    output.prerequisiteViolationRate
      .enhanced
  )}%`
);

console.log(
  '\n========================================\n'
);

/* ───────────────────────────────────────────────
 * Save JSON report
 * ─────────────────────────────────────────────── */

const docsDirectory =
  path.join(
    __dirname,
    '../../docs'
  );

if (
  !fs.existsSync(
    docsDirectory
  )
) {
  fs.mkdirSync(
    docsDirectory,
    {
      recursive: true,
    }
  );
}

const outputPath =
  path.join(
    docsDirectory,
    'recommendation-evaluation.json'
  );

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    output,
    null,
    2
  )
);

console.log(
  `Evaluation report saved to: ${outputPath}`
);
