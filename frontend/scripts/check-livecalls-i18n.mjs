/**
 * Static guard for the "t is not a function" class of bug.
 *
 * `t` is the translation function returned by useLanguage(). If any inner
 * scope in a page re-binds `t` (a `.map((t, i) => ...)`, `const t = ...`,
 * a destructured `{ t }`, or a `function t()`), every `t('some.key')` call
 * inside that scope silently resolves to the shadowing value and React throws
 * `t is not a function` at render time.
 *
 * This walks the source with a brace/stack scan and fails the build step if a
 * shadowing binding is introduced, so the mistake is caught without a browser.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pagePath = join(here, '..', 'src', 'pages', 'LiveCalls.jsx');
const source = readFileSync(pagePath, 'utf8');

// Strip strings, template literals, comments and JSX text so keywords inside
// them are not mistaken for real code. Newlines are preserved so reported line
// numbers still match the source file.
const blank = (m) => m.replace(/[^\n]/g, ' ');
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, blank)
  .replace(/\/\/[^\n]*/g, blank)
  .replace(/`(?:\\[\s\S]|[^`\\])*`/g, blank)
  .replace(/'(?:\\[\s\S]|[^'\\\n])*'/g, blank)
  .replace(/"(?:\\[\s\S]|[^"\\\n])*"/g, blank);

const problems = [];

/**
 * Find the byte range of the `LiveCalls` component body so we only inspect
 * bindings that could actually shadow the component's `t`. Module-level helpers
 * such as `describeMicError = (err, t) => ...` legitimately *receive* `t` as an
 * argument and are not shadowing anything.
 */
const componentStart = code.indexOf('export const LiveCalls');
if (componentStart === -1) {
  console.error('FAIL: could not locate the LiveCalls component in the source');
  process.exit(1);
}

const bodyStart = code.indexOf('{', componentStart);
let depth = 0;
let bodyEnd = -1;
for (let i = bodyStart; i < code.length; i += 1) {
  if (code[i] === '{') depth += 1;
  else if (code[i] === '}') {
    depth -= 1;
    if (depth === 0) {
      bodyEnd = i;
      break;
    }
  }
}
if (bodyEnd === -1) {
  console.error('FAIL: could not determine the end of the LiveCalls component body');
  process.exit(1);
}

const body = code.slice(bodyStart, bodyEnd);
const lineOf = (indexInBody) => code.slice(0, bodyStart + indexInBody).split('\n').length;

/** True when a single parameter entry binds `t`. */
const bindsT = (param) => {
  const trimmed = param.trim();
  if (trimmed === 't') return true;
  // Destructured object/array pattern: { t }, { t, x }, [t]
  const destructured = trimmed.match(/^[{[]([\s\S]*)[}\]]$/);
  if (!destructured) return false;
  return destructured[1]
    .split(',')
    .some((entry) => entry.trim().replace(/:\s*t$/, '').trim() === 't');
};

/**
 * Find `t` bound as a parameter of an arrow function or function expression
 * inside the component — the exact shape that caused
 * `transcripts.map((t, idx) => ...)` to break `t('live.customer')`.
 */
const paramList = /\(([^()]*)\)\s*(?:=>|\{)/g;
let match;
while ((match = paramList.exec(body)) !== null) {
  const params = match[1];
  if (!/\bt\b/.test(params)) continue;
  const offending = params.split(',').filter(bindsT);
  if (offending.length) {
    problems.push(
      `line ${lineOf(match.index)}: parameter \`${offending.join(', ')}\` shadows t() — ` +
      'rename it (e.g. `line`) or t() will not be a function'
    );
  }
}

// Statement-level rebindings inside the component
const statements = [
  [/\b(?:const|let|var)\s+t\s*=/g, 'const/let/var t = ...'],
  [/\bfunction\s+t\s*\(/g, 'function t()'],
  [/\bt\s*=>/g, 'arrow parameter t =>'],
];
for (const [pattern, label] of statements) {
  pattern.lastIndex = 0;
  while ((match = pattern.exec(body)) !== null) {
    problems.push(`line ${lineOf(match.index)}: ${label} shadows t()`);
  }
}

// 2. The single legitimate binding: `const { t, ... } = useLanguage()`
const providerBindings = (code.match(/const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useLanguage\(\)/g) || []).length;
if (providerBindings !== 1) {
  problems.push(`expected exactly 1 useLanguage() destructure, found ${providerBindings}`);
}

// 3. Report the translation call sites so the count is visible in CI output.
//    Counted on the raw source, since the keys live inside string literals.
const tCalls = (source.match(/\bt\('live\./g) || []).length;
const enumCalls = (source.match(/\btEnum\('/g) || []).length;
console.log(`useLanguage() bindings: ${providerBindings}`);
console.log(`t('live.*') call sites:  ${tCalls}`);
console.log(`tEnum() call sites:      ${enumCalls}`);

if (tCalls === 0) {
  problems.push('no t(\'live.*\') call sites found — the page may not be translated at all');
}

if (problems.length) {
  console.error('\n`t` shadowing detected — t() would not be a function at render time:');
  problems.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}

console.log('\nOK: no `t` shadowing in LiveCalls.jsx');
