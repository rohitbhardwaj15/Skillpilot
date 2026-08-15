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

## Day 3-5 (17-19 Aug) — Learner System [NEXT]
- [ ] Natural-language onboarding UI (chat-style goal input)
- [ ] `/api/ai/analyze-goal` — LLM call to extract {targetRole, timelineMonths, currentSkills} from free text
- [ ] Wire onboarding form → Profile creation in MongoDB
- [ ] Expand course dataset toward 150-300 entries

## Day 6-8 (20-22 Aug) — Recommendation Engine
- [ ] Skill-gap detection (profile skills vs target role's required skills)
- [ ] Scoring formula: 0.30*skillGap + 0.25*goalRelevance + 0.20*prereqReadiness + 0.15*interest + 0.10*style
- [ ] Prerequisite graph + topological sort for ordering
- [ ] `/api/path/generate` fully implemented

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
