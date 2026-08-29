/**
 * LLM Service
 * -----------
 * This is the ONLY place in the backend that talks to an LLM for
 * "understanding" the user. It does three jobs:
 *   1. extractGoalProfile()      — turn free text into structured data
 *   2. explainRecommendation()   — turn a score breakdown into plain English
 *   3. chatWithAssistant()       — grounded Q&A for the AI Assistant page
 *
 * Uses Groq's OpenAI-compatible API (free tier) running Llama 3.3 70B.
 *
 * IMPORTANT: this service must NEVER be used to generate the actual
 * recommendations or ranking — that logic lives in
 * services/recommendation.service.js and is deterministic code, not an LLM
 * call. Keeping this boundary is what makes the AI/ML implementation real
 * instead of "a chatbot wearing a UI."
 *
 * RESILIENCE: a transient Groq failure (rate limit, timeout, 5xx) should
 * never surface as a raw 500 to the learner. callGroq() retries retryable
 * failures with exponential backoff + jitter under a hard timeout; callers
 * that produce "nice to have" text (chat, explanations) fall back to a
 * clear, honest message instead of throwing, while callers that need
 * structured data (goal extraction, assessment generation) still throw
 * after retries are exhausted, since guessing structured data silently
 * would be worse than a visible error.
 */

import { validateAssessmentQuestions } from './assessment.service.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b'; // llama-3.3-70b-versatile was deprecated by Groq on 2026-06-17; this is Groq's recommended replacement

const REQUEST_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 12000;
const MAX_RETRIES = Number(process.env.LLM_MAX_RETRIES) || 2;
const BASE_BACKOFF_MS = 400;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 429 and 5xx are worth retrying; 4xx (bad key, bad request) are not. */
function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

