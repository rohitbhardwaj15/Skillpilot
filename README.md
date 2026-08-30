# 🚀 SkillPilot

### AI-Powered, Skill-Gap-Aware Personalized Learning Paths

**SkillPilot** is an AI-powered personalized learning platform that transforms a learner's career goal into an **evidence-based, prerequisite-safe, and continuously adaptive learning roadmap**.

Instead of simply asking an LLM to recommend courses, SkillPilot combines **skill-gap analysis, prerequisite modeling, TF-IDF, semantic embeddings, online learner-preference learning, and diversity-aware ranking** to determine what a learner should learn next.

The roadmap doesn't end after generation.

As learners **complete courses, take assessments, and provide feedback**, SkillPilot updates their knowledge state and adapts future recommendations.

---

## 🎯 The Problem

Most online learning platforms provide either:

* Generic course recommendations
* Static learning paths
* Keyword-based search
* LLM-generated roadmaps without dependency validation
* Recommendations that never learn from the learner's actual progress

This creates a common problem:

> **Learners know where they want to go, but not exactly what they need to learn next.**

SkillPilot solves this by connecting:

**Career Goal → Required Skills → Skill Gaps → Courses → Prerequisites → Learning Path → Assessment → Feedback → Adaptation**

---

## 💡 What Makes SkillPilot Different?

### 1. The LLM Does Not Control Recommendations

The LLM is deliberately restricted to two tasks:

* Understanding free-text learner goals
* Generating natural-language explanations

It **does not rank courses**.

Course ranking is performed by deterministic recommendation code, making the system:

* Reproducible
* Explainable
* Debuggable
* Testable
* Evaluatable

This avoids the common "LLM wrapper" approach where an LLM decides the entire recommendation pipeline.

---

### 2. Hybrid Recommendation Engine

SkillPilot combines multiple signals instead of relying on a single recommendation technique:

| Signal                   | Purpose                                               |
| ------------------------ | ----------------------------------------------------- |
| Skill-gap matching       | Prioritizes missing skills                            |
| Goal relevance           | Measures alignment with learner objective             |
| Prerequisite readiness   | Avoids recommending courses too early                 |
| TF-IDF similarity        | Captures lexical relevance                            |
| Dense embeddings         | Captures semantic similarity                          |
| Learner preference model | Learns from individual feedback                       |
| Learning style           | Matches video/project/reading/interactive preferences |
| Language preference      | Supports multilingual learning                        |
| Resource quality         | Accounts for course quality                           |
| MMR diversity            | Prevents repetitive recommendations                   |

The result is a **hybrid, explainable recommendation system** rather than a single-model recommender.

---

# ✨ Features

## 🧠 Goal Understanding

### Free-Text Goal Parsing

Learners can describe their goal naturally:

> "I want to become a full-stack developer in 6 months. I know basic HTML and Java."

The LLM converts this into a structured learner profile containing:

* Target role
* Timeline
* Current skills
* Learning context

Defensive validation ensures the application never blindly trusts raw LLM output.

### Shorthand Goal Expansion

SkillPilot recognizes **30+ common exam and career shorthands**, including:

* IAS
* CA
* JEE
* CAT
* GATE
* IELTS
* And more

Short inputs are expanded into meaningful descriptions before processing.

### Intelligent Role Matching

Free-text career goals are matched against **64 curated career roles** using aliases and whole-word/phrase matching.

The matcher specifically protects against false positives such as:

```text
CA
```

incorrectly matching:

```text
ethiCA l
```

---

# 📊 Evidence-Based Skill Modeling

SkillPilot doesn't permanently trust a learner's self-reported skill level.

Each skill maintains:

* Mastery score
* Confidence
* Assessment evidence
* Course completion evidence
* Feedback evidence

For example:

```text
Learner claims:
React → Intermediate

Assessment:
Low score

Feedback:
Course was too hard

Updated state:
React mastery ↓
React confidence ↓
```

This creates a continuously evolving representation of the learner's actual knowledge.

---

# 🎯 Skill Gap Analysis

The system compares:

