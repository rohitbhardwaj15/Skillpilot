/**
 * Path Generator
 * --------------
 * Takes the ranked, filtered courses from the recommendation engine and
 * orders them so prerequisites always come before what depends on them
 * (topological sort), then groups the sequence into milestone phases.
 *
 * This is what turns "a ranked list" into an actual roadmap.
 */

const LEVEL_RANK = { none: 0, beginner: 1, intermediate: 2, advanced: 3 };
const KNOWN_THRESHOLD = 2;
const COURSES_PER_PHASE = 3;
const MAX_COURSES = 12; // cap the roadmap so it stays focused, not overwhelming

function getKnownSkillSet(currentSkills = []) {
  return new Set(
    currentSkills
      .filter((s) => (LEVEL_RANK[s.level] ?? 0) >= KNOWN_THRESHOLD)
      .map((s) => s.name.toLowerCase())
  );
}

/**
 * Orders scored courses so that a course only appears after every course that
 * teaches one of its prerequisite skills (unless the learner already knows
 * that skill). Uses a greedy Kahn's-algorithm variant: among all currently
 * eligible courses (prereqs satisfied), pick the highest-scoring one next.
 */
export function orderByPrerequisites(rankedCourses, profile) {
  const known = getKnownSkillSet(profile.currentSkills);
  const candidates = rankedCourses.slice(0, MAX_COURSES * 2); // wider pool than final cap

  const remaining = [...candidates];
  const ordered = [];
  const skillsGainedSoFar = new Set(known);

  // safety cap to avoid infinite loops if a prereq is simply unavailable in the catalog
  let guard = candidates.length * 2;

  while (remaining.length > 0 && ordered.length < MAX_COURSES && guard-- > 0) {
    // find eligible courses: every prerequisite is already known or already gained
    const eligibleIndex = remaining.findIndex(({ course }) => {
      const prereqs = (course.prerequisites || []).map((p) => p.toLowerCase());
      return prereqs.every((p) => skillsGainedSoFar.has(p));
    });

    if (eligibleIndex === -1) {
      // Nothing is fully eligible (missing prereq not in catalog/gap) —
      // take the highest-scored remaining course anyway rather than stalling,
      // but only after trying everything else.
      const fallback = remaining.shift();
      ordered.push(fallback);
      fallback.course.skills.forEach((s) => skillsGainedSoFar.add(s.toLowerCase()));
      continue;
    }

    const [next] = remaining.splice(eligibleIndex, 1);
    ordered.push(next);
    next.course.skills.forEach((s) => skillsGainedSoFar.add(s.toLowerCase()));
  }

  return ordered;
}

/** Groups an ordered course list into milestone phases. */
export function groupIntoPhases(orderedCourses) {
  const phases = [];
  for (let i = 0; i < orderedCourses.length; i += COURSES_PER_PHASE) {
    const chunk = orderedCourses.slice(i, i + COURSES_PER_PHASE);
    const phaseNumber = phases.length + 1;
    const durationWeeks = chunk.reduce((sum, c) => sum + (c.course.durationWeeks || 2), 0);

    phases.push({
      phaseNumber,
      title: phaseTitle(phaseNumber, chunk),
      durationWeeks,
      courses: chunk.map(({ course, breakdown }, idx) => ({
        courseId: course._id,
        title: course.title,
        skills: course.skills,
        level: course.level,
        durationWeeks: course.durationWeeks,
        scoreBreakdown: breakdown,
        status: phaseNumber === 1 && idx === 0 ? 'current' : 'upcoming',
      })),
    });
  }
  return phases;
}

function phaseTitle(phaseNumber, chunk) {
  const skillNames = [...new Set(chunk.flatMap((c) => c.course.skills))].slice(0, 2);
  return `Phase ${phaseNumber}: ${skillNames.join(' & ') || 'Foundations'}`;
}
