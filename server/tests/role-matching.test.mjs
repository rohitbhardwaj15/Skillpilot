/**
 * Tests role-matching correctness — specifically guards against a real bug
 * that was found and fixed: naive substring matching caused short inputs
 * like "CA" to falsely match inside unrelated words (e.g. "ethiCAl hacker",
 * an alias for Cybersecurity Analyst). Also guards against the fix being
 * "too strict" and breaking legitimate abbreviations like "full-stack dev".
 * Run with: node tests/role-matching.test.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchRole } from '../services/recommendation.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/roles.json'), 'utf-8'));

const tests = [
  ['Full Stack Developer', 'Full Stack Developer'],
  ['full-stack dev', 'Full Stack Developer'],
  ['ML Engineer', 'Machine Learning Engineer'],
  ['DevOps Engineer', 'DevOps Engineer'],
  ['UI/UX Designer', 'UI/UX Designer'],
  ['CA', null],           // The regression test for the bug that was found
  ['Chartered Accountant', null],
  ['Doctor', null],
  ['Digital Marketing', null],
];

let failures = 0;
tests.forEach(([input, expected]) => {
  const result = matchRole(input, roles);
  const got = result ? result.role : null;
  const ok = got === expected;
  if (!ok) failures++;
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}: "${input}" -> got: ${got}, expected: ${expected}`);
});

console.log(`\n${failures === 0 ? 'ALL ROLE-MATCHING TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
