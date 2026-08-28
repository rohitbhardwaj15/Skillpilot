import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  matchRole,
  computeSkillGaps,
  rankCourses,
} from '../services/recommendation.service.js';

import { orderByPrerequisites } from '../services/pathgen.service.js';
import Course from '../models/Course.js';

const router = express.Router();

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

/*
 * Roles are loaded from the same roles.json used
 * by the recommendation/evaluation system.
 *
 * This avoids depending on an empty MongoDB Role
 * collection for career simulation.
 */
const rolesPath = path.join(
  __dirname,
  '../../data/roles.json'
);

let roles = [];

try {
  roles = JSON.parse(
    fs.readFileSync(rolesPath, 'utf-8')
  );
} catch (error) {
  console.error(
    'Failed to load roles.json:',
    error.message
  );
}

/* ───────────────────────────────────────────────
 * Helper: validate role data
 * ─────────────────────────────────────────────── */

function findTargetRole(targetRoleText) {
  if (!targetRoleText || !roles.length) {
    return null;
  }

  return matchRole(
    String(targetRoleText).trim(),
    roles
  );
}

/* ───────────────────────────────────────────────
 * Generate Learning Path
 * POST /api/path/generate
 * ─────────────────────────────────────────────── */

router.post('/generate', async (req, res) => {
  try {
    const profile =
      req.body?.profile || {};

    /*
     * Backward compatibility:
     * If frontend sends profileId instead of profile,
     * try to use the supplied profile object only.
     */
    if (!profile.targetRole) {
      return res.status(400).json({
        message:
          'Profile with targetRole is required.',
      });
    }

    const courses = await Course.find({});

    const role = findTargetRole(
      profile.targetRole
    );

    if (!role) {
      return res.status(404).json({
        message:
          'Target role could not be identified.',
      });
    }

    const {
      ranked,
      skillGaps,
      model,
    } = rankCourses(
      courses,
      profile,
      role
    );

    const roadmap =
      orderByPrerequisites(
        ranked,
        profile
      );

    return res.json({
      targetRole: role.role,
      skillGaps,
      roadmap,
      recommendations: ranked,
      model,
      generatedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      'Path generation error:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to generate learning path.',
      error:
        process.env.NODE_ENV !== 'production'
          ? error.message
          : undefined,
    });
  }
});

/* ───────────────────────────────────────────────
 * What-If Career Simulator
 *
 * POST /api/path/simulate-career
 * ─────────────────────────────────────────────── */

