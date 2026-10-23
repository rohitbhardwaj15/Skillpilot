/**
 * rag.service.js
 * --------------
 * Retrieval-Augmented Generation for the AI Assistant.
 *
 * Given a learner's free-text question, this retrieves the most
 * semantically relevant course documents from the catalog — using the same
 * dense-embedding layer already used for recommendations (see
 * ml.service.js, including its local deterministic fallback when no
 * embedding provider is configured) — and returns them as small, citable
 * context snippets.
 *
 * This is genuine retrieve-then-generate grounding: the LLM is expected to
 * answer using ONLY what was retrieved here, not the whole 1,324-course
 * catalog stuffed into a prompt (which wouldn't fit in a context window
 * anyway) and not its own training-data guesses about course names.
 *
 * Kept separate from ml.service.js on purpose — that file's documented job
 * is "produce recommendation *features*, never text"; this file's whole
 * job is retrieving text to feed into a generation step, which is a
 * different concern with a different caller (the chat agent, not the
 * ranking pipeline).
 */
import Course from '../models/Course.js';
import { resolveEmbedding, denseCosineSimilarity, courseText } from './ml.service.js';

const CATALOG_FIELDS = 'title description skills level url youtube_url is_free language prerequisites';
const CATALOG_CACHE_TTL_MS = 10 * 60_000;

let catalogCache = null;
let catalogCacheAt = 0;

async function getCatalog() {
  if (catalogCache && Date.now() - catalogCacheAt < CATALOG_CACHE_TTL_MS) {
    return catalogCache;
  }
  catalogCache = await Course.find({}, CATALOG_FIELDS).lean();
  catalogCacheAt = Date.now();
  return catalogCache;
}

/**
 * Retrieves the top-K most semantically relevant courses for a free-text
 * query. Uses resolveEmbedding()'s cache, so repeated queries (or queries
 * that overlap with courses already embedded elsewhere in the process)
 * don't re-hit an embedding provider.
 */
export async function retrieveRelevantCourses(query, { topK = 5, language = null } = {}) {
  if (!query || !query.trim()) return [];

  const catalog = await getCatalog();
  const pool = language ? catalog.filter((c) => c.language === language) : catalog;
  if (!pool.length) return [];

  const queryEmbedding = await resolveEmbedding(query);

  const scored = await Promise.all(
    pool.map(async (course) => {
      const embedding = await resolveEmbedding(courseText(course));
      return { course, score: denseCosineSimilarity(queryEmbedding, embedding) };
    })
  );

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    // Drop near-zero matches rather than force-feeding the LLM noise when
    // nothing in the catalog is actually relevant to the query.
    .filter((entry) => entry.score > 0.05)
    .map(({ course, score }) => ({
      title: course.title,
      description: course.description || '',
      skills: course.skills || [],
      level: course.level,
      prerequisites: course.prerequisites || [],
      url: course.url || course.youtube_url || '',
      isFree: Boolean(course.is_free),
      relevance: Math.round(score * 1000) / 1000,
    }));
}

/** Invalidates the in-memory catalog cache — call after re-seeding courses. */
export function clearRagCatalogCache() {
  catalogCache = null;
  catalogCacheAt = 0;
}
