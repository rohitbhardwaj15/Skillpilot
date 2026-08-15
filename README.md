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

- **Frontend:** React (Vite), Tailwind CSS v4, Three.js, GSAP, Recharts
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB (Atlas in production)
- **AI:** LLM API for goal-understanding and explanation generation

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
| `LLM_API_KEY` | API key for the LLM used in goal analysis/explanations |

## Roadmap / Build Plan

See `/docs/PROGRESS.md` for the full 16-day plan and day-by-day log.

## Future Scope

- Job-market skill demand integration
- Resume-based skill extraction
- Peer benchmarking and mentor matching
