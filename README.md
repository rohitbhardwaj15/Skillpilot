# SkillPilot

**AI-Powered Personalized Learning Path Recommender** — HCL Hackathon Round 2

> We don't recommend content — we build and continuously adapt a real learning journey.

## Problem

Online learning platforms offer thousands of courses, but learners struggle to
identify the right *sequence* of resources to reach a specific goal. A
one-size-fits-all recommendation approach ignores each learner's current skill
level, interests, and pace.

## Solution

SkillPilot takes a learner's goal in natural language, builds a structured
profile, identifies skill gaps against that goal, and generates a personalized,
ordered learning roadmap — with an explanation for every recommendation, and
continuous adaptation based on feedback and progress.

```
GOAL → PROFILE → SKILL GAPS → RECOMMEND → ROADMAP → LEARN → ASSESS → FEEDBACK → ADAPT
```

## Status

🚧 Day 1-2 of 16 — project scaffold complete. See `/docs/PROGRESS.md` for the build log.

## Architecture

```
React (client)  ──────►  Node/Express (server)  ──────►  MongoDB
   │                          │
   ├─ Chat / Onboarding       ├─ Profile Engine
   ├─ 3D Roadmap (Three.js)   ├─ Recommendation Engine  (scoring formula, not LLM)
   ├─ Dashboard               ├─ AI Assistant           (LLM: goal parsing + explanations only)
```

The LLM is used ONLY to (1) turn a learner's free-text goal into structured
data, and (2) turn a recommendation's score breakdown into a plain-English
explanation. The actual skill-gap analysis, scoring, and prerequisite ordering
are deterministic code — this is what makes the AI/ML implementation real
rather than a ChatGPT wrapper.

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS v3, Redux Toolkit, Framer Motion, React Three Fiber, Recharts
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB (Atlas in production)
- **Auth:** JWT sessions, bcrypt-hashed passwords
- **AI:** Groq API (Llama-family models via OpenAI-compatible endpoint) for goal-understanding, explanations, and the AI Assistant chat

## Pages

- **Landing** — hero, live course count (fetched, not hardcoded), how-it-works, features
- **Login / Register** — real JWT authentication
- **Onboarding** — conversational goal capture, feeds real AI goal-analysis + profile creation + roadmap generation
- **Dashboard** — real phase-progress chart, real skill radar, real skill gaps, dynamic next action
- **Learning Paths** — Timeline and 3D views of the real generated roadmap
- **Recommendations** — full course catalog with real filters, "fills a skill gap" tags computed from real data
- **AI Assistant** — real Groq-backed chat, grounded in the learner's actual profile/progress
- **Profile** — real profile data, editable, auto-saves on change

## Project Structure

```
skillpilot/
├── client/          React frontend
├── server/          Node/Express backend
│   ├── models/       Mongoose schemas (Profile, Course, Skill)
│   ├── routes/        API routes
│   ├── config/         DB connection
│   └── scripts/seed.js  Loads data/courses.json into MongoDB
├── data/            courses.json — curated learning resource dataset
└── docs/            Documentation, progress log
```

## Running Locally

### 1. Backend
```bash
cd server
npm install
cp .env.example .env   # then fill in MONGODB_URI and LLM_API_KEY
npm run dev             # starts on http://localhost:5000
node scripts/seed.js    # loads the course dataset (run once)
```

### 2. Frontend
```bash
cd client
npm install
npm run dev              # starts on http://localhost:5173
```

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas (or local) connection string |
| `PORT` | Backend port (default 5000) |
| `LLM_API_KEY` | Free API key from console.groq.com — used for goal analysis, explanations, and AI Assistant chat |
| `JWT_SECRET` | Any long random string — signs login sessions. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

## Roadmap / Build Plan

See `/docs/PROGRESS.md` for the full 16-day plan and day-by-day log.

## Future Scope

- Job-market skill demand integration
- Resume-based skill extraction
- Peer benchmarking and mentor matching


## 🧠 AI/ML v2 — Hybrid Recommendation Intelligence

