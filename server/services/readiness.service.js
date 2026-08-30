import { matchRole } from './recommendation.service.js';

const clamp = (n) => Math.max(0, Math.min(1, n));

/**
 * Builds the "career readiness" summary shown on the dashboard: per-skill
 * mastery/confidence/status for the target role, an overall readiness
 * score, the single biggest remaining gap, and a concrete next action.
 *
 * Two data sources are blended per skill:
 * - `knowledgeState` — evidence-based mastery from completed assessments
 *   (preferred when present, since it reflects actual measured performance).
 * - `currentSkills` — the learner's own self-reported level, used as a
 *   fallback with lower confidence until real evidence exists.
 */
export function buildCareerInsights(profile, roles, courses = [], learningPath = null) {
  const role = matchRole(profile.targetRole, roles);
  if (!role) return { role: profile.targetRole || 'Target Role', readinessScore: 0, skills: [], biggestGap: null, nextBestAction: null };

  const state = new Map((profile.knowledgeState || []).map(k => [k.skill.toLowerCase(), k]));
  const self = new Map((profile.currentSkills || []).map(k => [k.name.toLowerCase(), k]));
  // Self-reported skill levels are mapped to a 0-1 mastery scale so they're
  // directly comparable to the assessment-derived `knowledgeState` scores.
  const level = { none: 0, beginner: .3, intermediate: .6, advanced: .85 };

  const skills = role.requiredSkills.map(skill => {
    const k = state.get(skill.toLowerCase());
    const s = self.get(skill.toLowerCase());
    // Evidence-based mastery wins when available; otherwise fall back to
    // the learner's self-report, with a lower default confidence (0.35 for
    // a stated skill, 0.15 for an unstated one) since it's unverified.
    const mastery = k ? Number(k.level) : (s ? level[s.level] || 0 : 0);
    const confidence = k ? Number(k.confidence) : (s ? .35 : .15);
    const status = mastery >= .8 && confidence >= .55 ? 'mastered' : mastery > .25 ? 'learning' : 'missing';
    return { skill, level: +clamp(mastery).toFixed(2), confidence: +clamp(confidence).toFixed(2), status };
  });

  // Readiness score: average mastery across required skills, each
  // discounted by how confident we are in that mastery reading. A skill at
  // 100% mastery but low confidence (e.g. self-reported, never assessed)
  // contributes at most 70% of its raw level; full credit needs both high
  // mastery AND high confidence.
  const readinessScore = Math.round(skills.reduce((sum, s) => sum + s.level * (.7 + .3 * s.confidence), 0) / Math.max(1, skills.length) * 100);
  const gaps = [...skills].sort((a, b) => a.level - b.level);
  const biggestGap = gaps.find(s => s.status !== 'mastered') || null;

  // Prefer whatever course the learner's roadmap already has queued up next
  // for the current phase; only fall back to picking a fresh course for the
  // biggest gap (highest quality score first) if no roadmap is active yet.
  const currentPathCourse = learningPath?.phases?.flatMap(p => p.courses || []).find(c => c.status === 'current');
  const pathCourses = courses.filter(c => biggestGap && (c.skills || []).some(s => s.toLowerCase() === biggestGap.skill.toLowerCase()));
  pathCourses.sort((a,b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  const chosen = currentPathCourse ? courses.find(c => String(c._id) === String(currentPathCourse.courseId)) : pathCourses[0];
  const nextBestAction = chosen ? {
    courseId: chosen._id || chosen.courseId,
    title: chosen.title,
    skill: biggestGap.skill,
    reason: `Highest-priority gap for ${role.role}; prerequisites and course relevance are evaluated by the roadmap engine.`,
    estimatedWeeks: chosen.durationWeeks || 1,
  } : biggestGap ? {
    courseId: null,
    title: `Build ${biggestGap.skill}`,
    skill: biggestGap.skill,
    reason: `Your current mastery is ${Math.round(biggestGap.level * 100)}%, making this your biggest remaining role gap.`,
    estimatedWeeks: 1,
  } : null;

  return { role: role.role, readinessScore, skills, biggestGap, nextBestAction };
}
