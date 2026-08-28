/**
 * LLM Service
 * -----------
 * This is the ONLY place in the backend that talks to an LLM for
 * "understanding" the user. It does two jobs:
 *   1. extractGoalProfile()  — turn free text into structured data
 *   2. explainRecommendation() — turn a score breakdown into plain English
 *
 * Uses Groq's OpenAI-compatible API (free tier) running Llama 3.3 70B.
 *
 * IMPORTANT: this service must NEVER be used to generate the actual
 * recommendations or ranking — that logic lives in
 * services/recommendation.service.js and is deterministic code, not an LLM
 * call. Keeping this boundary is what makes the AI/ML implementation real
 * instead of "a chatbot wearing a UI."
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b'; // Groq's current supported model (llama-3.3 was deprecated)

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

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Turns free-text like:
 *   "I want to become a full-stack developer in 6 months.
 *    I know basic Java and HTML but haven't touched React or Node."
 * into structured JSON the rest of the app can use.
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
 */
export async function chatWithAssistant(message, context = {}) {
  const systemPrompt = `You are SkillPilot's AI learning assistant. You help learners
understand their personalized learning path, explain recommendations, and answer
questions about their goal and progress. Keep answers concise (2-4 sentences unless
the question needs more detail). Use ONLY the context provided below — if you don't
have enough information to answer specifically, say so rather than inventing details.

Learner context:
${JSON.stringify(context, null, 2)}`;

  return callGroq(systemPrompt, message);
}

/**
 * Turns a recommendation's score breakdown into a plain-English explanation.
 * Grounded in real numbers passed in — the LLM is explaining data it's given,
 * not inventing reasons, which avoids hallucinated justifications.
 */
export async function explainRecommendation({ courseTitle, scoreBreakdown, learnerGoal }) {
  const systemPrompt = `You write short, warm, specific explanations (2-3 sentences max) for
why a course was recommended to a learner, based ONLY on the score data given.
Do not invent facts not present in the data. Be concrete, not generic.`;

  const userMessage = `Learner's goal: "${learnerGoal}"
Course: "${courseTitle}"
Score breakdown: ${JSON.stringify(scoreBreakdown)}

Write the explanation now.`;

  return callGroq(systemPrompt, userMessage);
}

export async function generateSkillAssessment(skill, learnerLevel = 'beginner') {
  const systemPrompt = `Create a fair 5-question multiple-choice assessment for the skill "${skill}" at ${learnerLevel} level.
Return ONLY valid JSON: {"questions":[{"question":string,"options":[string,string,string,string],"correctIndex":number,"explanation":string}]}.
Questions must test practical understanding, not trivia. correctIndex must be 0-3.`;
  const raw = await callGroq(systemPrompt, `Generate the assessment for ${skill}.`, { jsonMode: true });
  const parsed = JSON.parse(raw.trim());
  if (!Array.isArray(parsed.questions) || parsed.questions.length < 5) throw new Error('Invalid assessment generated');
  return { questions: parsed.questions.slice(0, 5) };
}