```text
Learner's current knowledge
             ↓
Required skills for target role
             ↓
Missing / weak skills
             ↓
Prioritized skill gaps
```

These gaps become one of the strongest signals in the recommendation engine.

---

# 🤖 Recommendation Engine

SkillPilot uses a deterministic hybrid scoring pipeline.

### Recommendation flow

```text
Learner Profile
      ↓
Skill Gap Detection
      ↓
Candidate Course Retrieval
      ↓
Feature Scoring
      ↓
Hybrid Ranking
      ↓
MMR Diversity Re-ranking
      ↓
Explainability
      ↓
Final Recommendations
```

The ranking considers:

* Skill coverage
* Goal relevance
* Prerequisite readiness
* Semantic similarity
* Lexical similarity
* Learner preferences
* Language
* Learning style
* Resource quality
* Diversity

---

# 🧠 Personalized Preference Learning

SkillPilot includes an **online logistic regression preference model**.

Course feedback such as:

* `too_easy`
* `too_hard`
* `good`
* `perfect`

becomes training data.

The model is:

* Learner-specific
* Persisted
* Warm-started
* Updated incrementally

Therefore, recommendations can become increasingly personalized over time.

```text
Course Recommendation
        ↓
Learner Feedback
        ↓
Preference Model Update
        ↓
Persist Model
        ↓
Future Recommendations Improve
```

---

# 🔎 Explainable Recommendations

Every recommendation contains a breakdown of:

### Why?

For example:

```text
+ Strongly matches your missing React skill
+ Prerequisites already satisfied
+ Matches your preferred learning style
+ High-quality resource
```

### Why Not?

For example:

```text
- Slightly longer than your preferred duration
- Lower semantic similarity than another candidate
```

The explanation is grounded in the **actual recommendation score**, rather than being a generic AI-generated justification.

---

# 🧩 Prerequisite-Safe Learning Paths

A recommendation score alone is not enough.

For example:

```text
Advanced React
      ↑
React Fundamentals
      ↑
JavaScript
      ↑
HTML / CSS
```

SkillPilot uses dependency-aware ordering based on **topological sorting** to prevent learners from being scheduled into courses before their prerequisites are satisfied.

Blocked candidates remain explicitly visible instead of silently violating dependencies.

---

# 🗺️ Adaptive Roadmaps

The generated roadmap is divided into milestone-based phases.

Example:

```text
Phase 1 — Foundations
├── HTML & CSS
├── JavaScript Fundamentals
└── Git & GitHub

Phase 2 — Frontend Development
├── React
├── State Management
└── API Integration

Phase 3 — Backend Development
├── Node.js
├── Express
└── MongoDB

Phase 4 — Full-Stack Projects
├── Authentication
├── Deployment
└── Capstone Project
```

Each phase includes estimated learning duration.

---

# 🔄 Continuous Learning Loop

SkillPilot continuously adapts the roadmap.

```text
        ┌──────────────────┐
        │  Learning Path   │
        └────────┬─────────┘
                 ↓
             Complete
              Course
                 ↓
           Take Assessment
                 ↓
          Give Feedback
                 ↓
        Update Knowledge State
                 ↓
        Update Preference Model
                 ↓
        Re-rank Recommendations
                 ↓
          Adapt Remaining Path
                 │
                 └───────────────↺
```

Completed courses are preserved while only the remaining roadmap is regenerated.

---

# 📈 Career Readiness Dashboard

For each target role, SkillPilot provides:

* Overall readiness score
* Skill mastery
* Biggest remaining skill gap
* Next best action
* Recommended course

Example:

```text
Target Role: Full-Stack Developer

Readiness: 72%

Biggest Gap:
Advanced Backend Development

Next Best Action:
Complete "Node.js Advanced APIs"
```

The readiness score is calculated from the learner's **actual skill mastery**, rather than simply counting completed courses.

---

# 📝 AI-Generated Assessments

SkillPilot can generate a **5-question multiple-choice assessment** for an individual skill and difficulty level.

Assessment results become evidence for the learner's knowledge state.

```text
Assessment Result
       ↓
Skill Mastery Update
       ↓
Recommendation Update
```