async function requestGroqOnce(apiKey, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const error = new Error(`LLM API error (${response.status}): ${errText.slice(0, 300)}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

async function callGroq(systemPrompt, userMessage, { jsonMode = false } = {}) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error(
      'LLM_API_KEY is not set in server/.env — get a free key from console.groq.com and add it there.'
    );
  }

  const body = {
    model: MODEL,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await requestGroqOnce(apiKey, body, REQUEST_TIMEOUT_MS);
    } catch (err) {
      lastError = err;

      const isTimeout = err.name === 'AbortError';
      const isNetworkError = !err.status && !isTimeout;
      const retryable = isTimeout || isNetworkError || isRetryableStatus(err.status);

      if (!retryable || attempt === MAX_RETRIES) {
        throw isTimeout ? new Error(`LLM request timed out after ${REQUEST_TIMEOUT_MS}ms`) : err;
      }

      // Exponential backoff with jitter, so a burst of retries doesn't
      // itself look like a thundering-herd retry storm to Groq.
      const backoff = BASE_BACKOFF_MS * 2 ** attempt + Math.random() * 200;
      console.warn(`LLM call failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${Math.round(backoff)}ms:`, err.message);
      await sleep(backoff);
    }
  }

  throw lastError;
}

/**
 * Turns free-text like:
 *   "I want to become a full-stack developer in 6 months.
 *    I know basic Java and HTML but haven't touched React or Node."
 * into structured JSON the rest of the app can use.
 *
 * Throws on failure — silently guessing a learner's goal/skills would be
 * worse than a visible, actionable error on this endpoint.
 */
export async function extractGoalProfile(goalText) {
  const systemPrompt = `You extract structured learner data from natural language.
Respond with ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "targetRole": string,              // e.g. "Full Stack Developer"
  "timelineMonths": number,          // best estimate, default 6 if not mentioned
  "currentSkills": [
    { "name": string, "level": "none" | "beginner" | "intermediate" | "advanced" }
  ]
}
If the learner doesn't mention a skill, don't include it. Be conservative — only extract what is actually stated or strongly implied.`;

  const raw = await callGroq(systemPrompt, goalText, { jsonMode: true });

  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch (err) {
    throw new Error(`LLM returned non-JSON output, could not parse: ${raw.slice(0, 200)}`);
  }

  // Defensive validation — never trust LLM output blindly
  if (!parsed.targetRole || !Array.isArray(parsed.currentSkills)) {
    throw new Error('LLM output missing required fields (targetRole, currentSkills)');
  }

  return {
    targetRole: parsed.targetRole,
    timelineMonths: parsed.timelineMonths || 6,
    currentSkills: parsed.currentSkills,
  };
}

/**
 * General-purpose chat for the AI Assistant page. Grounded in the learner's
 * real profile/path context (passed in), so answers reference their actual
 * goal and progress instead of generic advice.
 *
 * Falls back to an honest, clearly-labeled message on failure rather than
 * throwing — a transient Groq outage shouldn't break the whole chat UI.
 */
export async function chatWithAssistant(message, context = {}) {
  const systemPrompt = `You are SkillPilot's AI learning assistant. You help learners
understand their personalized learning path, explain recommendations, and answer
questions about their goal and progress. Keep answers concise (2-4 sentences unless
the question needs more detail). Use ONLY the context provided below — if you don't
have enough information to answer specifically, say so rather than inventing details.

Learner context:
${JSON.stringify(context, null, 2)}`;

  try {
    return await callGroq(systemPrompt, message);
  } catch (err) {
    console.error('chatWithAssistant failed after retries:', err.message);
    return "I'm having trouble reaching the assistant service right now. Please try again in a moment — your progress and roadmap are unaffected.";
  }
}

/**
 * Turns a recommendation's score breakdown into a plain-English explanation.
 * Grounded in real numbers passed in — the LLM is explaining data it's given,
 * not inventing reasons, which avoids hallucinated justifications.
 *
 * Falls back to a deterministic, data-derived sentence on failure, so a
 * course card never ends up with a broken or missing explanation.
 */
export async function explainRecommendation({ courseTitle, scoreBreakdown, learnerGoal }) {
  const systemPrompt = `You write short, warm, specific explanations (2-3 sentences max) for
why a course was recommended to a learner, based ONLY on the score data given.
Do not invent facts not present in the data. Be concrete, not generic.`;

  const userMessage = `Learner's goal: "${learnerGoal}"
Course: "${courseTitle}"
Score breakdown: ${JSON.stringify(scoreBreakdown)}

Write the explanation now.`;

  try {
    return await callGroq(systemPrompt, userMessage);
  } catch (err) {
    console.error('explainRecommendation failed after retries:', err.message);
    const strongest = Object.entries(scoreBreakdown || {})
      .filter(([key]) => key !== 'totalScore' && key !== 'deterministicScore')
      .sort(([, a], [, b]) => Number(b) - Number(a))[0]?.[0];
    return strongest
      ? `Recommended primarily for its strong "${strongest.replace(/([A-Z])/g, ' $1').toLowerCase()}" match with your goal.`
      : `Recommended based on your current skill gaps and target role.`;
  }
}

/**
 * Generates a 5-question skill assessment. Throws on failure — a partially
 * or incorrectly generated assessment would silently produce a broken quiz,
 * which is worse than a visible retry/error at creation time.
 *
 * The raw LLM output is run through validateAssessmentQuestions() so a
 * malformed response (wrong option count, out-of-range correctIndex, a
 * missing field) is caught here with a clear error instead of reaching the
 * database or the learner's screen half-broken.
 */
export async function generateSkillAssessment(skill, learnerLevel = 'beginner') {
  const systemPrompt = `Create a fair 5-question multiple-choice assessment for the skill "${skill}" at ${learnerLevel} level.
Return ONLY valid JSON: {"questions":[{"question":string,"options":[string,string,string,string],"correctIndex":number,"explanation":string}]}.
Questions must test practical understanding, not trivia. correctIndex must be 0-3.`;
  const raw = await callGroq(systemPrompt, `Generate the assessment for ${skill}.`, { jsonMode: true });

  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch (err) {
    throw new Error(`LLM returned non-JSON output for assessment, could not parse: ${raw.slice(0, 200)}`);
  }

  return validateAssessmentQuestions(parsed);
}

