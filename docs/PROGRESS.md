# Build Progress Log

## Day 1-2 (15-16 Aug) — Foundation ✅ DONE
- [x] React frontend scaffolded (Vite + Tailwind v4 + Three.js + GSAP)
- [x] Design token system applied (colors, fonts — "The Path" concept)
- [x] Signature 3D component built: `PathScene.jsx` — glowing roadmap trail
- [x] Landing page with hero + "how it works" section, GSAP entrance animations
- [x] Node/Express backend scaffolded with folder structure
- [x] Mongoose models: Profile, Course, Skill
- [x] Route stubs for profile, courses, ai, path (with TODO comments for later phases)
- [x] Starter course dataset (15 real courses — needs expansion to 150-300 before submission)
- [x] Seed script to load dataset into MongoDB
- [x] README, .env.example, .gitignore

## Day 3-5 (17-19 Aug) — Learner System ✅ DONE
- [x] Natural-language onboarding UI: 3-step flow (goal input → AI confirm → preferences)
- [x] `/api/ai/analyze-goal` — real LLM call (Claude API) extracting {targetRole, timelineMonths, currentSkills}
- [x] LLM output is validated before use (never trusted blindly) — see `llm.service.js`
- [x] Wired onboarding → `POST /api/profile` → MongoDB
- [x] React Router connecting Landing → Onboarding
- [ ] **Still open:** expand course dataset from 15 toward 150-300 entries (do this alongside Day 6-8, more urgent once the recommendation engine needs range to test against)

**To actually use analyze-goal:** get an API key from console.anthropic.com and set
`LLM_API_KEY=...` in `server/.env`. Without it, the endpoint fails with a clear
error instead of crashing (tested).

## Day 6-8 (20-22 Aug) — Recommendation Engine ✅ DONE
- [x] Skill-gap detection (role's required skills minus what learner already knows at intermediate+)
- [x] Scoring formula implemented exactly as specified: 0.30*skillGap + 0.25*goalRelevance + 0.20*prereqReadiness + 0.15*interest + 0.10*styleMatch
- [x] Role-matching from free-text target role → 9 defined roles (Full Stack, Frontend, Backend, Data Scientist, ML Engineer, Data Engineer, DevOps, Cybersecurity, UI/UX)
- [x] Prerequisite-aware ordering (topological, greedy by score among eligible courses)
- [x] Phase/milestone grouping (3 courses per phase)
- [x] `POST /api/path/generate` fully implemented and tested
- [x] **Standalone test suite** (`server/tests/recommendation-engine.test.mjs`) — runs without MongoDB, verified: role matching, gap detection excludes known skills, JavaScript correctly sequenced before React, phases generate correctly. Run with `npm run test:engine`
- [x] Course dataset expanded from 15 → 30 (still short of the 150-300 target — see note below)

**Verified test output:** all 8 assertions pass, including the critical prerequisite-ordering
check (JavaScript before React) using the exact learner example from the brief
(knows Java + HTML, wants Full Stack Developer in 6 months).

**Still open:** dataset needs more growth before final submission, especially to
avoid embarrassment if a judge tests an obscure role. Prioritize this if time
allows before Day 13.

## Day 9-10 (23-24 Aug) — Roadmap UI + Explainability
- [ ] Connect PathScene to real generated roadmap data
- [ ] `/api/ai/explain` — LLM explanation grounded in score breakdown
- [ ] Dashboard page (progress %, skill radar)

## Day 11-12 (25-26 Aug) — Feedback Loop + Innovation
- [ ] Feedback endpoint that re-ranks remaining roadmap
- [ ] Pick 1-2 Tier B/C features (assessment, what-if simulator, etc.)

## Day 13 (27 Aug) — Deploy
- [ ] Deploy client to Vercel
- [ ] Deploy server to Render
- [ ] MongoDB Atlas production cluster

## Day 14-16 (28-31 Aug) — Docs, Video, Submission
- [ ] Solution documentation PDF/PPT
- [ ] Demo video (3-5 min)
- [ ] Final testing + submit
