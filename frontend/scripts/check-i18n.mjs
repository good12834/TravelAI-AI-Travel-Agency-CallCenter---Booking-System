/**
 * Exercises the lookup/interpolation helpers the same way LanguageContext does,
 * including dotted keys that address enum maps and keys containing spaces
 * (department names such as "Flight Department").
 */
import { TRANSLATIONS, lookup, interpolate } from '../src/i18n/translations.js';

let failures = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} => ${JSON.stringify(actual)}`);
};

for (const lang of ['en', 'am', 'ar', 'he']) {
  check(`${lang} live.title`, lookup(TRANSLATIONS[lang], 'live.title'), TRANSLATIONS[lang].live.title);
  check(
    `${lang} status.IN_PROGRESS resolves`,
    typeof lookup(TRANSLATIONS[lang], 'status.IN_PROGRESS'),
    'string'
  );
  check(
    `${lang} department.'Flight Department' resolves`,
    typeof lookup(TRANSLATIONS[lang], "department.Flight Department"),
    'string'
  );
}

// Unknown key -> undefined so the caller can fall back
check('unknown key', lookup(TRANSLATIONS.en, 'live.doesNotExist'), undefined);
check('unknown enum', lookup(TRANSLATIONS.en, 'status.NOT_A_STATUS'), undefined);

// Interpolation
check(
  'interpolate transferNotice',
  interpolate(TRANSLATIONS.en.live.transferNotice, { dept: 'Flight Department' }),
  'Call transferred to Flight Department. Agent joined channel.'
);
check(
  'interpolate keeps unknown placeholders',
  interpolate(TRANSLATIONS.en.errors.callDetailFailed, { id: 42 }),
  'Could not load the full detail for call #42: {reason}'
);

// Per-language text is genuinely different, not copied English
check('ar title differs from en', TRANSLATIONS.ar.live.title !== TRANSLATIONS.en.live.title, true);
check('am title differs from en', TRANSLATIONS.am.live.title !== TRANSLATIONS.en.live.title, true);
check('he title differs from en', TRANSLATIONS.he.live.title !== TRANSLATIONS.en.live.title, true);

console.log(failures === 0 ? '\nOK: translation helpers behave correctly' : `\nFAIL: ${failures} check(s)`);
process.exit(failures === 0 ? 0 : 1);