This makes assessments part of the recommendation system rather than an isolated feature.


# 💬 Grounded AI Assistant

The AI assistant receives the learner's actual profile and learning-path context.

It is designed to answer questions using that context instead of inventing generic recommendations.

If the LLM service becomes unavailable, SkillPilot gracefully falls back to an honest response instead of pretending that it generated an AI answer.

---

# 🌐 Multilingual Learning

The course catalog supports:

* 🇬🇧 English
* 🇮🇳 Hindi
* Marathi
* Tamil
* Telugu
* Kannada
* Bengali
* Gujarati
* Punjabi

If insufficient courses exist in the preferred language, SkillPilot uses a smart fallback strategy to maintain recommendation quality.

---

# 🎮 Additional Learner Features

* Course progress tracking
* Upcoming / current / completed states
* Automatic current-course advancement
* Per-course notes stored in MongoDB
* Daily learning streaks
* Interactive 3D skill-tree visualization
* Personalized dashboards

---

# 🔐 Security & Reliability

SkillPilot is designed with production-oriented security and reliability practices.

### Authentication

* JWT access tokens
* JWT refresh tokens
* Access-token lifetime: 2 hours
* Refresh-token lifetime: 30 days
* Refresh-token rotation
* Refresh-token revocation on logout
* bcrypt password hashing
* Email-based password reset (time-limited, single-use token; doesn't
  reveal whether an email is registered; revokes existing sessions on reset)

### API Security

* Input validation
* Resource ownership checks
* Security headers
* Content Security Policy
* X-Frame-Options
* Rate limiting

### Distributed Rate Limiting

When configured, Redis-backed rate limiting is used so limits remain consistent across multiple server instances.

Without Redis, the application automatically falls back to an in-memory limiter.

### External API Resilience

LLM calls use:

* Timeout protection
* Exponential backoff
* Retry handling for transient failures
* 429 / 5xx handling

Embeddings also have a local deterministic fallback.

The application therefore remains functional even when optional external services are unavailable.

---

# 📚 Content Catalog

SkillPilot currently contains:

| Content             |     Count |
| ------------------- | --------: |
| Courses             | **1,324** |
| Free courses        |   **265** |
| Paid courses        | **1,059** |
| Career roles        |    **64** |
| Supported languages |     **9** |

Courses include metadata such as:

* Skills
* Prerequisites
* Difficulty level
* Duration
* Language
* Learning style
* Quality information
* Platform

---

# 📊 Recommendation Evaluation

SkillPilot includes an offline evaluation harness to measure whether the advanced recommendation layers actually improve performance.

Run:

```bash
npm run evaluate
```

The evaluation compares:

### Baseline

Naive skill-gap matching.

### Enhanced

Full hybrid recommendation engine.

Metrics include:

* Recommendation precision
* Skill coverage
* Recommendation diversity
* Role-match accuracy
* Prerequisite-violation rate

Evaluation is performed across all **64 career roles**.

Results are written to:

```text
docs/recommendation-evaluation.json
```

This makes it possible to measure actual improvement instead of simply claiming that the system is "AI-powered."

---
### 🤖 LLM Integration

SkillPilot uses **Groq's OpenAI-compatible API** with **Llama 3.3 70B** for natural-language understanding and recommendation explanations.

The LLM is intentionally limited to two responsibilities:

1. **Goal Understanding** — converts the learner's free-text career goal into structured information such as target role, timeline, and current skills.
2. **Recommendation Explanation** — converts the recommendation engine's actual score breakdown into simple, human-friendly explanations.

**The LLM does not rank or select courses.** Course ranking is handled by SkillPilot's deterministic hybrid recommendation engine using skill-gap matching, prerequisites, TF-IDF, embeddings, learner preferences, quality signals, and MMR-based diversity.


# 🏗️ System Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│                                                          │
│ Landing • Auth • Onboarding • Dashboard • Recommendations│
│ Learning Path • Assessment • AI Assistant • Profile      │
│                                                          │
│ React Router • Redux Toolkit • Tailwind • Three.js       │
└───────────────────────────┬──────────────────────────────┘
                            │ REST API
                            ↓
