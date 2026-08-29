const LEVEL_TO_SCORE = { none: 0.05, beginner: 0.3, intermediate: 0.6, advanced: 0.85 };
const SCORE_TO_LEVEL = score => score >= 0.8 ? 'advanced' : score >= 0.55 ? 'intermediate' : score >= 0.25 ? 'beginner' : 'none';
export function upsertKnowledge(profile, skill, evidenceScore, evidence, reliability = 0.5) {
  const name = String(skill).trim();
  if (!profile.knowledgeState) profile.knowledgeState = [];
  let state = profile.knowledgeState.find(k => k.skill.toLowerCase() === name.toLowerCase());
  if (!state) { const current = profile.currentSkills?.find(s => s.name.toLowerCase() === name.toLowerCase()); state = { skill:name, level:LEVEL_TO_SCORE[current?.level || 'none'], confidence:current ? 0.45 : 0.2, evidence:current ? ['self-reported skill'] : [], lastUpdated:new Date() }; profile.knowledgeState.push(state); }
  const weight = Math.max(0.15, Math.min(0.9, reliability));
  state.level = Math.max(0, Math.min(1, state.level * (1-weight) + evidenceScore * weight));
  state.confidence = Math.max(0, Math.min(1, state.confidence * 0.7 + weight * 0.3));
  state.evidence = [...new Set([...(state.evidence || []), evidence])].slice(-8); state.lastUpdated = new Date();
  const level = SCORE_TO_LEVEL(state.level); const current = profile.currentSkills?.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (current) current.level = level; else profile.currentSkills.push({name, level});
  return state;
}
export function applyCompletion(profile, skills, timeSpentMinutes=0) { const hours=Math.max(0,Number(timeSpentMinutes)||0)/60; const reliability=Math.min(0.55,0.25+Math.min(hours/8,0.3)); return skills.map(skill=>upsertKnowledge(profile,skill,0.72,`completed course${hours?` (${Math.round(hours*10)/10}h spent)`:''}`,reliability)); }
export function applyFeedback(profile, skills, rating) { const score={too_easy:0.92,perfect:0.8,good:0.7,too_hard:0.35}[rating] ?? 0.5; const reliability={too_easy:0.55,perfect:0.4,good:0.35,too_hard:0.55}[rating] ?? 0.4; return skills.map(skill=>upsertKnowledge(profile,skill,score,`learner feedback: ${rating}`,reliability)); }
export function knowledgeSummary(profile) { return (profile.knowledgeState||[]).map(k=>({skill:k.skill,level:+k.level.toFixed(2),confidence:+k.confidence.toFixed(2),evidence:k.evidence,lastUpdated:k.lastUpdated})); }

export function initializeKnowledgeState(profile) {
  if (!profile.knowledgeState) profile.knowledgeState = [];
  for (const skill of profile.currentSkills || []) {
    if (!profile.knowledgeState.some(k => k.skill.toLowerCase() === skill.name.toLowerCase())) {
      profile.knowledgeState.push({ skill: skill.name, level: LEVEL_TO_SCORE[skill.level || 'none'], confidence: 0.35, evidence: ['self-reported skill'], lastUpdated: new Date() });
    }
  }
  return profile;
}
