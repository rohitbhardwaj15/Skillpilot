// Maps a coarse self-reported skill level to a 0-1 "evidence score" so it
// can be blended with real, measured evidence (assessments, feedback) on
// the same numeric scale.
const LEVEL_TO_SCORE = { none: 0.05, beginner: 0.3, intermediate: 0.6, advanced: 0.85 };

// Inverse of the above: converts a blended 0-1 score back into a coarse
// label for anywhere the UI displays a level instead of a raw number.
const SCORE_TO_LEVEL = score =>
  score >= 0.8 ? 'advanced' : score >= 0.55 ? 'intermediate' : score >= 0.25 ? 'beginner' : 'none';

/**
 * Records a new piece of evidence about the learner's mastery of a skill
 * (from an assessment, course completion, or feedback) and blends it into
 * their running knowledge state.
 *
 * This is an online, weighted update rather than a simple overwrite: each
 * new evidenceScore is merged with the learner's current level using
 * `reliability` as the blend weight, so a single low-reliability signal
 * (e.g. quick feedback) nudges the estimate gently, while a high-reliability
 * signal (e.g. a graded assessment) moves it more. Confidence grows the
 * same way, converging toward 1 as more evidence accumulates over time —
 * this is what lets `readiness.service.js` trust well-evidenced skills more
 * than freshly self-reported ones.
 *
 * @param profile        the learner's profile document (mutated in place)
 * @param skill          skill name this evidence is about
 * @param evidenceScore  0-1 mastery signal from this specific evidence
 * @param evidence       short human-readable description of the evidence
 * @param reliability    0-1 trust weight for this evidence source
 *                       (clamped to [0.15, 0.9] so no single signal can
 *                       fully overwrite prior state or be entirely ignored)
 */
export function upsertKnowledge(profile, skill, evidenceScore, evidence, reliability = 0.5) {
  const name = String(skill).trim();
  if (!profile.knowledgeState) profile.knowledgeState = [];

  let state = profile.knowledgeState.find(k => k.skill.toLowerCase() === name.toLowerCase());
  if (!state) {
    // First time we're tracking this skill — seed it from the learner's
    // self-report if they have one, otherwise start from zero.
    const current = profile.currentSkills?.find(s => s.name.toLowerCase() === name.toLowerCase());
    state = {
      skill: name,
      level: LEVEL_TO_SCORE[current?.level || 'none'],
      confidence: current ? 0.45 : 0.2,
      evidence: current ? ['self-reported skill'] : [],
      lastUpdated: new Date(),
    };
    profile.knowledgeState.push(state);
  }

  const weight = Math.max(0.15, Math.min(0.9, reliability));
  // Weighted blend: new evidence pulls the level toward evidenceScore by
  // `weight`, while `1 - weight` preserves what we already believed.
  state.level = Math.max(0, Math.min(1, state.level * (1 - weight) + evidenceScore * weight));
  // Confidence creeps upward with each additional piece of evidence,
  // weighted more heavily toward reliable sources.
  state.confidence = Math.max(0, Math.min(1, state.confidence * 0.7 + weight * 0.3));
  state.evidence = [...new Set([...(state.evidence || []), evidence])].slice(-8);
  state.lastUpdated = new Date();

  // Keep the coarse `currentSkills` label in sync with the underlying
  // numeric state, since some UI and matching logic still reads levels.
  const level = SCORE_TO_LEVEL(state.level);
  const current = profile.currentSkills?.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (current) current.level = level;
  else profile.currentSkills.push({ name, level });

  return state;
}

/**
 * Evidence from finishing a course: a fixed base mastery signal (0.72),
 * with reliability scaled up slightly by time actually spent — more time
 * on task is treated as a (weak) proxy for how seriously the learner
 * engaged with it, capped so course completion alone never fully
 * overrides assessment-grade evidence.
 */
export function applyCompletion(profile, skills, timeSpentMinutes = 0) {
  const hours = Math.max(0, Number(timeSpentMinutes) || 0) / 60;
  const reliability = Math.min(0.55, 0.25 + Math.min(hours / 8, 0.3));
  return skills.map(skill =>
    upsertKnowledge(
      profile,
      skill,
      0.72,
      `completed course${hours ? ` (${Math.round(hours * 10) / 10}h spent)` : ''}`,
      reliability
    )
  );
}

/**
 * Evidence from the learner's own "was this too easy/hard?" feedback.
 * Self-report is inherently noisier than a graded assessment, so every
 * reliability weight here stays well below `applyAssessment`'s 0.75.
 */
export function applyFeedback(profile, skills, rating) {
  const score = { too_easy: 0.92, perfect: 0.8, good: 0.7, too_hard: 0.35 }[rating] ?? 0.5;
  const reliability = { too_easy: 0.55, perfect: 0.4, good: 0.35, too_hard: 0.55 }[rating] ?? 0.4;
  return skills.map(skill => upsertKnowledge(profile, skill, score, `learner feedback: ${rating}`, reliability));
}

/**
 * Evidence from a graded skill assessment — the most trustworthy signal
 * available (reliability 0.75), since it's a direct, scored measurement
 * rather than a self-report or a proxy like time spent.
 */
export function applyAssessment(profile, skill, score) {
  const evidenceScore = Math.max(0, Math.min(1, Number(score) / 100));
  const reliability = 0.75;
  return upsertKnowledge(profile, skill, evidenceScore, `assessment score: ${score}%`, reliability);
}

export function knowledgeSummary(profile) {
  return (profile.knowledgeState || []).map(k => ({
    skill: k.skill,
    level: +k.level.toFixed(2),
    confidence: +k.confidence.toFixed(2),
    evidence: k.evidence,
    lastUpdated: k.lastUpdated,
  }));
}

// Seeds knowledgeState from self-reported currentSkills for any skill that
// doesn't have evidence-based tracking yet — run once when a profile is
// created or onboarded, so readiness/recommendation logic always has a
// starting point even before the first assessment or course completion.
export function initializeKnowledgeState(profile) {
  if (!profile.knowledgeState) profile.knowledgeState = [];
  for (const skill of profile.currentSkills || []) {
    if (!profile.knowledgeState.some(k => k.skill.toLowerCase() === skill.name.toLowerCase())) {
      profile.knowledgeState.push({
        skill: skill.name,
        level: LEVEL_TO_SCORE[skill.level || 'none'],
        confidence: 0.35,
        evidence: ['self-reported skill'],
        lastUpdated: new Date(),
      });
    }
  }
  return profile;
}
