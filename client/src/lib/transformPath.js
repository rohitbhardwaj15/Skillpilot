/**
 * Converts the backend's LearningPath response (phases -> courses) into the
 * flat node list the frontend's TimelineNode / SkillTree3D components expect.
 * This is the ONE place that bridges "real backend shape" and "UI shape" —
 * keeping the conversion in one spot means the UI components don't need to
 * know anything about our API's structure.
 */
export function transformPathResponse(path) {
  const flatCourses = path.phases.flatMap((p) => p.courses)

  const nodes = flatCourses.map((c) => ({
    id: c.courseId,
    title: c.title,
    description: c.skills?.join(', ') || '',
    duration: c.durationWeeks,
    type: c.type === 'project' ? 'project' : 'course',
    completed: c.status === 'done',
    progress: c.status === 'done' ? 100 : c.status === 'current' ? 10 : 0,
    scoreBreakdown: c.scoreBreakdown,
    level: c.level,
  }))

  const difficulty =
    flatCourses.length > 0
      ? flatCourses[Math.floor(flatCourses.length / 2)].level || 'intermediate'
      : 'intermediate'

  return {
    id: path._id,
    title: path.targetRole,
    description: `A personalized roadmap toward becoming a ${path.targetRole}, built from your goals and current skills.`,
    difficulty,
    color: '#f5a623',
    estimatedWeeks: path.estimatedDurationWeeks,
    totalHours: path.estimatedDurationWeeks * 8, // rough estimate at 8hrs/week baseline
    skillGaps: path.skillGaps,
    nodes,
  }
}
