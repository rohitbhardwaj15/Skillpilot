import assert from 'node:assert/strict';
import { normalizeDifficulty, validateAssessmentQuestions, scoreAssessment } from '../services/assessment.service.js';

// --- normalizeDifficulty -----------------------------------------------

// Regression test: this is exactly the bug that broke the Skill Assessment
// feature. A learner's currentSkills level can legitimately be 'none', but
// the Assessment model's difficulty enum never accepted it, so
// Assessment.create() failed validation and "Start Assessment" silently
// errored for any skill the learner hadn't started yet.
assert.equal(normalizeDifficulty('none'), 'beginner', "'none' must normalize to 'beginner'");
assert.equal(normalizeDifficulty('beginner'), 'beginner');
assert.equal(normalizeDifficulty('intermediate'), 'intermediate');
assert.equal(normalizeDifficulty('advanced'), 'advanced');
assert.equal(normalizeDifficulty(undefined), 'beginner', 'missing level defaults to beginner');
assert.equal(normalizeDifficulty('garbage'), 'beginner', 'unrecognized value falls back to beginner');

// --- validateAssessmentQuestions ----------------------------------------

function validQuestion(overrides = {}) {
  return {
    question: 'What does this keyword do?',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 1,
    explanation: 'Because.',
    ...overrides,
  };
}

const goodPayload = { questions: Array.from({ length: 5 }, () => validQuestion()) };
const { questions } = validateAssessmentQuestions(goodPayload);
assert.equal(questions.length, 5, 'accepts a well-formed 5-question payload');
assert.equal(questions[0].correctIndex, 1);

// Extra questions beyond 5 are trimmed, not rejected.
const sevenQuestions = { questions: Array.from({ length: 7 }, () => validQuestion()) };
assert.equal(validateAssessmentQuestions(sevenQuestions).questions.length, 5, 'trims to exactly 5 questions');

// correctIndex arriving as a string (LLMs sometimes do this) is coerced.
const stringIndex = { questions: Array.from({ length: 5 }, () => validQuestion({ correctIndex: '2' })) };
assert.equal(validateAssessmentQuestions(stringIndex).questions[0].correctIndex, 2, 'coerces string correctIndex to a number');

assert.throws(() => validateAssessmentQuestions(null), /questions array/, 'rejects null payload');
assert.throws(() => validateAssessmentQuestions({ questions: [] }), /at least 5/, 'rejects empty questions array');
assert.throws(
  () => validateAssessmentQuestions({ questions: Array.from({ length: 5 }, () => validQuestion({ question: '' })) }),
  /missing question text/,
  'rejects a question with no text'
);
assert.throws(
  () => validateAssessmentQuestions({ questions: Array.from({ length: 5 }, () => validQuestion({ options: ['A', 'B'] })) }),
  /4 valid options/,
  'rejects a question without exactly 4 options'
);
assert.throws(
  () => validateAssessmentQuestions({ questions: Array.from({ length: 5 }, () => validQuestion({ correctIndex: 9 })) }),
  /invalid correctIndex/,
  'rejects an out-of-range correctIndex'
);

// --- scoreAssessment ------------------------------------------------------

const scoredQuestions = [
  { correctIndex: 0 },
  { correctIndex: 1 },
  { correctIndex: 2 },
  { correctIndex: 3 },
];
assert.deepEqual(
  scoreAssessment(scoredQuestions, [0, 1, 2, 3]),
  { correct: 4, total: 4, score: 100 },
  'scores a perfect run correctly'
);
assert.deepEqual(
  scoreAssessment(scoredQuestions, [0, 0, 0, 0]),
  { correct: 1, total: 4, score: 25 },
  'scores a partial run correctly'
);
// String answers (from JSON over the wire) must still compare correctly.
assert.deepEqual(
  scoreAssessment(scoredQuestions, ['0', '1', '2', '3']),
  { correct: 4, total: 4, score: 100 },
  'coerces string answers before comparing'
);
assert.deepEqual(
  scoreAssessment([], []),
  { correct: 0, total: 0, score: 0 },
  'a zero-question assessment scores as 0%, not NaN%'
);

console.log('✅ ALL ASSESSMENT SERVICE TESTS PASSED');
