/**
 * ML Service
 *
 * Hybrid semantic recommendation layer:
 *
 * 1. TF-IDF lexical similarity
 * 2. Dense embedding similarity
 * 3. Learner preference model
 *
 * The service intentionally keeps the recommendation
 * engine deterministic and explainable.
 */

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'for',
  'to',
  'of',
  'in',
  'on',
  'with',
  'using',
  'build',
  'learn',
  'learning',
  'become',
  'want',
  'from',
  'into',
  'my',
  'i',
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
    .filter(
      (token) =>
        token &&
        !STOP_WORDS.has(token)
    );
}

function termFrequency(tokens) {
  const counts = new Map();

  for (const token of tokens) {
    counts.set(
      token,
      (counts.get(token) || 0) + 1
    );
  }

  const total = Math.max(
    tokens.length,
    1
  );

  return new Map(
    [...counts.entries()].map(
      ([term, count]) => [
        term,
        count / total,
      ]
    )
  );
}

function cosineSimilarity(a, b) {
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

  return dot / (
    Math.sqrt(normA) *
    Math.sqrt(normB)
  );
}

/* ───────────────────────────────────────────────
 * TF-IDF
 * ─────────────────────────────────────────────── */

function buildTfIdf(documents) {
  const tokenized = documents.map(
    tokenize
  );

  const documentFrequency =
    new Map();

  for (const tokens of tokenized) {
    const unique = new Set(tokens);

    for (const token of unique) {
      documentFrequency.set(
        token,
        (documentFrequency.get(token) || 0) +
          1
      );
    }
  }

  const totalDocuments =
    documents.length || 1;

  return tokenized.map((tokens) => {
    const tf = termFrequency(tokens);
    const vector = new Map();

    for (const [term, tfValue] of tf) {
      const df =
        documentFrequency.get(term) || 0;

      const idf =
        Math.log(
          (1 + totalDocuments) /
            (1 + df)
        ) + 1;

      vector.set(
        term,
        tfValue * idf
      );
    }

    return vector;
  });
}

/* ───────────────────────────────────────────────
 * Dense embedding layer
 *
 * If a real embedding provider/model is
 * configured, it can be plugged into this
 * function without changing the recommender API.
 *
 * For local/offline execution we create a
 * deterministic hashed dense representation.
 * ─────────────────────────────────────────────── */

const EMBEDDING_DIMENSION = 128;

function hashToken(token) {
  let hash = 2166136261;

  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return hash >>> 0;
}

function denseEmbedding(text) {
  const tokens = tokenize(text);

  const vector = new Array(
    EMBEDDING_DIMENSION
  ).fill(0);

  if (!tokens.length) {
    return vector;
  }

  for (const token of tokens) {
    const hash = hashToken(token);

    const index =
      hash % EMBEDDING_DIMENSION;

    const sign =
      hash & 1 ? 1 : -1;

    vector[index] += sign;

    /*
     * Second projection helps reduce
     * collisions between common tokens.
     */
    const index2 =
      ((hash >>> 8) +
        token.length * 17) %
      EMBEDDING_DIMENSION;

    vector[index2] +=
      sign * 0.5;
  }

  let magnitude = 0;

  for (const value of vector) {
    magnitude += value * value;
  }

  magnitude = Math.sqrt(magnitude);

  if (!magnitude) return vector;

  return vector.map(
    (value) =>
      value / magnitude
  );
}

