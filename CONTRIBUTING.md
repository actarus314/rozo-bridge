# Contributing

This is a small, solo-maintained utility — there's no formal process, but bug
reports, fixes, and small improvements are welcome.

## Before opening a PR

- For anything beyond a small fix, open an issue first to discuss the approach.
- Run it locally (`cd web && python3 serve.py`, see the [README](README.md))
  and check the change actually works in a browser — there's no test suite.
- Keep code and comments in **English** (the app's own French/English UI
  strings in `web/assets/app.js`'s `I18N` object are the one exception —
  that's user-facing content, not code comments).
- Don't edit `web/assets/walletkit.js` — it's a vendored third-party bundle
  (see the comment at the top of the file for how it's built).
- No build step, no new dependencies for what a few lines of vanilla JS/CSS
  can do — this project is deliberately dependency-free.

## Reporting a bug

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) — include
the direction (Base→Stellar or Stellar→Base), whether a wallet was connected,
and any browser console errors.

## Security issues

Don't open a public issue for a security concern — see [SECURITY.md](SECURITY.md).
