/**
 * SkillPilot ML Layer
 * -------------------
 * Lightweight, dependency-free NLP + online learning layer.
 *
 * 1) TF-IDF + cosine similarity creates semantic text vectors for goals,
 *    roles, skills and course metadata. This handles related wording instead
 *    of relying only on exact string equality.
 *
 * 2) A small online logistic-regression model learns from learner feedback.
 *    good/perfect = positive preference; too_easy/too_hard = negative fit.
 *    The model is deliberately blended with deterministic safety signals,
 *    so prerequisites and hard constraints remain trustworthy.
 */

const TOKEN_RE = /[a-z0-9+#.]+/gi;
const STOP_WORDS = new Set([
  'the','and','for','with','from','this','that','into','your','you','are','was','will',
  'have','has','been','learn','learning','course','tutorial','using','use','basic','advanced',
  'developer','development','programming','skills','skill','to','of','in','on','a','an'
]);

export function tokenize(text = '') {
  return (String(text).toLowerCase().match(TOKEN_RE) || [])
    .map(t => t.replace(/\.(?=$|[^a-z0-9])/g, ''))
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function textOfCourse(course) {
  return [
    course.title,
    course.description,
    ...(course.skills || []),
    ...(course.prerequisites || []),
    course.level,
    course.type,
    course.language,
  ].filter(Boolean).join(' ');
}

function textOfProfile(profile, role, gaps) {
  return [
    profile.goal,
    profile.targetRole,
    role?.role,
    ...(role?.requiredSkills || []),
    ...(gaps || []),
    ...(profile.interests || []),
    ...(profile.currentSkills || []).map(s => `${s.name} ${s.level}`),
    profile.learningStyle?.join(' '),
    profile.preferredLanguage,
  ].filter(Boolean).join(' ');
}

function tfidf(corpus) {
  const docs = corpus.map(tokenize);
  const df = new Map();
  docs.forEach(tokens => {
    for (const token of new Set(tokens)) df.set(token, (df.get(token) || 0) + 1);
  });

  const n = docs.length;
  const idf = new Map([...df.entries()].map(([t, count]) => [t, Math.log((n + 1) / (count + 1)) + 1]));
  const vectors = docs.map(tokens => {
    const tf = new Map();
    tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
    const vector = new Map();
    const denom = Math.max(tokens.length, 1);
    for (const [t, count] of tf) vector.set(t, (count / denom) * (idf.get(t) || 1));
    return vector;
  });
  return vectors;
}

export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (const [k, v] of a) {
    normA += v * v;
    dot += v * (b.get(k) || 0);
  }
  for (const v of b.values()) normB += v * v;
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Build semantic similarity for every candidate course. */
export function semanticCourseScores(courses, profile, role, gaps) {
  const learnerText = textOfProfile(profile, role, gaps);
  const corpus = [learnerText, ...courses.map(textOfCourse)];
  const vectors = tfidf(corpus);
  const learnerVector = vectors[0];
  return new Map(courses.map((course, i) => [String(course._id || course.id || course.title), cosineSimilarity(learnerVector, vectors[i + 1])]));
}

const FEATURE_NAMES = [
  'skillGapMatch', 'goalRelevance', 'prereqReadiness',
  'userInterest', 'learningStyleMatch', 'semanticMatch', 'languageMatch', 'quality'
];

const DEFAULT_WEIGHTS = [0.20, 0.16, 0.12, 0.10, 0.08, 0.24, 0.06, 0.04];

function featureVector(breakdown) {
  return FEATURE_NAMES.map(name => Number(breakdown[name] || 0));
}

function sigmoid(x) {
  if (x < -30) return 0;
  if (x > 30) return 1;
  return 1 / (1 + Math.exp(-x));
}

/**
 * Train a tiny logistic-regression preference model from this learner's
 * historical feedback. With little/no feedback we return the neutral prior.
 */
export function trainPreferenceModel(feedbackExamples = []) {
  let weights = [...DEFAULT_WEIGHTS];
  let bias = 0;
  const epochs = 35;
  const learningRate = 0.08;

  if (!feedbackExamples.length) {
    return { weights, bias, samples: 0, trained: false };
  }

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const example of feedbackExamples) {
      const x = featureVector(example.breakdown);
      const y = example.label;
      const prediction = sigmoid(weights.reduce((s, w, i) => s + w * x[i], bias));
      const error = prediction - y;
      weights = weights.map((w, i) => w - learningRate * error * x[i]);
      bias -= learningRate * error;
    }
  }

  // Keep the learned layer bounded and normalize its contribution later.
  weights = weights.map(w => Math.max(-1.5, Math.min(1.5, w)));
  return { weights, bias, samples: feedbackExamples.length, trained: true };
}

export function predictPreference(model, breakdown) {
  if (!model?.trained) return 0.5;
  const x = featureVector(breakdown);
  return sigmoid(model.weights.reduce((s, w, i) => s + w * x[i], model.bias));
}

/**
 * Prepare training rows. This is intentionally separate from ranking so the
 * deterministic score remains available for explainability and testing.
 */
export function buildFeedbackExamples(profile, courses, scoreBuilder) {
  const examples = [];
  for (const feedback of profile.feedback || []) {
    const course = courses.find(c => String(c._id) === String(feedback.courseId));
    if (!course) continue;
    const breakdown = scoreBuilder(course, { includeSemantic: true, forTraining: true });
    const label = feedback.rating === 'good' || feedback.rating === 'perfect' ? 1 : 0;
    examples.push({ breakdown, label });
  }
  return examples;
}

export function getMlFeatureNames() {
  return [...FEATURE_NAMES];
}