SkillPilot now contains a genuine lightweight ML layer instead of relying only on an LLM + manually weighted rules.

### End-to-end intelligence pipeline

```text
Natural-Language Goal
        ↓
LLM Goal / Skill Extraction
        ↓
Learner Profile + Target Role
        ↓
TF-IDF Semantic Vectorization
        ↓
Cosine Similarity: Learner ↔ Course
        ↓
Skill-Gap + Prerequisite + Preference Features
        ↓
Online Logistic-Regression Preference Model
        ↓
Hybrid Recommendation Score
        ↓
Prerequisite-Safe Roadmap
        ↓
Diversity / Skill-Coverage Optimization
        ↓
Learning + Feedback
        ↓
Retrain Learner Preference Model
        ↓
Re-ranked Roadmap
```

### 1. Semantic matching instead of exact keyword matching

The recommendation engine vectorizes the learner context and course metadata using **TF-IDF** and compares them with **cosine similarity**. This gives the system a vector-space semantic signal so related wording can contribute to relevance even when exact skill tags do not match.

The semantic representation includes:

- learner goal
- target role
- required skills
- skill gaps
- current skills
- interests
- learning style
- course title and description
- course skills
- prerequisites
- resource type and language

### 2. Learned personalization from real feedback

The system maintains a small **online logistic-regression preference model** for each learner's historical feedback.

```text
Good / Perfect  → positive training signal
Too Easy / Hard → negative-fit training signal
```

The model learns from recommendation features such as:

- skill-gap match
- goal relevance
- prerequisite readiness
- learning preference
- learning-level fit
- semantic similarity
- language match

This means personalization can evolve from a cold-start prior into a learner-specific preference model as feedback accumulates.

### 3. Safe hybrid scoring

The learned model is intentionally blended with deterministic signals rather than replacing them.

```text
75% deterministic relevance / safety signals
+
25% learned learner preference
=
Hybrid recommendation score
```

Hard constraints such as prerequisites and course filters remain explicit and testable.

### 4. Explainability

Each recommendation exposes both the deterministic components and ML signals:

```text
Skill Gap Match
Goal Relevance
Prerequisite Readiness
Learning Preference
Learning-Level Match
Semantic Match
Language Match
Learned Preference
Final Score
```

The LLM is then used to explain these measured signals instead of inventing a recommendation reason.

### 5. ML evaluation tests

The backend includes tests for:

- semantic relevance
- cosine similarity normalization
- feedback-model training
- positive-vs-negative preference prediction
- recommendation ranking
- prerequisite safety
- feedback adaptation
- role matching

Run everything with:

```bash
cd server
npm test
```

> **Important:** SkillPilot does not claim to be a large-scale deep-learning recommender. Its ML layer is intentionally lightweight, explainable, dependency-free and suitable for a hackathon prototype. The architecture can later replace TF-IDF with transformer embeddings and replace online logistic regression with a larger learned ranking model without changing the rest of the recommendation pipeline.

## 🧠 Evidence-Backed Learner Intelligence

SkillPilot maintains an evolving **Learner Knowledge State** instead of treating self-reported skills as permanent truth.

For each skill the system tracks:

```text
Skill
Mastery level (0–1)
Confidence (0–1)
Evidence history
Last updated
```

Evidence can come from:

- Self-reported skill
- AI-generated skill assessment
- Course completion
- Time spent learning
- Learner feedback

### Adaptive knowledge update

```text
Self Report
    +
Assessment Score
    +
Course Completion
    +
Time Spent
    +
Learner Feedback
          ↓
   Learner Knowledge State
          ↓
   Skill Gap Recalculation
          ↓
   Recommendation Re-ranking
```

### 🧪 AI-generated Skill Assessments

Learners can take a five-question assessment for a skill. SkillPilot generates practical multiple-choice questions using the configured LLM, grades them deterministically on the server, and converts the result into evidence for the learner model.

Example:

```text
React Assessment

Score: 80%
Estimated Level: Intermediate
Confidence: 85%

Evidence:
✓ Quiz score
✓ Course completion
✓ Learning feedback
```

The assessment result is not cosmetic: it updates the learner profile and can change subsequent skill-gap detection and recommendations.

### 🔄 Multi-signal feedback adaptation

Feedback is now treated as evidence rather than a hard overwrite:

```text
Too Easy  → increases mastery estimate
Too Hard  → decreases mastery estimate
Good      → moderate positive evidence
Perfect   → strong positive evidence
```

Completion and learning time provide additional evidence. This prevents one feedback event from completely replacing the learner's history.

### 🔬 Why this is stronger AI/ML

The recommendation pipeline now combines:

1. **LLM/NLP** — understands natural-language goals and generates assessments/explanations.
2. **Semantic ML** — TF-IDF + cosine similarity for content/goal matching.
3. **Supervised personalization** — online logistic regression learns from learner feedback.
4. **Learner modeling** — evidence-weighted mastery and confidence are updated over time.
5. **Deterministic optimization** — prerequisite ordering and skill-coverage optimization keep the final roadmap safe and useful.

This creates a closed loop:

```text
Goal → Learner Model → Recommendation → Learning → Evidence → Learner Model Update → Re-ranking
```

### New API

```http
POST /api/assessment/start
POST /api/assessment/:id/submit
```

The frontend also includes a dedicated `/assessment` experience and a dashboard panel showing evidence-backed skill mastery and confidence.

## 🔒 Production Security & Reliability

SkillPilot now includes:

- 2-hour short-lived access JWTs with issuer validation
- 30-day rotating refresh tokens stored as SHA-256 hashes in MongoDB
- Logout-based refresh-token revocation
- Per-IP global rate limiting
- Stricter rate limits on authentication and AI endpoints
- Request body size limits (`100kb`)
- CORS allow-listing via `CLIENT_URLS` in production
- Security headers including CSP, frame protection, MIME sniffing protection and referrer policy
- Ownership checks so users cannot read or mutate another learner's profile/path/assessment
- Input length validation on expensive AI endpoints

> For horizontally scaled production deployments, replace the in-memory rate limiter with a shared Redis-backed limiter.

## ⚡ AI Cost & Performance Controls

Natural-language goal analysis uses a short-lived server-side cache. Repeated identical goal requests can reuse the structured result instead of creating another LLM request.

The architecture intentionally keeps deterministic recommendation work outside the LLM so most ranking, prerequisite and roadmap operations do not consume model tokens.

```text
Goal Request
    ↓
Short-lived Cache
    ├── HIT → Reuse structured result
    └── MISS → LLM → Cache result
```

## 🎯 Career Readiness & Next Best Action

The dashboard now exposes an evidence-backed career readiness score derived from the learner's knowledge state against the target role's required skills.

```text
Target Role
    ↓
Required Skills
    ↓
Learner Mastery + Confidence
    ↓
Career Readiness %
    ↓
Biggest Remaining Gap
    ↓
Next Best Action
```

The Next Best Action identifies the most important current learning step instead of presenting another undifferentiated course list.

## 🧪 End-to-End API Verification

Run the lightweight contract/security smoke test:

```bash
cd server
npm run test:api
```

For a full database-backed end-to-end test against a running deployment:

```bash
E2E_BASE_URL=https://your-api.example.com npm run test:api
```

The full flow verifies:

1. Health endpoint
2. Registration
3. Access + refresh token issuance
4. Refresh-token rotation
5. Profile creation and persistence
6. Learning-path generation
7. Career insights endpoint
8. Path persistence
9. Course progress + learner evidence update
10. Feedback endpoint
11. Logout and refresh-token revocation

## 📊 AI Recommendation Evaluation

The recommender evaluation remains available through:

```bash
npm run evaluate
```

Results are written to `docs/recommendation-evaluation.json` and can be used in the hackathon presentation to demonstrate measurable recommendation quality rather than relying only on unit-test assertions.
