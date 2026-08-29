/**
 * ML Service
 *
 * Hybrid semantic recommendation layer:
 *   1. TF-IDF lexical similarity
 *   2. Dense embedding similarity (real provider when configured, else a
 *      deterministic local hashed fallback so the app still works offline)
 *   3. Learner preference model (online logistic regression, warm-startable)
 *
 * The service intentionally keeps the recommendation engine deterministic
 * and explainable — this file only produces *features* (scores), never a
 * final ranking or recommendation text. That decision lives in
 * recommendation.service.js.
 */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with',
  'using', 'build', 'learn', 'learning', 'become', 'want', 'from', 'into',
  'my', 'i',
]);

/* ───────────────────────────────────────────────
 * Text utilities
 * ─────────────────────────────────────────────── */

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text = '') {
  return normalizeText(text)
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token));
}

function termFrequency(tokens) {
  const counts = new Map();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  const total = Math.max(tokens.length, 1);
  return new Map([...counts.entries()].map(([term, count]) => [term, count / total]));
}

export function cosineSimilarity(a, b) {
  if (!a.size || !b.size) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [key, value] of a) {
    const other = b.get(key) || 0;
    dot += value * other;
    normA += value * value;
  }
  for (const value of b.values()) {
    normB += value * value;
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* ───────────────────────────────────────────────
 * TF-IDF
 * ─────────────────────────────────────────────── */

function buildTfIdf(documents) {
  const tokenized = documents.map(tokenize);
  const documentFrequency = new Map();

  for (const tokens of tokenized) {
    const unique = new Set(tokens);
    for (const token of unique) {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    }
  }

  const totalDocuments = documents.length || 1;

  return tokenized.map((tokens) => {
    const tf = termFrequency(tokens);
    const vector = new Map();

    for (const [term, tfValue] of tf) {
      const df = documentFrequency.get(term) || 0;
      const idf = Math.log((1 + totalDocuments) / (1 + df)) + 1;
      vector.set(term, tfValue * idf);
    }

    return vector;
  });
}

/* ───────────────────────────────────────────────
 * Dense embedding layer
 *
 * Two implementations behind one interface:
 *
 *   - Real provider: any OpenAI-compatible `/embeddings` endpoint
 *     (OpenAI, Voyage, Together, etc.), configured via
 *     EMBEDDING_API_URL + EMBEDDING_API_KEY + EMBEDDING_MODEL.
 *   - Local fallback: a deterministic hashed bag-of-words projection.
 *     Used automatically when no provider is configured, when a call
 *     fails, or when a call times out — so the recommender never goes
 *     down because an external API is unavailable.
 *
 * Embeddings are cached in-memory per process (courses are static
 * within a deploy, so this avoids re-embedding the same 1000+ course
 * documents on every request).
 * ─────────────────────────────────────────────── */

const EMBEDDING_DIMENSION = 128;
const EMBEDDING_TIMEOUT_MS = Number(process.env.EMBEDDING_TIMEOUT_MS) || 4000;
const embeddingCache = new Map();

function hashToken(token) {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

/** Deterministic, dependency-free local embedding. Always available. */
function localHashEmbedding(text) {
  const tokens = tokenize(text);
  const vector = new Array(EMBEDDING_DIMENSION).fill(0);
  if (!tokens.length) return vector;

  for (const token of tokens) {
    const hash = hashToken(token);
    const index = hash % EMBEDDING_DIMENSION;
    const sign = hash & 1 ? 1 : -1;
    vector[index] += sign;

    // Second projection reduces collisions between common tokens.
    const index2 = ((hash >>> 8) + token.length * 17) % EMBEDDING_DIMENSION;
    vector[index2] += sign * 0.5;
  }

  let magnitude = 0;
  for (const value of vector) magnitude += value * value;
  magnitude = Math.sqrt(magnitude);
  if (!magnitude) return vector;

  return vector.map((value) => value / magnitude);
}

function isEmbeddingProviderConfigured() {
  return Boolean(process.env.EMBEDDING_API_URL && process.env.EMBEDDING_API_KEY);
}

/** Calls a real OpenAI-compatible embeddings endpoint with a timeout. */
async function callRemoteEmbedding(text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

  try {
    const response = await fetch(process.env.EMBEDDING_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EMBEDDING_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        input: text.slice(0, 8000),
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error (${response.status})`);
    }

    const data = await response.json();
    const vector = data?.data?.[0]?.embedding;
    if (!Array.isArray(vector) || !vector.length) {
      throw new Error('Embedding API returned no vector');
    }
    return vector;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves a dense embedding for `text`, using a real provider when one is
 * configured and falling back to the local hashed method on any failure
 * (missing config, network error, timeout, malformed response). Results are
 * cached per process so repeated calls for the same course text are free.
 */
export async function resolveEmbedding(text) {
  const key = text || '';
  if (embeddingCache.has(key)) return embeddingCache.get(key);

  let vector;
  if (isEmbeddingProviderConfigured()) {
    try {
      vector = await callRemoteEmbedding(key);
    } catch (err) {
      console.warn('Embedding provider failed, using local fallback:', err.message);
      vector = localHashEmbedding(key);
    }
  } else {
    vector = localHashEmbedding(key);
  }

  embeddingCache.set(key, vector);
  return vector;
}

function denseCosineSimilarity(a, b) {
  if (!a.length || !b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  // Vectors from the local method are pre-normalized (dot IS the cosine);
  // vectors from a real provider generally are not, so normalize here too —
  // this keeps the function correct for both sources.
  if (!normA || !normB) return 0;
  const cosine = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, cosine));
}

/* ───────────────────────────────────────────────
 * Course representation
 * ─────────────────────────────────────────────── */

function courseText(course) {
  return [
    course.title,
    course.description,
    ...(course.skills || []),
    ...(course.tags || []),
    course.category,
    course.level,
    course.language,
  ]
    .filter(Boolean)
    .join(' ');
}

function profileText(profile, role, gaps = []) {
  return [
    profile.goal,
    profile.targetRole,
    role?.role,
    ...(role?.requiredSkills || []),
    ...(profile.interests || []),
    ...(profile.currentSkills || []).map((skill) => skill.name),
    ...gaps,
  ]
    .filter(Boolean)
    .join(' ');
}

/* ───────────────────────────────────────────────
 * Hybrid semantic scores
 * ─────────────────────────────────────────────── */

/**
 * Returns a Map of courseKey -> hybrid semantic score in [0, 1].
 * Async because dense embeddings may come from a real remote provider;
 * when no provider is configured this resolves immediately using the
 * local method, so the async boundary costs nothing in the common case.
 */
export async function semanticCourseScores(courses, profile, role, gaps = []) {
  const documents = [profileText(profile, role, gaps), ...courses.map(courseText)];

  const tfidfVectors = buildTfIdf(documents);
  const profileTfIdf = tfidfVectors[0];
  const courseTfIdf = tfidfVectors.slice(1);

  const embeddings = await Promise.all(documents.map(resolveEmbedding));
  const profileEmbedding = embeddings[0];

  const scores = new Map();

  courses.forEach((course, index) => {
    const tfidfScore = cosineSimilarity(profileTfIdf, courseTfIdf[index]);
    const embeddingScore = denseCosineSimilarity(profileEmbedding, embeddings[index + 1]);

    // Dense embeddings get more weight — they capture broader contextual
    // similarity, while TF-IDF preserves exact skill/keyword relevance.
    const hybridScore = 0.4 * tfidfScore + 0.6 * embeddingScore;
    const key = String(course._id || course.id || course.title);
    scores.set(key, Math.max(0, Math.min(1, hybridScore)));
  });

  return scores;
}

/* ───────────────────────────────────────────────
 * Feedback → training examples
 * ─────────────────────────────────────────────── */

function feedbackLabel(feedback) {
  const value = String(feedback?.rating ?? feedback?.feedback ?? feedback?.difficulty ?? '').toLowerCase();

  if (value.includes('perfect') || value.includes('excellent') || value.includes('good') || value === '5' || value === '4') {
    return 1;
  }
  if (value.includes('too hard') || value.includes('too difficult') || value.includes('bad') || value.includes('poor') || value === '1' || value === '2') {
    return 0;
  }
  return null;
}

export function buildFeedbackExamples(profile, courses, scoreBuilder) {
  const feedback = profile.feedback || profile.courseFeedback || [];
  const examples = [];

  for (const item of feedback) {
    const label = feedbackLabel(item);
    if (label === null) continue;

    const courseId = item.courseId || item.course_id || item._id;
    const course = courses.find((c) => String(c._id || c.id || c.title) === String(courseId));
    if (!course) continue;

    const score = scoreBuilder(course);

    examples.push({
      features: {
        skillGapMatch: score.skillGapMatch,
        goalRelevance: score.goalRelevance,
        prereqReadiness: score.prereqReadiness,
        userInterest: score.userInterest,
        learningStyleMatch: score.learningStyleMatch,
        semanticMatch: score.semanticMatch,
        languageMatch: score.languageMatch,
        quality: score.quality,
      },
      label,
    });
  }

  return examples;
}

/* ───────────────────────────────────────────────
 * Online logistic regression
 * ─────────────────────────────────────────────── */

const FEATURE_NAMES = [
  'skillGapMatch',
  'goalRelevance',
  'prereqReadiness',
  'userInterest',
  'learningStyleMatch',
  'semanticMatch',
  'languageMatch',
  'quality',
];

function featureVector(example) {
  // Accepts either { features: {...} } (the shape produced by
  // buildFeedbackExamples) or a bare score-breakdown object.
  const source = example?.features || example?.breakdown || example || {};
  return FEATURE_NAMES.map((name) => Number(source[name]) || 0);
}

function sigmoid(value) {
  if (value < -30) return 0;
  if (value > 30) return 1;
  return 1 / (1 + Math.exp(-value));
}

function dotProduct(a, b) {
  let result = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    result += a[i] * b[i];
  }
  return result;
}

/**
 * Small logistic-regression model over the deterministic score features.
 *
 * Supports warm-starting from a previously persisted model (see
 * Profile.preferenceModel) so a learner's preferences accumulate across
 * sessions via true incremental updates, instead of being retrained from
 * scratch — and forgotten — on every request.
 */
export function trainPreferenceModel(examples = [], { initialWeights = null, initialBias = 0 } = {}) {
  const weights = initialWeights && initialWeights.length === FEATURE_NAMES.length
    ? [...initialWeights]
    : new Array(FEATURE_NAMES.length).fill(0);
  let bias = Number(initialBias) || 0;

  if (!examples.length) {
    return {
      trained: Boolean(initialWeights?.length),
      samples: 0,
      weights,
      bias,
    };
  }

  // Multiple epochs let the model settle on a stable read of a small batch
  // of new feedback, on top of whatever it already learned previously.
  const learningRate = 0.08;
  const epochs = 8;

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const example of examples) {
      const x = featureVector(example);
      const prediction = sigmoid(dotProduct(weights, x) + bias);
      const error = prediction - example.label;

      for (let i = 0; i < weights.length; i++) {
        weights[i] -= learningRate * error * x[i];
      }
      bias -= learningRate * error;
    }
  }

  return {
    trained: true,
    samples: examples.length,
    weights,
    bias,
  };
}

/* ───────────────────────────────────────────────
 * Preference prediction
 * ─────────────────────────────────────────────── */

export function predictPreference(model, score) {
  if (!model || !model.trained) {
    return 0.5; // cold-start prior
  }

  const x = featureVector(score);
  const probability = sigmoid(dotProduct(model.weights, x) + model.bias);

  // Blend learned preference with a neutral prior so a handful of feedback
  // events can't push scores to the extremes.
  return 0.7 * probability + 0.3 * 0.5;
}

/* ───────────────────────────────────────────────
 * Debug / evaluation helper
 * ─────────────────────────────────────────────── */

export async function explainSemanticScore(profile, course, role, gaps = []) {
  const profileDoc = profileText(profile, role, gaps);
  const courseDoc = courseText(course);

  const vectors = buildTfIdf([profileDoc, courseDoc]);
  const tfidf = cosineSimilarity(vectors[0], vectors[1]);

  const [profileEmbedding, courseEmbedding] = await Promise.all([
    resolveEmbedding(profileDoc),
    resolveEmbedding(courseDoc),
  ]);
  const embedding = denseCosineSimilarity(profileEmbedding, courseEmbedding);

  return {
    tfidf: Math.round(tfidf * 1000) / 1000,
    embedding: Math.round(embedding * 1000) / 1000,
    hybrid: Math.round((0.4 * tfidf + 0.6 * embedding) * 1000) / 1000,
    usingRemoteEmbeddings: isEmbeddingProviderConfigured(),
  };
}
