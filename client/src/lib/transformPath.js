function buildSkillGraph(path, profile) {
  const known = new Map((profile?.knowledgeState || []).map(k => [k.skill.toLowerCase(), k]));
  const current = new Map((profile?.currentSkills || []).map(k => [k.name.toLowerCase(), k]));
  const all = new Map();
  const roleName = path.targetRole || 'Target Role';
  const add = (name, statusHint) => {
    const key = String(name).toLowerCase(); if (!key) return;
    if (!all.has(key)) all.set(key, { name, statusHint });
  };
  (path.skillGaps || []).forEach(s => add(s, 'missing'));
  path.phases.flatMap(p => p.courses).forEach(c => {
    (c.skills || []).forEach(s => add(s));
    (c.prerequisites || []).forEach(s => add(s, 'prerequisite'));
    // prerequisites are graph dependencies even when not taught by a selected node
    // so the learner can see why an advanced node is blocked.
    // eslint-disable-next-line no-unused-expressions
  });
  const nodes = [{ id: '__role__', label: roleName, status: 'role', completed: false, color: '#6D28D9', position: [0, 0, 0] }, ...[...all.values()].map((x, i) => {
    const k = known.get(x.name.toLowerCase());
    const cur = current.get(x.name.toLowerCase());
    const level = k?.level ?? ({ none:0, beginner:.3, intermediate:.6, advanced:.85 }[cur?.level] ?? 0);
    const status = level >= .8 ? 'mastered' : level > .35 ? 'learning' : (path.skillGaps || []).some(g => g.toLowerCase() === x.name.toLowerCase()) ? 'missing' : 'recommended';
    const angle = (i / Math.max(1, all.size)) * Math.PI * 2;
    const radius = 3.2 + (i % 2) * 1.2;
    return { id: x.name, label: x.name, status, completed: status === 'mastered', color: status === 'mastered' ? '#0E9C8F' : status === 'learning' ? '#D97B0F' : status === 'missing' ? '#DC2626' : '#2563EB', position: [Math.cos(angle)*radius, Math.sin(angle)*radius*.65, (i%3-1)*.6] };
  })];
  const byName = new Map(nodes.map(n => [n.label.toLowerCase(), n]));
  const connections = [];
  // Role-to-skill edges make the 3D graph represent the actual career target.
  const roleNode = nodes[0];
  nodes.slice(1).forEach((n) => { if (n.status !== 'mastered') connections.push({ start: roleNode.position, end: n.position, color: '#6D28D9', animated: n.status === 'recommended' }); });
  path.phases.flatMap(p => p.courses).forEach(c => {
    const target = c.skills?.[0] && byName.get(c.skills[0].toLowerCase());
    (c.prerequisites || []).forEach(pr => {
      const source = byName.get(pr.toLowerCase());
      if (source && target && source.id !== target.id) connections.push({ start: source.position, end: target.position, color: '#2563EB', animated: target.status === 'recommended' });
    });
  });
  return { nodes, connections };
}

export function transformPathResponse(path, profile = null) {
  const flatCourses = path.phases.flatMap((p) => p.courses)
  const nodes = flatCourses.map((c) => ({
    id: c.courseId, courseId: c.courseId, title: c.title, description: c.skills?.join(', ') || '', durationWeeks: c.durationWeeks,
    type: c.type === 'project' ? 'project' : 'course', completed: c.status === 'done', progress: c.status === 'done' ? 100 : c.status === 'current' ? 10 : 0,
    scoreBreakdown: c.scoreBreakdown, explanation: c.explanation, qualityScore: c.qualityScore, level: c.level,
    skills: c.skills, prerequisites: c.prerequisites, url: c.url, youtube_url: c.youtube_url, documentation_url: c.documentation_url,
  }))
  const graph = buildSkillGraph(path, profile)
  return { id: path._id, title: path.targetRole, description: `A personalized roadmap toward becoming a ${path.targetRole}, built from your goals and current skills.`, difficulty: flatCourses[Math.floor(flatCourses.length/2)]?.level || 'intermediate', color:'#D97B0F', estimatedWeeks:path.estimatedDurationWeeks, totalHours:path.estimatedDurationWeeks*8, skillGaps:path.skillGaps, nodes, skillGraph:graph };
}
