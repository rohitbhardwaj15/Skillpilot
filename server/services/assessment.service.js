/**
 * Assessment domain logic — kept as pure functions, separate from the
 * Express route, so it can be unit tested without a live DB or LLM call.
 */

const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

/**
 * Maps a learner's skill level to a valid assessment difficulty.
 *
 * currentSkills.level can be 'none' (the AI onboarding step assigns this
 * to any skill the learner says they haven't touched), but the Assessment
 * model's difficulty enum only accepts beginner/intermediate/advanced —
 * there's no such thing as a "no difficulty" quiz. Passing 'none' straight
 * through used to fail Mongoose validation and silently break "Start
 * Assessment" for exactly the learners most likely to want one. Normalize
 * here so that never happens again.
 */
export function normalizeDifficulty(level) {
  return VALID_DIFFICULTIES.includes(level) ? level : 'beginner';
}

/**
 * Validates and normalizes LLM-generated assessment questions. Throws a
 * descriptive error naming the first invalid question rather than letting
 * a partially-broken quiz reach the learner or crash later on submit.
 */
export function validateAssessmentQuestions(parsed) {
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new Error('LLM did not return a questions array');
  }
  if (parsed.questions.length < 5) {
    throw new Error(`LLM returned only ${parsed.questions.length} question(s), need at least 5`);
  }

  const questions = parsed.questions.slice(0, 5).map((q, i) => {
    if (!q || typeof q.question !== 'string' || !q.question.trim()) {
      throw new Error(`Question ${i + 1} is missing question text`);
    }
    if (
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      q.options.some((o) => typeof o !== 'string' || !o.trim())
    ) {
      throw new Error(`Question ${i + 1} does not have exactly 4 valid options`);
    }
    const correctIndex = Number(q.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      throw new Error(`Question ${i + 1} has an invalid correctIndex`);
    }
    return {
      question: q.question.trim(),
      options: q.options.map((o) => o.trim()),
      correctIndex,
      explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
    };
  });

  return { questions };
}

/**
 * Scores a completed assessment against the learner's answers.
 * Guards the zero-question case so a data anomaly produces 0%, not NaN%.
 */
export function scoreAssessment(questions, answers) {
  const total = questions.length;
  if (total === 0) return { correct: 0, total: 0, score: 0 };
  const correct = questions.reduce(
    (n, q, i) => n + (Number(answers[i]) === q.correctIndex ? 1 : 0),
    0
  );
  return { correct, total, score: Math.round((correct / total) * 100) };
}
