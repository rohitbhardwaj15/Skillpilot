import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchRole, rankCourses, scoreCourse } from '../services/recommendation.service.js';
import { semanticCourseScores } from '../services/ml.service.js';
import { orderByPrerequisites } from '../services/pathgen.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const courses = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/courses.json'),'utf8'))
  .map((c,i)=>({...c,_id:String(i),qualityScore:c.qualityScore ?? 0.75}));
const roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/roles.json'),'utf8'));

function baselineRank(courses, profile, role) {
  const required = new Set(role.requiredSkills.map(s=>s.toLowerCase()));
  const gaps = new Set(role.requiredSkills.filter(s=>!profile.currentSkills.some(k=>k.name.toLowerCase()===s.toLowerCase() && ['intermediate','advanced'].includes(k.level))).map(s=>s.toLowerCase()));
  return courses.map(course=>{
    const skills=course.skills.map(s=>s.toLowerCase());
    const gap=skills.filter(s=>gaps.has(s)).length/Math.max(1,skills.length);
    const roleFit=skills.filter(s=>required.has(s)).length/Math.max(1,skills.length);
    return {course, score:.6*gap+.4*roleFit};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
}

function metrics(ranked, profile, role) {
  const top=ranked.slice(0,10);
  const gaps=new Set(role.requiredSkills.filter(s=>!profile.currentSkills.some(k=>k.name.toLowerCase()===s.toLowerCase() && ['intermediate','advanced'].includes(k.level))).map(s=>s.toLowerCase()));
  const relevant=top.filter(x=>x.course.skills.some(s=>gaps.has(s.toLowerCase()))).length;
  const covered=new Set(top.flatMap(x=>x.course.skills.map(s=>s.toLowerCase())).filter(s=>gaps.has(s)));
  const diversity=new Set(top.flatMap(x=>x.course.skills.map(s=>s.toLowerCase()))).size/Math.max(1,top.length*2);
  return { precisionAt10: top.length?relevant/top.length:0, skillCoverageAt10:gaps.size?covered.size/gaps.size:1, diversity:Math.min(1,diversity) };
}

let roleHits=0,cases=0; let base={precisionAt10:0,skillCoverageAt10:0,diversity:0}; let enhanced={precisionAt10:0,skillCoverageAt10:0,diversity:0}; let violations=0;
for(const r of roles){
  const profile={targetRole:r.role,currentSkills:r.requiredSkills.slice(0,Math.floor(r.requiredSkills.length*.3)).map(name=>({name,level:'intermediate'})),knowledgeState:[],preferredLanguage:'English',courseTypeFilter:'both',learningStyle:['video'],feedback:[],interests:[]};
  const role=matchRole(profile.targetRole,roles); if(role?.role===profile.targetRole) roleHits++; cases++;
  const b=metrics(baselineRank(courses,profile,role),profile,role);
  const {ranked}=rankCourses(courses,profile,role); const e=metrics(ranked,profile,role);
  for(const k of Object.keys(base)) { base[k]+=b[k]; enhanced[k]+=e[k]; }
  const ordered=orderByPrerequisites(ranked,profile);
  const learned=new Set(profile.currentSkills.map(s=>s.name.toLowerCase()));
  for(const x of ordered){ for(const p of x.course.prerequisites||[]) if(!learned.has(p.toLowerCase())) violations++; x.course.skills.forEach(s=>learned.add(s.toLowerCase())); }
}
for(const k of Object.keys(base)){base[k]/=cases; enhanced[k]/=cases;}
const pct=(n)=>+(n*100).toFixed(1);
const out={
  cases,
  roleMatchAccuracy:+(roleHits/cases).toFixed(3),
  baseline:{precisionAt10:+base.precisionAt10.toFixed(3),skillCoverageAt10:+base.skillCoverageAt10.toFixed(3),recommendationDiversity:+base.diversity.toFixed(3)},
  enhanced:{precisionAt10:+enhanced.precisionAt10.toFixed(3),skillCoverageAt10:+enhanced.skillCoverageAt10.toFixed(3),recommendationDiversity:+enhanced.diversity.toFixed(3)},
  improvement:{precisionAt10:`+${pct(enhanced.precisionAt10-base.precisionAt10)} pts`,skillCoverageAt10:`+${pct(enhanced.skillCoverageAt10-base.skillCoverageAt10)} pts`,recommendationDiversity:`+${pct(enhanced.diversity-base.diversity)} pts`},
  prerequisiteViolationRate:+(violations/Math.max(1,cases*10)).toFixed(3),
  methodology:'Baseline = gap/role-fit ranking. Enhanced = prerequisite-aware hybrid semantic + quality + learner-personalization ranking. Precision/Coverage use proxy relevance labels from role skill gaps.'
};
console.log(JSON.stringify(out,null,2));
fs.writeFileSync(path.join(__dirname,'../../docs/recommendation-evaluation.json'),JSON.stringify(out,null,2));