router.post(
  '/simulate-career',
  async (req, res) => {
    try {
      const {
        targetRole,
        profile = {},
      } = req.body || {};

      if (
        !targetRole ||
        !String(targetRole).trim()
      ) {
        return res.status(400).json({
          message:
            'Target career role is required.',
        });
      }

      /*
       * Use roles.json rather than MongoDB Role
       * collection.
       */
      const target =
        findTargetRole(targetRole);

      if (!target) {
        return res.status(404).json({
          message:
            `Target career role "${targetRole}" was not found.`,
        });
      }

      const courses =
        await Course.find({});

      /* ── Current learner state ─────────── */

      const currentSkills =
        Array.isArray(profile.currentSkills)
          ? profile.currentSkills
          : [];

      const knowledgeState =
        Array.isArray(profile.knowledgeState)
          ? profile.knowledgeState
          : [];

      /* ── Calculate skill gaps ──────────── */

      const skillGaps =
        computeSkillGaps(
          target.requiredSkills || [],
          currentSkills,
          knowledgeState
        );

      /* ── Calculate readiness ───────────── */

      const totalRequired =
        (target.requiredSkills || [])
          .length;

      const gapCount =
        skillGaps.length;

      const masteredSkills =
        Math.max(
          0,
          totalRequired - gapCount
        );

      const readiness =
        totalRequired > 0
          ? masteredSkills /
            totalRequired
          : 1;

      /* ── Build simulated learner profile ─ */

      const simulatedProfile = {
        ...profile,

        targetRole: target.role,

        goal:
          profile.goal ||
          `Become a ${target.role}`,

        currentSkills,

        knowledgeState,

        preferredLanguage:
          profile.preferredLanguage ||
          'English',

        courseTypeFilter:
          profile.courseTypeFilter ||
          'both',

        learningStyle:
          Array.isArray(
            profile.learningStyle
          )
            ? profile.learningStyle
            : [],

        feedback:
          Array.isArray(
            profile.feedback
          )
            ? profile.feedback
            : [],

        interests:
          Array.isArray(
            profile.interests
          )
            ? profile.interests
            : [],
      };

      /* ── Generate recommendations ──────── */

      const {
        ranked,
        model,
      } = rankCourses(
        courses,
        simulatedProfile,
        target
      );

      /* ── Prerequisite-aware roadmap ────── */

      const roadmap =
        orderByPrerequisites(
          ranked,
          simulatedProfile
        );

      /* ── Detailed skill gaps ───────────── */

      const gapDetails =
        skillGaps.map(
          (skill) => ({
            skill,

            priority:
              'high',

            reason:
              `Required for ${target.role} but not yet mastered.`,
          })
        );

      /* ── Simulation summary ────────────── */

      let summary;

      if (readiness >= 0.8) {
        summary =
          `You are already well prepared for ${target.role}. Focus on the remaining skill gaps and advanced practice.`;
      } else if (readiness >= 0.5) {
        summary =
          `You have a solid foundation for ${target.role}, but several important skills still need to be developed.`;
      } else {
        summary =
          `This is a significant career transition. Follow the recommended roadmap to systematically close your ${target.role} skill gaps.`;
      }

      return res.json({
        success: true,

        currentRole:
          profile.currentRole ||
          profile.targetRole ||
          'Current Profile',

        targetRole:
          target.role,

        readiness,

        readinessPercentage:
          Math.round(
            readiness * 100
          ),

        requiredSkills:
          target.requiredSkills || [],

        currentSkills,

        skillGaps:
          gapDetails,

        roadmap,

        recommendations:
          ranked,

        model,

        summary,

        simulation: {
          type:
            'what-if-career-transition',

          from:
            profile.currentRole ||
            profile.targetRole ||
            'Current Profile',

          to:
            target.role,

          totalRequiredSkills:
            totalRequired,

          masteredSkills,

          remainingSkills:
            gapCount,
        },

        generatedAt:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        'Career simulation error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to simulate career path.',
        error:
          process.env.NODE_ENV !== 'production'
            ? error.message
            : undefined,
      });
    }
  }
);

/* ───────────────────────────────────────────────
 * Career Readiness
 *
 * POST /api/path/readiness
 * ─────────────────────────────────────────────── */

router.post(
  '/readiness',
  async (req, res) => {
    try {
      const {
        profile = {},
        targetRole,
      } = req.body || {};

      const role =
        findTargetRole(
          targetRole ||
          profile.targetRole
        );

      if (!role) {
        return res.status(404).json({
          message:
            'Target role could not be identified.',
        });
      }

      const gaps =
        computeSkillGaps(
          role.requiredSkills || [],
          profile.currentSkills || [],
          profile.knowledgeState || []
        );

      const total =
        (role.requiredSkills || [])
          .length;

      const mastered =
        Math.max(
          0,
          total - gaps.length
        );

      const readiness =
        total > 0
          ? mastered / total
          : 1;

      return res.json({
        success: true,

        targetRole:
          role.role,

        readiness,

        readinessPercentage:
          Math.round(
            readiness * 100
          ),

        masteredSkills:
          mastered,

        requiredSkills:
          total,

        skillGaps:
          gaps,
      });
    } catch (error) {
      console.error(
        'Readiness calculation error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to calculate career readiness.',
        error:
          process.env.NODE_ENV !== 'production'
            ? error.message
            : undefined,
      });
    }
  }
);

export default router;
