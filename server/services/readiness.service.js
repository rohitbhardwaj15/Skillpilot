import { matchRole } from './recommendation.service.js';

const clamp = (n) => Math.max(0, Math.min(1, n));

export function buildCareerInsights(profile, roles, courses = [], learningPath = null) {
  const role = matchRole(profile.targetRole, roles);
  if (!role) return { role: profile.targetRole || 'Target Role', readinessScore: 0, skills: [], biggestGap: null, nextBestAction: null };

  const state = new Map((profile.knowledgeState || []).map(k => [k.skill.toLowerCase(), k]));
  const self = new Map((profile.currentSkills || []).map(k => [k.name.toLowerCase(), k]));
  const level = { none: 0, beginner: .3, intermediate: .6, advanced: .85 };

  const skills = role.requiredSkills.map(skill => {
    const k = state.get(skill.toLowerCase());
    const s = self.get(skill.toLowerCase());
    const mastery = k ? Number(k.level) : (s ? level[s.level] || 0 : 0);
    const confidence = k ? Number(k.confidence) : (s ? .35 : .15);
    const status = mastery >= .8 && confidence >= .55 ? 'mastered' : mastery > .25 ? 'learning' : 'missing';
    return { skill, level: +clamp(mastery).toFixed(2), confidence: +clamp(confidence).toFixed(2), status };
  });

  const readinessScore = Math.round(skills.reduce((sum, s) => sum + s.level * (.7 + .3 * s.confidence), 0) / Math.max(1, skills.length) * 100);
  const gaps = [...skills].sort((a, b) => a.level - b.level);
  const biggestGap = gaps.find(s => s.status !== 'mastered') || null;

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
