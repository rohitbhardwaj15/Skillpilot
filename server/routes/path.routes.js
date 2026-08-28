import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  matchRole,
  computeSkillGaps,
  rankCourses,
} from '../services/recommendation.service.js';

import {
  orderByPrerequisites,
} from '../services/pathgen.service.js';

import Course from '../models/Course.js';
import Profile from '../models/Profile.js';

const router = express.Router();

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

// Roles are stored in data/roles.json
const roles = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      '../../data/roles.json'
    ),
    'utf-8'
  )
);

/* ───────────────────────────────────────────────
 * Existing learning-path endpoint
 * POST /api/path/generate
 * ─────────────────────────────────────────────── */

router.post('/generate', async (req, res) => {
  try {
    let profile = req.body.profile || {};

    /*
     * Existing frontend sends profileId.
     * If profileId is provided, load the saved
     * learner profile from MongoDB.
     */
    if (
      req.body.profileId &&
      Object.keys(profile).length === 0
    ) {
      const savedProfile =
        await Profile.findById(
          req.body.profileId
        );

      if (savedProfile) {
        profile =
          savedProfile.toObject();
      }
    }

    const courses =
      await Course.find();

    const role = matchRole(
      profile.targetRole,
      roles
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

    const ordered =
      orderByPrerequisites(
        ranked,
        profile
      );

    return res.json({
      targetRole:
        role.role,

      skillGaps,

      roadmap:
        ordered,

      recommendations:
        ranked,

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
    });
  }
});

/* ───────────────────────────────────────────────
 * What-If Career Simulator
 *
 * POST /api/path/simulate-career
 *
 * Example:
 *
 * Current Role:
 * Full Stack Developer
 *
 * Target Role:
 * AI Engineer
 *
 * Returns:
 * - current role
 * - target role
 * - readiness
 * - required skills
 * - current skills
 * - skill gaps
 * - roadmap
 * - recommendations
 * ─────────────────────────────────────────────── */

router.post(
  '/simulate-career',
  async (req, res) => {
    try {
      const {
        targetRole,
        profile = {},
      } = req.body;

      if (
        !targetRole ||
        !String(targetRole).trim()
      ) {
        return res.status(400).json({
          message:
            'Target career role is required.',
        });
      }

      const courses =
        await Course.find();

      /* ── Find target role ─────────────── */

      const target = matchRole(
        String(targetRole),
        roles
      );

      if (!target) {
        return res.status(404).json({
          message:
            'Target career role was not found.',
        });
      }

      /* ── Current learner skills ───────── */

      const currentSkills =
        profile.currentSkills || [];

      const knowledgeState =
        profile.knowledgeState || [];

      /* ── Calculate skill gaps ─────────── */

      const skillGaps =
        computeSkillGaps(
          target.requiredSkills,
          currentSkills,
          knowledgeState
        );

      /* ── Calculate readiness ─────────── */

      const totalRequired =
        target.requiredSkills.length;

      const gapCount =
        skillGaps.length;

      const readiness =
        totalRequired > 0
          ? Math.max(
              0,
              Math.min(
                1,
                (
                  totalRequired -
                  gapCount
                ) /
                  totalRequired
              )
            )
          : 1;

      /* ── Build simulated profile ─────── */

      const simulatedProfile = {
        ...profile,

        targetRole:
          target.role,

        goal:
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
          profile.learningStyle ||
          [],

        feedback:
          profile.feedback ||
          [],

        interests:
          profile.interests ||
          [],
      };

      /* ── Generate recommendations ────── */

      const {
        ranked,
        model,
      } = rankCourses(
        courses,
        simulatedProfile,
        target
      );

      /* ── Prerequisite-aware roadmap ───── */

      const roadmap =
        orderByPrerequisites(
          ranked,
          simulatedProfile
        );

      /* ── Detailed gap information ────── */

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

      /* ── Simulation summary ──────────── */

      const summary =
        readiness >= 0.8
          ? `You are already well prepared for ${target.role}. Focus on the remaining skill gaps and advanced practice.`
          : readiness >= 0.5
          ? `You have a solid foundation for ${target.role}, but several important skills still need to be developed.`
          : `This is a significant career transition. Follow the recommended roadmap to systematically close your ${target.role} skill gaps.`;

      return res.json({
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
          target.requiredSkills,

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

          masteredSkills:
            totalRequired -
            gapCount,

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
      });
    }
  }
);

/* ───────────────────────────────────────────────
 * Career readiness endpoint
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
      } = req.body;

      const role = matchRole(
        targetRole ||
          profile.targetRole,
        roles
      );

      if (!role) {
        return res.status(404).json({
          message:
            'Target role could not be identified.',
        });
      }

      const gaps =
        computeSkillGaps(
          role.requiredSkills,
          profile.currentSkills || [],
          profile.knowledgeState || []
        );

      const total =
        role.requiredSkills.length;

      const mastered =
        Math.max(
          0,
          total - gaps.length
        );

      const readiness =
        total
          ? mastered / total
          : 1;

      return res.json({
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
      });
    }
  }
);

export default router;
