// Dev/CI check: the two hand-maintained i18n dictionaries (I18N.fr / I18N.en in app.js) must have the
// SAME key set. This has broken silently before (PR #14 removed 10 orphan keys), so gate it.
//   node scripts/check-i18n.mjs   (also `npm run check:i18n`, and a CI step)
import assert from 'node:assert/strict';
import { loadApp } from './_load-app.mjs';

const I = loadApp().I18N;
assert.ok(I && I.fr && I.en, 'window.I18N is not exposed by app.js');

const fr = Object.keys(I.fr), en = Object.keys(I.en);
const sfr = new Set(fr), sen = new Set(en);
const onlyFr = fr.filter(k => !sen.has(k)), onlyEn = en.filter(k => !sfr.has(k));

if (onlyFr.length || onlyEn.length || fr.length !== en.length) {
  console.error(`i18n parity FAILED: fr=${fr.length} keys, en=${en.length} keys`);
  if (onlyFr.length) console.error(`  only in fr: ${onlyFr.join(', ')}`);
  if (onlyEn.length) console.error(`  only in en: ${onlyEn.join(', ')}`);
  process.exit(1);
}
console.log(`✓ i18n parity: fr = en = ${fr.length} keys`);
