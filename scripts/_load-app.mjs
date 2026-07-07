// Load web/assets/{i18n,app}.js in a headless sandbox (no DOM) and return the populated `window` stub.
// They're classic browser scripts (zero build): i18n.js declares I18N (exposing window.I18N) and app.js reads it +
// exposes window._model. In the page they're two <script> tags sharing the global scope; here we concatenate them
// (i18n first) to mirror that. The dev/CI checks (check-i18n, test-model) reach those offline through this.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export function loadApp() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const rd = f => readFileSync(join(root, f), 'utf8');
  const src = rd('web/assets/i18n.js') + '\n' + rd('web/assets/app.js');   // i18n.js loads BEFORE app.js in the page
  // universal stub: any get/call/construct returns itself (so DOM/network calls are no-ops); `then` is
  // undefined so `await stub` doesn't hang; set stores on the target so `window.I18N = …` is readable back.
  const u = new Proxy(function () {}, {
    get: (t, p) => {
      if (p === 'then') return undefined;              // not thenable → `await stub` returns immediately
      if (p === Symbol.toPrimitive) return () => 0;    // coerce to 0 so the DOM-tail's canvas math doesn't throw
      return p in t ? t[p] : u;
    },
    set: (t, p, v) => { t[p] = v; return true; },
    apply: () => u, construct: () => u,
  });
  const ctx = vm.createContext({
    window: u, document: u, localStorage: u, navigator: u, location: u, fetch: u, AbortSignal: u,
    setTimeout: u, setInterval: u, clearTimeout: u, clearInterval: u, requestAnimationFrame: u,
    addEventListener: u, getComputedStyle: u, URL: u, Blob: u, FileReader: u, console,
  });
  // The bootstrap tail of app.js touches the real DOM (canvas sizing, etc.) and throws in this headless
  // sandbox — by then I18N and _model are already defined, so the throw is expected and ignored.
  try { vm.runInContext(src, ctx, { timeout: 5000 }); } catch { /* headless DOM tail — ignore */ }
  return u; // window.I18N, window._model
}
