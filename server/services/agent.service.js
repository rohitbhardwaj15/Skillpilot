/**
 * agent.service.js
 * ----------------
 * Tool definitions + deterministic tool execution for the AI Assistant's
 * function-calling ("AI agent") loop.
 *
 * Design principle: the LLM (see llm.service.js) decides WHICH tool to
 * call and WHEN, based on the learner's question — but every tool here is
 * plain deterministic code (a DB lookup, the same skill-gap math used
 * elsewhere in the app, or embedding-based retrieval). The LLM can only
 * relay facts a tool actually returned; it cannot invent course names,
 * skill gaps, or prerequisites.
 *
 * This file has NO dependency on llm.service.js — it never calls the LLM
 * itself, it only gets called BY it — which keeps the two files free of an
 * import cycle.
 *
 * `search_courses` deliberately uses the lightweight RAG retrieval in
 * rag.service.js (embedding similarity over the catalog), NOT
 * recommendation.service.js's full hybrid ranking pipeline (skill-gap
 * matching + TF-IDF + embeddings + learner preferences + MMR diversity).
 * That pipeline stays reserved for the Recommendations page, matching the
 * project's existing rule that the LLM never ranks courses — this tool
 * just finds candidates worth mentioning in a chat answer.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Course from '../models/Course.js';
import { matchRole, computeSkillGaps } from './recommendation.service.js';
import { retrieveRelevantCourses } from './rag.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let roles = [];
try {
  roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/roles.json'), 'utf-8'));
} catch (err) {
  console.error('agent.service: failed to load roles.json:', err.message);
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Groq's function-calling schema is OpenAI-compatible.
export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_courses',
      description:
        'Semantically searches the course catalog for courses relevant to a topic. Use this whenever the learner asks what to learn, take, or study next, or wants course suggestions on a specific topic. Never invent course names yourself — only mention courses this tool actually returns.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'A natural-language description of what to search for, e.g. "beginner React courses" or "SQL for data analysis".',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_skill_gaps',
      description:
        "Returns the learner's current missing skills for their target role — skills required for the role that they don't know yet. Use this when asked about skill gaps, weaknesses, or what to focus on next.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_prerequisites',
      description:
        'Looks up the prerequisite skills for a given skill/topic, and whether the learner already satisfies them. Use this when asked things like "can I learn X yet" or "what do I need before X".',
      parameters: {
        type: 'object',
        properties: {
          skill: {
            type: 'string',
            description: 'The skill to check prerequisites for, e.g. "React" or "Machine Learning".',
          },
        },
        required: ['skill'],
      },
    },
  },
];

/**
 * Executes one tool call by name. `context` is the same learner-context
 * object the frontend already sends to /api/ai/chat (profile fields,
 * currentSkills, skillGaps from the active path, etc.) — tools read from
 * it instead of re-authenticating, since the route already established who
 * the learner is.
 */
export async function executeAgentTool(name, args = {}, context = {}) {
  switch (name) {
    case 'search_courses': {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      if (!query) return { found: false, message: 'No search query was provided.' };

      const results = await retrieveRelevantCourses(query, { topK: 5 });
      if (!results.length) {
        return { found: false, message: `No courses in the catalog matched "${query}".` };
      }
      return { found: true, courses: results };
    }

    case 'get_skill_gaps': {
      // Prefer the gaps already computed for the learner's active path —
      // only fall back to computing fresh ones if there isn't one yet.
      if (Array.isArray(context.skillGaps) && context.skillGaps.length) {
        return { skillGaps: context.skillGaps, source: 'active learning path' };
      }

      const role = matchRole(context.targetRole || '', roles);
      if (!role) {
        return {
          skillGaps: [],
          message: 'No target role is set for this learner yet, so skill gaps cannot be computed.',
        };
      }

      const gaps = computeSkillGaps(role.requiredSkills, context.currentSkills || [], context.knowledgeState || []);
      return { skillGaps: gaps, source: `computed from ${role.role} requirements` };
    }

    case 'check_prerequisites': {
      const skill = typeof args.skill === 'string' ? args.skill.trim() : '';
      if (!skill) return { found: false, message: 'No skill was provided to check.' };

      const course = await Course.findOne({
        skills: { $regex: new RegExp(`^${escapeRegex(skill)}$`, 'i') },
      }).lean();

      if (!course) {
        return { found: false, message: `No course teaching "${skill}" was found in the catalog.` };
      }

      const known = new Set((context.currentSkills || []).map((s) => String(s.name).toLowerCase()));
      const prerequisites = (course.prerequisites || []).map((p) => ({
        skill: p,
        alreadyKnown: known.has(String(p).toLowerCase()),
      }));

      return {
        found: true,
        skill,
        prerequisites,
        allSatisfied: prerequisites.every((p) => p.alreadyKnown),
      };
    }

    default:
      return { error: `Unknown tool "${name}".` };
  }
}
