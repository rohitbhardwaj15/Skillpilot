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
