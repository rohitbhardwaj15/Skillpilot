import assert from 'node:assert/strict';
import { applyAssessment, applyCompletion, applyFeedback } from '../services/learner.service.js';

function profile() { return { currentSkills: [{ name:'React', level:'beginner' }], knowledgeState: [], learningStyle: [] }; }

const p = profile();
const a = applyAssessment(p, 'React', 90);
assert(a.level > 0.6 && a.confidence >= 0.65, 'assessment creates high mastery with strong confidence');
const before = a.level;
applyCompletion(p, ['React'], 120);
assert(p.knowledgeState[0].level > 0, 'completion contributes additional evidence');
applyFeedback(p, ['React'], 'too_easy');
assert(p.knowledgeState[0].level >= before, 'too_easy feedback increases mastery estimate');
applyFeedback(p, ['React'], 'too_hard');
assert(p.knowledgeState[0].evidence.some(e => e.includes('too_hard')), 'feedback evidence is persisted');
console.log('✅ ALL LEARNER MODEL TESTS PASSED');
