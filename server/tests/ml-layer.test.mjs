/** Validates the new NLP + learned personalization layer without external APIs. */
import assert from 'node:assert/strict';
import { cosineSimilarity, semanticCourseScores, trainPreferenceModel, predictPreference } from '../services/ml.service.js';

const courses = [
  { _id: 'react', title: 'React Frontend Development', description: 'Build modern user interfaces with React JavaScript', skills: ['React', 'JavaScript'], prerequisites: ['JavaScript'], level: 'intermediate', type: 'course', language: 'English' },
  { _id: 'python', title: 'Python Data Analysis', description: 'Analyze data with Python and pandas', skills: ['Python', 'Data Analysis'], prerequisites: [], level: 'beginner', type: 'course', language: 'English' },
];
const profile = {
  goal: 'I want to become a React frontend developer',
  targetRole: 'Frontend Developer',
  currentSkills: [{ name: 'JavaScript', level: 'intermediate' }],
  interests: ['web interfaces'],
  learningStyle: ['video'],
  preferredLanguage: 'English',
};
const role = { role: 'Frontend Developer', requiredSkills: ['JavaScript', 'React'] };

const scores = await semanticCourseScores(courses, profile, role, ['React']);
assert(scores.get('react') > scores.get('python'), 'semantic model ranks React content above unrelated Python content');
assert(cosineSimilarity(new Map([['react', 1]]), new Map([['react', 1]])) === 1, 'cosine similarity is normalized');

const feedback = [
  { breakdown: { skillGapMatch: .9, goalRelevance: .9, prereqReadiness: .9, userInterest: .9, learningStyleMatch: .9, semanticMatch: .9, languageMatch: 1 }, label: 1 },
  { breakdown: { skillGapMatch: .1, goalRelevance: .1, prereqReadiness: .1, userInterest: .1, learningStyleMatch: .1, semanticMatch: .1, languageMatch: 0 }, label: 0 },
];
const model = trainPreferenceModel(feedback);
assert(model.trained && model.samples === 2, 'feedback trains the learner preference model');
const preferred = predictPreference(model, feedback[0].breakdown);
const rejected = predictPreference(model, feedback[1].breakdown);
assert(preferred > rejected, 'learned model prefers features associated with positive feedback');

console.log('✅ ALL ML LAYER TESTS PASSED');
