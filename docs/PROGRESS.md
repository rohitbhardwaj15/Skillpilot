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

## Day 9-10 (23-24 Aug) — Roadmap UI + Explainability ✅ DONE
- [x] Roadmap page: PathScene now renders the REAL generated path (not demo data), milestone status pulled from actual course progress
- [x] "Why this?" button per course — calls `/api/ai/explain`, grounded in the real score breakdown (not invented)
- [x] `PUT /api/path/:id/progress` — mark a course done, cascades next course to 'current', syncs learner's skill levels in their profile
- [x] Dashboard page: animated progress %, skill development bar chart (Recharts), next recommended action card
- [x] Full navigation wired: Landing → Onboarding → auto-generate path → Roadmap → Dashboard
- [x] Verified: frontend builds clean, backend boots clean, new endpoint fails gracefully without DB

**How to test the full loop once your DB is connected:**
1. Land on `/`, click "Build My Learning Path"
2. Complete onboarding → auto-redirects to `/roadmap/:id` with a real generated roadmap
3. Click "Why this?" on any course → real AI-generated explanation appears
4. Click "Mark complete" on the current course → status updates, next course activates
5. Click "Dashboard" → see progress %, skill chart update accordingly

## Day 11-12 (25-26 Aug) — Feedback Loop + Innovation ✅ DONE

**Feedback loop** (the explicit "adapt suggestions based on user feedback and
progress" requirement from the brief):
- [x] `POST /api/path/:id/feedback` — learner rates a course (too_easy / too_hard / good / perfect)
- [x] Rating actually mutates the learner's profile (skill levels, learning style preference)
- [x] Remaining (not-done) portion of the roadmap is re-ranked and re-ordered against the updated profile — already-completed courses are preserved
- [x] Frontend: emoji feedback buttons per course + a live "adaptation banner" explaining what changed
- [x] **Proven with a real test, not a claim:** `npm run test:feedback` shows React's
      recommendation score dropping from 0.73 → 0.66 after "too_easy" feedback, and
      project-type courses jumping from 0.4 → 1.0 userInterest after a style preference
      change. Numbers, not assertions of intent.

**Innovation feature — What-if simulator:**
- [x] Dashboard slider for hours/week → live-recalculates remaining weeks and estimated
      completion date, client-side, instant (no backend round-trip)
- [x] "Save this pace" persists the chosen hours/week back to the profile

**Verified:** `npm run test` (both suites) passes, frontend builds clean, backend
boots clean.

**Tier A checklist status:** all 9 Tier A requirements from the original plan are
now built and connected end-to-end. Remaining work is deployment, dataset growth,
docs, and demo video.

## Day 13 (27 Aug) — Deploy
- [ ] Deploy client to Vercel
- [ ] Deploy server to Render
- [ ] MongoDB Atlas production cluster

## Day 14-16 (28-31 Aug) — Docs, Video, Submission
- [ ] Solution documentation PDF/PPT
- [ ] Demo video (3-5 min)
- [ ] Final testing + submit
