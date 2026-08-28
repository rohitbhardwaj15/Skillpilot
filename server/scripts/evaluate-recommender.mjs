import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchRole, rankCourses } from '../services/recommendation.service.js';
import { orderByPrerequisites } from '../services/pathgen.service.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const courses = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/courses.json'),'utf8')).map((c,i)=>({...c,_id:String(i),qualityScore:c.qualityScore ?? 0.75}));
const roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/roles.json'),'utf8'));
const profiles = roles.map((r,i)=>({targetRole:r.role,currentSkills:r.requiredSkills.slice(0,Math.floor(r.requiredSkills.length*.3)).map(name=>({name,level:'intermediate'})),knowledgeState:[],preferredLanguage:'English',courseTypeFilter:'both',learningStyle:['video'],feedback:[],interests:[]}));
let roleHits=0, skillPrecision=0, coverage=0, diversity=0, violations=0, cases=0;
for (const profile of profiles) {
 const role=matchRole(profile.targetRole,roles); if(role?.role===profile.targetRole) roleHits++;
 const {ranked,skillGaps}=rankCourses(courses,profile,role); const top=ranked.slice(0,10);
 const gap=new Set(skillGaps.map(s=>s.toLowerCase())); const relevant=top.filter(x=>x.course.skills.some(s=>gap.has(s.toLowerCase()))).length;
 skillPrecision += top.length ? relevant/top.length : 0;
 coverage += gap.size ? new Set(top.flatMap(x=>x.course.skills.map(s=>s.toLowerCase())).filter(s=>gap.has(s))).size/gap.size : 1;
 diversity += top.length ? new Set(top.flatMap(x=>x.course.skills.map(s=>s.toLowerCase()))).size/(top.length*2) : 0;
 const ordered=orderByPrerequisites(ranked,profile); const learned=new Set(profile.currentSkills.map(s=>s.name.toLowerCase()));
 for(const x of ordered){ for(const p of x.course.prerequisites||[]) if(!learned.has(p.toLowerCase())) violations++; x.course.skills.forEach(s=>learned.add(s.toLowerCase())); }
 cases++;
}
const out={cases,roleMatchAccuracy:+(roleHits/cases).toFixed(3),precisionAt10:+(skillPrecision/cases).toFixed(3),skillCoverageAt10:+(coverage/cases).toFixed(3),recommendationDiversity:+(Math.min(1,diversity/cases)).toFixed(3),prerequisiteViolationRate:+(violations/Math.max(1,cases*10)).toFixed(3)};
console.log(JSON.stringify(out,null,2));
fs.writeFileSync(path.join(__dirname,'../../docs/recommendation-evaluation.json'),JSON.stringify(out,null,2));
