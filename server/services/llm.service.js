/**
 * LLM Service
 * -----------
 * This is the ONLY place in the backend that talks to an LLM for
 * "understanding" the user. It does three jobs:
 *   1. extractGoalProfile()      — turn free text into structured data
 *   2. explainRecommendation()   — turn a score breakdown into plain English
 *   3. chatWithAssistant()       — grounded, tool-using Q&A for the AI
 *                                  Assistant page (an "AI agent": the model
 *                                  decides when to call search_courses,
 *                                  get_skill_gaps, or check_prerequisites —
 *                                  see agent.service.js — instead of
 *                                  guessing facts about the learner)
 *
 * Uses Groq's OpenAI-compatible API (free tier), currently the gpt-oss-120b
 * model (Groq deprecated llama-3.3-70b-versatile on 2026-06-17 in favor of
 * this as the recommended replacement).
 *
 * IMPORTANT: this service must NEVER be used to generate the actual
 * recommendations or ranking — that logic lives in
 * services/recommendation.service.js and is deterministic code, not an LLM
 * call. chatWithAssistant()'s search_courses tool uses a separate,
 * lightweight retrieval path (rag.service.js — plain embedding similarity)
 * rather than that ranking pipeline, so this boundary holds even with tool
 * use added. Keeping this boundary is what makes the AI/ML implementation
 * real instead of "a chatbot wearing a UI."
 *
 * RESILIENCE: a transient Groq failure (rate limit, timeout, 5xx) should
 * never surface as a raw 500 to the learner. callGroq()/callGroqWithTools()
 * retry retryable failures with exponential backoff + jitter under a hard
 * timeout; callers that produce "nice to have" text (chat, explanations)
 * fall back to a clear, honest message instead of throwing, while callers
 * that need structured data (goal extraction, assessment generation) still
 * throw after retries are exhausted, since guessing structured data
 * silently would be worse than a visible error.
 */

import { validateAssessmentQuestions } from './assessment.service.js';
import { AGENT_TOOLS, executeAgentTool } from './agent.service.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b'; // llama-3.3-70b-versatile was deprecated by Groq on 2026-06-17; this is Groq's recommended replacement

const REQUEST_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 12000;
const MAX_RETRIES = Number(process.env.LLM_MAX_RETRIES) || 2;
const BASE_BACKOFF_MS = 400;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 429 and 5xx are worth retrying; 4xx (bad key, bad request) generally are
 * not — except Groq's json_validate_failed, which is a 400 but represents
 * the model failing to generate valid JSON on that attempt (documented as
 * an intermittent ~10% failure rate even with strict structured outputs),
 * not a problem with the request itself. A retry with the same prompt
 * frequently succeeds.
 */
function isRetryableStatus(status, code) {
  return status === 429 || status >= 500 || (status === 400 && code === 'json_validate_failed');
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
      // Groq's JSON/structured-output modes return a 400 with
      // code: "json_validate_failed" when the model itself fails to produce
      // valid JSON (often because a reasoning model like gpt-oss-120b ran
      // out of max_tokens mid chain-of-thought). This is an intermittent
      // generation failure, not a malformed-request problem on our end, so
      // callers need the code to decide whether it's worth retrying.
      try {
        error.code = JSON.parse(errText)?.error?.code;
      } catch {
        // errText wasn't JSON — leave error.code undefined
      }
      throw error;
    }

    const data = await response.json();
    return data.choices?.[0]?.message || { role: 'assistant', content: '' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Shared retry loop (exponential backoff + jitter under a hard timeout) —
 * used by both callGroq() (single system+user prompt, returns text) and
 * callGroqWithTools() (multi-turn + function-calling, returns the full
 * message object). Centralizing this means the agent loop gets the exact
 * same resilience guarantees as the three original LLM jobs, for free.
 */
async function callGroqRaw(body) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error(
      'LLM_API_KEY is not set in server/.env — get a free key from console.groq.com and add it there.'
    );
  }

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await requestGroqOnce(apiKey, body, REQUEST_TIMEOUT_MS);
    } catch (err) {
      lastError = err;

      const isTimeout = err.name === 'AbortError';
      const isNetworkError = !err.status && !isTimeout;
      const retryable = isTimeout || isNetworkError || isRetryableStatus(err.status, err.code);

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

async function callGroq(
  systemPrompt,
  userMessage,
  { jsonMode = false, jsonSchema = null, maxTokens = 1024, reasoningEffort = null } = {}
) {
  const body = {
    model: MODEL,
    // gpt-oss-120b is a reasoning model — it spends tokens on hidden
    // chain-of-thought before writing the actual answer. If max_tokens
    // runs out mid-reasoning there's nothing left for the response, which
    // for JSON-mode calls surfaces as a 400 json_validate_failed with an
    // empty failed_generation. Callers that need JSON should pass a higher
    // maxTokens to leave room for both.
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  };
  // Lower reasoning effort leaves more of the token budget for the actual
  // output instead of internal chain-of-thought — only supported by the
  // gpt-oss reasoning models, and mainly useful for jsonMode calls where
  // truncated reasoning is what causes invalid JSON.
  if (reasoningEffort) {
    body.reasoning_effort = reasoningEffort;
  }
  if (jsonSchema) {
    // Structured Outputs: constrained decoding guarantees the response
    // matches the schema (Groq docs) — more reliable than plain json_object
    // for the fixed shapes our callers actually need.
    body.response_format = { type: 'json_schema', json_schema: jsonSchema };
  } else if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const message = await callGroqRaw(body);
  return message.content || '';
}

/**
 * Multi-turn, function-calling variant of callGroq(), used only by the AI
 * Assistant's agent loop (see chatWithAssistant() below). Accepts a full
 * `messages` array (system + user + any prior assistant/tool turns) and a
 * `tools` schema (OpenAI/Groq function-calling format), and returns the
 * full assistant message object — including `tool_calls` when the model
 * wants to call a tool, since a tool-calling turn's `content` is often
 * empty and the interesting part is which tool it asked for.
 */
async function callGroqWithTools(messages, tools, { maxTokens = 800, toolChoice = 'auto' } = {}) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    messages,
    tools,
    tool_choice: toolChoice,
  };
  return callGroqRaw(body);
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
const MAX_AGENT_STEPS = 4;