┌──────────────────────────────────────────────────────────┐
│                    Express Backend                       │
├──────────────────────────────────────────────────────────┤
│ Authentication & Security                                │
│                                                          │
│ Routes → Services → Models                               │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ recommendation.service.js                            │ │
│ │ Hybrid deterministic recommendation engine           │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ ml.service.js                                        │ │
│ │ TF-IDF • Embeddings • Preference Model              │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ learner.service.js                                   │ │
│ │ Evidence-based knowledge state                       │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ pathgen.service.js                                   │ │
│ │ Prerequisites • Topological ordering • Phases        │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ readiness.service.js                                 │ │
│ │ Career readiness • Next-best-action                  │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ assessment.service.js                                │ │
│ │ AI-generated skill assessments • Scoring             │ │
│ └──────────────────────────────────────────────────────┘ │
└───────────────────────────┬──────────────────────────────┘
                            │
             ┌──────────────┼───────────────┐
             ↓              ↓               ↓
        MongoDB          Groq LLM       Embeddings
                         Llama 3.3       Optional
                           70B
```

---

# 🛠️ Tech Stack

| Layer               | Technology                    |
| ------------------- | ----------------------------- |
| Frontend            | React 18, Vite                |
| State               | Redux Toolkit                 |
| Styling             | Tailwind CSS                  |
| Routing             | React Router                  |
| Animation           | Framer Motion                 |
| 3D Visualization    | Three.js, React Three Fiber   |
| Charts              | Recharts                      |
| Backend             | Node.js, Express 5            |
| Database            | MongoDB, Mongoose             |
| Authentication      | JWT + bcrypt                  |
| LLM                 | Groq / Llama 3.3 70B          |
| NLP                 | TF-IDF                        |
| Semantic Search     | Dense Embeddings              |
| Preference Learning | Online Logistic Regression    |
| Ranking             | Hybrid scoring + MMR          |
| Testing             | Node.js test suites           |
| Deployment          | Standard Node/Vite deployment |

---

# 🚀 Getting Started

## Prerequisites

Install:

* Node.js 18+
* npm
* MongoDB Atlas or local MongoDB
* Groq API key

---

## 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Skillpilot-main
```

---

## 2. Install Dependencies

### Backend

```bash
cd server
npm install
```

### Frontend

```bash
cd ../client
npm install
```

---

## 3. Configure Environment Variables

From the `server` directory:

```bash
cp .env.example .env
```

Configure:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/skillpilot

PORT=5000

JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<different-strong-random-secret>

CLIENT_URLS=http://localhost:5173

LLM_API_KEY=gsk_your_groq_key_here
```

Generate secure secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 4. Optional Environment Variables

These features are optional because SkillPilot has built-in fallbacks.

```env
EMBEDDING_API_URL=
EMBEDDING_API_KEY=
EMBEDDING_MODEL=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

LLM_TIMEOUT_MS=12000
LLM_MAX_RETRIES=2

EMBEDDING_TIMEOUT_MS=4000

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### Fallback behavior

| Feature       | External Service      | Fallback                             |
| ------------- | --------------------- | ------------------------------------ |
| Embeddings    | OpenAI-compatible API | Local deterministic hashed embedding |
| Rate limiting | Upstash Redis         | In-memory limiter                    |
| LLM           | Groq                  | Graceful fallback response           |
| Password reset email | SMTP              | Reset link logged to server console |

---

## 5. Frontend Environment

The frontend defaults to:

```text
http://localhost:5000/api
```

To override it, create:

```text
client/.env
```

with:

```env
VITE_API_URL=http://localhost:5000/api
```

---

# 🌱 Seed the Database

From `server/`:

```bash
npm run seed
```

This loads the **1,324-course catalog** into MongoDB.

The seed operation is safe to run again and skips already-seeded data.

To force a complete re-seed:

```bash
npm run seed:force
```

---

# ▶️ Run the Application

### Terminal 1 — Backend

From `server/`:

```bash
npm run dev
```

Backend:

```text
http://localhost:5000
```

Or:

```bash
npm start
```

### Terminal 2 — Frontend

