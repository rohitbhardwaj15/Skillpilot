/**
 * LLM Service
 * -----------
 * This is the ONLY place in the backend that talks to an LLM for
 * "understanding" the user. It does two jobs:
 *   1. extractGoalProfile()  — turn free text into structured data
 *   2. explainRecommendation() — turn a score breakdown into plain English
 *
 * IMPORTANT: this service must NEVER be used to generate the actual
 * recommendations or ranking — that logic lives in
 * services/recommendation.service.js and is deterministic code, not an LLM
 * call. Keeping this boundary is what makes the AI/ML implementation real
 * instead of "ChatGPT wearing a UI."
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6'; // swap for whichever model your API key has access to

async function callClaude(systemPrompt, userMessage) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error(
      'LLM_API_KEY is not set in server/.env — get one from console.anthropic.com and add it there.'
    );
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b) => b.type === 'text');
  return textBlock?.text || '';
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

  const raw = await callClaude(systemPrompt, goalText);

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

  return callClaude(systemPrompt, userMessage);
}