/**
 * Grounded, tool-using Q&A for the AI Assistant page.
 *
 * This is a small AI agent: rather than answering purely from the context
 * object + its own knowledge, the model is given a fixed toolbox
 * (AGENT_TOOLS — search_courses, get_skill_gaps, check_prerequisites; see
 * agent.service.js) and decides per-turn whether it needs to call one
 * before it can answer accurately. Tool execution is 100% deterministic —
 * the model can only relay what a tool actually returned, so it can't
 * invent course names, skill gaps, or prerequisites even though it's now
 * "acting" rather than just responding to one prompt.
 *
 * Loop: ask the model → if it asks for a tool, run the tool and feed the
 * result back as a new turn → repeat (capped at MAX_AGENT_STEPS) → once it
 * responds without requesting a tool, that's the final answer.
 */
export async function chatWithAssistant(message, context = {}) {
  const systemPrompt = `You are SkillPilot's AI learning assistant. You help learners
understand their personalized learning path, explain recommendations, and answer
questions about their goal and progress. Keep answers concise (2-4 sentences unless
the question needs more detail).

You have tools that look up the learner's REAL data (their actual skill gaps,
course catalog matches, and prerequisite chains). Whenever a question needs a
specific fact — a course name, a skill gap, a prerequisite — call the
relevant tool instead of guessing. Never invent course titles, skill names,
or prerequisites that a tool did not return to you. If a tool reports
nothing found, say so honestly rather than making something up.

Learner context (already known, no tool needed for this):
${JSON.stringify(context, null, 2)}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
  ];

  try {
    for (let step = 0; step < MAX_AGENT_STEPS; step++) {
      const assistantMessage = await callGroqWithTools(messages, AGENT_TOOLS, { maxTokens: 700 });

      if (!assistantMessage.tool_calls || !assistantMessage.tool_calls.length) {
        return assistantMessage.content || "I couldn't come up with a response — try rephrasing your question.";
      }

      // Record the assistant's tool-call turn before appending results —
      // Groq/OpenAI's chat format requires this turn to exist so the
      // following 'tool' messages have something to respond to.
      messages.push({
        role: 'assistant',
        content: assistantMessage.content || null,
        tool_calls: assistantMessage.tool_calls,
      });

      for (const call of assistantMessage.tool_calls) {
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {
          // Malformed arguments from the model — proceed with {} rather
          // than failing the whole turn; most tools handle empty args
          // gracefully (e.g. "no query provided").
        }

        let result;
        try {
          result = await executeAgentTool(call.function.name, args, context);
        } catch (err) {
          result = { error: `Tool "${call.function.name}" failed: ${err.message}` };
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Hit the step cap without a final answer — force one more call with
    // tool use disabled so the learner still gets a reply instead of
    // silence, using whatever tool results were already gathered above.
    const finalMessage = await callGroqWithTools(messages, AGENT_TOOLS, {
      maxTokens: 700,
      toolChoice: 'none',
    });
    return finalMessage.content || "I wasn't able to finish looking that up — could you narrow the question?";
  } catch (err) {
    console.error('chatWithAssistant (agent) failed after retries:', err.message);
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
// Note: deliberately no minItems/maxItems/minimum/maximum here. Groq's
// strict structured-output engine is OpenAI-compatible, and array-length /
// numeric-range constraints are a documented gap in that engine (they're
// accepted in the schema but not actually enforced, and have caused schema
// validation errors on other OpenAI-compatible providers). We ask for the
// right shape in the prompt and keep the exact-count / range enforcement in
// validateAssessmentQuestions() below, which already throws a clear,
// specific error if the model gets those wrong.
const ASSESSMENT_JSON_SCHEMA = {
  name: 'skill_assessment',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            options: {
              type: 'array',
              items: { type: 'string' },
            },
            correctIndex: { type: 'integer' },
            explanation: { type: 'string' },
          },
          required: ['question', 'options', 'correctIndex', 'explanation'],
          additionalProperties: false,
        },
      },
    },
    required: ['questions'],
    additionalProperties: false,
  },
};

export async function generateSkillAssessment(skill, learnerLevel = 'beginner') {
  const systemPrompt = `Create a fair 5-question multiple-choice assessment for the skill "${skill}" at ${learnerLevel} level.
Return ONLY valid JSON: {"questions":[{"question":string,"options":[string,string,string,string],"correctIndex":number,"explanation":string}]}.
Questions must test practical understanding, not trivia. correctIndex must be 0-3.`;
  const raw = await callGroq(systemPrompt, `Generate the assessment for ${skill}.`, {
    jsonSchema: ASSESSMENT_JSON_SCHEMA,
    // Leave real headroom beyond the default 1024: this model reasons
    // before writing JSON, and 5 questions + options + explanations is a
    // few hundred tokens of actual output on top of that reasoning.
    maxTokens: 2048,
    reasoningEffort: 'low',
  });

  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch (err) {
    throw new Error(`LLM returned non-JSON output for assessment, could not parse: ${raw.slice(0, 200)}`);
  }

  return validateAssessmentQuestions(parsed);
}

