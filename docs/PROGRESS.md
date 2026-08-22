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

## Dataset Expansion (16 Aug) — ✅ DONE, with a real bug found and fixed
- [x] Course dataset grown from 30 → **76 courses**, covering all 9 roles
- [x] Coverage audit: every role now has 7-26 relevant courses (was as low as 2 for UI/UX before)
- [x] No required skill is left entirely uncovered by any role

**A real bug was caught by the test suite during this expansion, not assumed away:**
As the dataset grew, the recommendation engine's test (`npm run test:engine`) started
FAILING — React was silently disappearing from generated Full Stack Developer
roadmaps. Root cause: multiple courses now teach overlapping skills (several
JavaScript courses, several CSS courses), and taking the naive top-12-by-score
was letting redundant same-skill courses crowd out coverage of OTHER required
skills entirely.

**Fix:** added a diversity/coverage pass to `rankCourses()` — a course is now
kept only if it covers a skill gap nothing else has covered yet, or if it's a
project/capstone (which integrate multiple skills). This is a legitimate
recommendation-systems technique (greedy set-cover), not a hack, and it's a
good talking point for the AI/ML section of your documentation.

**Verified after the fix:**
- Full test suite passes again (`npm run test`)
- Spot-checked a second, unrelated role (ML Engineer, zero prior skills) —
  roadmap covers 8/8 required skills
- Both frontend build and backend boot confirmed clean

**Known minor limitation (not fixed, documented honestly):** the diversity
pass's project/capstone bypass can occasionally let an off-topic capstone
project into a roadmap if it partially overlaps on one already-covered skill
(e.g. a "Full Stack Capstone Project" appearing at the tail of an ML Engineer
roadmap because it also teaches "Deployment"). Cosmetic, not incorrect, but
worth tightening if time allows before submission.

**Still open:** 76 courses is solid but still short of the 150-300 stretch
target. Current coverage is good enough to demo confidently across all 9 roles.

## Frontend Rebuild (19-21 Aug) — ✅ DONE

Replaced the entire client with a new, more polished multi-page design
(originally a visual prototype with fake data, now fully rewired to real
backend calls). Also added full authentication, which the app didn't have
before.

**New/changed:**
- [x] Real JWT authentication: register, login, protected routes (bcrypt
      password hashing, 30-day sessions)
- [x] 7 pages, all wired to real backend data: Landing, Login, Register,
      Onboarding, Dashboard, Learning Paths, Recommendations, AI Assistant, Profile
- [x] Landing page shows a LIVE course count (fetched from `/api/courses`,
      not hardcoded) instead of fabricated adoption stats
- [x] Dashboard: real phase-progress bar chart and skill radar replacing
      fake "weekly activity" and fake streak counters that had no backing
      data source
- [x] Recommendations page: real 76-course catalog, dynamic skill filters
      derived from the actual dataset, "fills a skill gap" tags computed
      from the learner's real profile — no fake ratings, student counts,
      or stock images
- [x] AI Assistant: real Groq-backed chat grounded in the learner's actual
      profile/roadmap context (new `/api/ai/chat` endpoint)
- [x] Profile page: real CRUD, auto-saves on toggle. Caught and fixed a
      real bug here — the learning-style options shown didn't match the
      backend's supported enum values at all (`visual/auditory/kinesthetic`
      vs. the real `projects/video/reading/interactive`), so selecting them
      would have silently done nothing useful.
- [x] Deleted `data/courses.js` and `data/paths.js` — the old fake local
      datasets — so nothing can accidentally fall back to them
- [x] Full test suite still passes after the swap (`npm run test` in `server/`)
- [x] Frontend builds clean in the new location

**New env var required for deployment:** `JWT_SECRET` (see README).