function denseCosineSimilarity(a, b) {
  if (!a.length || !b.length) {
    return 0;
  }

  let dot = 0;

  for (
    let i = 0;
    i < Math.min(a.length, b.length);
    i++
  ) {
    dot += a[i] * b[i];
  }

  return Math.max(
    0,
    Math.min(1, dot)
  );
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

function profileText(
  profile,
  role,
  gaps = []
) {
  return [
    profile.goal,
    profile.targetRole,
    role?.role,
    ...(role?.requiredSkills || []),
    ...(profile.interests || []),
    ...(profile.currentSkills || []).map(
      (skill) => skill.name
    ),
    ...gaps,
  ]
    .filter(Boolean)
    .join(' ');
}

/* ───────────────────────────────────────────────
 * Hybrid semantic scores
 * ─────────────────────────────────────────────── */

export function semanticCourseScores(
  courses,
  profile,
  role,
  gaps = []
) {
  const documents = [
    profileText(
      profile,
      role,
      gaps
    ),
    ...courses.map(courseText),
  ];

  const tfidfVectors =
    buildTfIdf(documents);

  const profileTfIdf =
    tfidfVectors[0];

  const courseTfIdf =
    tfidfVectors.slice(1);

  const profileEmbedding =
    denseEmbedding(
      documents[0]
    );

  const scores = new Map();

  courses.forEach(
    (course, index) => {
      const tfidfScore =
        cosineSimilarity(
          profileTfIdf,
          courseTfIdf[index]
        );

      const courseEmbedding =
        denseEmbedding(
          documents[index + 1]
        );

      const embeddingScore =
        denseCosineSimilarity(
          profileEmbedding,
          courseEmbedding
        );

      /*
       * Hybrid semantic score.
       *
       * Dense embeddings receive more weight
       * because they capture broader contextual
       * similarity, while TF-IDF preserves
       * exact skill/keyword relevance.
       */
      const hybridScore =
        0.4 * tfidfScore +
        0.6 * embeddingScore;

      scores.set(
        String(
          course._id ||
            course.id ||
            course.title
        ),
        Math.max(
          0,
          Math.min(
            1,
            hybridScore
          )
        )
      );
    }
  );

  return scores;
}

/* ───────────────────────────────────────────────
 * Feedback → training examples
 * ─────────────────────────────────────────────── */

function feedbackLabel(feedback) {
  const value = String(
    feedback?.rating ??
      feedback?.feedback ??
      feedback?.difficulty ??
      ''
  ).toLowerCase();

  if (
    value.includes('perfect') ||
    value.includes('excellent') ||
    value.includes('good') ||
    value === '5' ||
    value === '4'
  ) {
    return 1;
  }

  if (
    value.includes('too hard') ||
    value.includes('too difficult') ||
    value.includes('bad') ||
    value.includes('poor') ||
    value === '1' ||
    value === '2'
  ) {
    return 0;
  }

  return null;
}

export function buildFeedbackExamples(
  profile,
  courses,
  scoreBuilder
) {
  const feedback =
    profile.feedback ||
    profile.courseFeedback ||
    [];

  const examples = [];

  for (const item of feedback) {
    const label =
      feedbackLabel(item);

    if (label === null) continue;

    const courseId =
      item.courseId ||
      item.course_id ||
      item._id;

    const course = courses.find(
      (c) =>
        String(
          c._id ||
            c.id ||
            c.title
        ) === String(courseId)
    );

    if (!course) continue;

    const score =
      scoreBuilder(course);

    examples.push({
      features: {
        skillGapMatch:
          score.skillGapMatch,

        goalRelevance:
          score.goalRelevance,

        prereqReadiness:
          score.prereqReadiness,

        userInterest:
          score.userInterest,

        learningStyleMatch:
          score.learningStyleMatch,

        semanticMatch:
          score.semanticMatch,

        languageMatch:
          score.languageMatch,

        quality:
          score.quality,
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

function featureVector(features) {
  return FEATURE_NAMES.map(
    (name) =>
      Number(features[name]) || 0
  );
}

function sigmoid(value) {
  if (value < -30) return 0;
  if (value > 30) return 1;

  return 1 / (
    1 + Math.exp(-value)
  );
}

function dotProduct(a, b) {
  let result = 0;

  for (
    let i = 0;
    i < Math.min(a.length, b.length);
    i++
  ) {
    result += a[i] * b[i];
  }

  return result;
}

export function trainPreferenceModel(
  examples = []
) {
  const weights = new Array(
    FEATURE_NAMES.length
  ).fill(0);

  let bias = 0;

  if (!examples.length) {
    return {
      trained: false,
      samples: 0,
      weights,
      bias,
    };
  }

  /*
   * Small online logistic-regression model.
   *
   * Multiple epochs allow the model to learn
   * stable preferences from a small amount
   * of learner feedback.
   */
  const learningRate = 0.08;
  const epochs = 8;

  for (
    let epoch = 0;
    epoch < epochs;
    epoch++
  ) {
    for (const example of examples) {
      const x =
        featureVector(
          example.features
        );

      const prediction =
        sigmoid(
          dotProduct(weights, x) +
            bias
        );

      const error =
        prediction -
        example.label;

      for (
        let i = 0;
        i < weights.length;
        i++
      ) {
        weights[i] -=
          learningRate *
          error *
          x[i];
      }

      bias -=
        learningRate * error;
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

export function predictPreference(
  model,
  score
) {
  if (
    !model ||
    !model.trained
  ) {
    /*
     * Cold-start prior.
     */
    return 0.5;
  }

  const x =
    featureVector(score);

  const probability =
    sigmoid(
      dotProduct(
        model.weights,
        x
      ) + model.bias
    );

  /*
   * Blend learned preference with
   * neutral prior to avoid extreme
   * scores from very small datasets.
   */
  return (
    0.7 * probability +
    0.3 * 0.5
  );
}

/* ───────────────────────────────────────────────
 * Optional external embedding adapter
 *
 * Allows replacing the local deterministic
 * embedding with a real embedding provider later.
 * ─────────────────────────────────────────────── */

export async function generateEmbedding(
  text,
  provider = null
) {
  if (
    provider &&
    typeof provider.embed ===
      'function'
  ) {
    return provider.embed(text);
  }

  return denseEmbedding(text);
}

/* ───────────────────────────────────────────────
 * Debug / evaluation helper
 * ─────────────────────────────────────────────── */

export function explainSemanticScore(
  profile,
  course,
  role,
  gaps = []
) {
  const profileDoc =
    profileText(
      profile,
      role,
      gaps
    );

  const courseDoc =
    courseText(course);

  const vectors =
    buildTfIdf([
      profileDoc,
      courseDoc,
    ]);

  const tfidf =
    cosineSimilarity(
      vectors[0],
      vectors[1]
    );

  const profileEmbedding =
    denseEmbedding(
      profileDoc
    );

  const courseEmbedding =
    denseEmbedding(
      courseDoc
    );

  const embedding =
    denseCosineSimilarity(
      profileEmbedding,
      courseEmbedding
    );

  return {
    tfidf: Math.round(
      tfidf * 1000
    ) / 1000,

    embedding: Math.round(
      embedding * 1000
    ) / 1000,

    hybrid: Math.round(
      (
        0.4 * tfidf +
        0.6 * embedding
      ) * 1000
    ) / 1000,
  };
}