From `client/`:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Open the frontend URL in your browser.

---

# 🏭 Production Build

```bash
cd client
npm run build
```

Preview the production build:

```bash
npm run preview
```

Deploy the backend as a standard Node.js process with the required environment variables configured.

---

# 🧪 Testing

All major system components have dedicated test suites.

From `server/`:

```bash
npm test
```

### Individual test suites

```bash
npm run test:engine
npm run test:feedback
npm run test:roles
npm run test:ml
npm run test:learner
npm run test:assessment
npm run test:api
```

| Test       | Purpose                              |
| ---------- | ------------------------------------ |
| Engine     | Recommendation ranking               |
| Feedback   | Feedback → preference adaptation     |
| Roles      | Role-matching correctness            |
| ML         | TF-IDF / embeddings / semantic layer |
| Learner    | Knowledge-state updates              |
| Assessment | AI-generated assessment scoring      |
| API        | Security and route contracts         |

For full DB-backed API testing:

```bash
E2E_BASE_URL=<server-url> npm run test:api
```

---

# 📁 Project Structure
├── server/
│   ├── models/
│   │   ├── User
│   │   ├── Profile
│   │   ├── Course
│   │   ├── LearningPath
│   │   ├── Assessment
│   │   └── Skill
│   │
│   ├── routes/
│   │   ├── auth
│   │   ├── profile
│   │   ├── course
│   │   ├── path
│   │   ├── ai
│   │   └── assessment
│   │
│   ├── services/
│   │   ├── recommendation.service.js
│   │   ├── ml.service.js
│   │   ├── llm.service.js
│   │   ├── pathgen.service.js
│   │   ├── readiness.service.js
│   │   ├── learner.service.js
│   │   └── assessment.service.js
│   │
│   ├── middleware/
│   │   ├── auth
│   │   └── security
│   │
│   ├── tests/
│   │
│   └── scripts/
│       ├── seed.js
│       └── evaluate-recommender.mjs

# 🧠 Core Intelligence Pipeline

The complete intelligence pipeline can be summarized as:

```text
Natural Language Goal
        ↓
LLM Goal Parsing
        ↓
Structured Learner Profile
        ↓
Role Matching
        ↓
Required Skills
        ↓
Skill Gap Analysis
        ↓
Candidate Course Retrieval
        ↓
Hybrid Recommendation
        ↓
Prerequisite Validation
        ↓
MMR Diversity Ranking
        ↓
Explainable Recommendations
        ↓
Prerequisite-Safe Roadmap
        ↓
Learning
        ↓
Assessment + Feedback
        ↓
Knowledge State Update
        ↓
Preference Model Update
        ↓
Adaptive Re-ranking
```

---

# 🏆 Why SkillPilot Is More Than an "AI Course Recommender"

SkillPilot combines **AI, machine learning, information retrieval, recommendation systems, knowledge modeling, graph-based planning, and full-stack engineering** into one continuous learning system.

The important distinction is:

```text
Traditional Approach

Goal → LLM → Courses


SkillPilot

Goal
 ↓
Structured Profile
 ↓
Skill Gap
 ↓
Hybrid ML Recommendation
 ↓
Prerequisite Graph
 ↓
Personalized Roadmap
 ↓
Assessment
 ↓
Feedback
 ↓
Knowledge Update
 ↓
Preference Learning
 ↓
Adaptive Roadmap
```

The system therefore doesn't simply answer:

> **"What courses should I take?"**

It attempts to answer:

> **"Given what I know, what I want to become, what I have already learned, and how I respond to learning resources, what should I learn next—and why?"**

---

# 📌 Future Improvements

Potential future directions include:

* Collaborative filtering across learners
* Graph neural networks for skill relationships
* More sophisticated learner knowledge models
* Course completion prediction
* Learning-time optimization
* Real-time recommendation experimentation
* A/B testing of recommendation strategies
* More career-role catalogs
* More localized learning resources
* Mobile application
* Instructor/content-provider analytics

---

# 👨‍💻 Project


**SkillPilot**

AI-powered, skill-gap-aware personalized learning path generation and adaptive recommendation system.





