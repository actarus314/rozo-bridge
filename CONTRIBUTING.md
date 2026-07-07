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
- User-facing change (a fix, a feature, a behavior change)? Add a line under
  `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md).

## Reporting a bug

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) — include
the direction (Base→Stellar or Stellar→Base), whether a wallet was connected,
and any browser console errors.

## Security issues

Don't open a public issue for a security concern — see [SECURITY.md](SECURITY.md).

## Cutting a release

- Bump the version in `package.json` (hand-maintained — no build step reads it) AND move the
  `[Unreleased]` entries in `CHANGELOG.md` under a new `[x.y.z] - YYYY-MM-DD` heading, AND bump the footer
  version string (`#appVersion` in `web/rozo-bridge.html`) — all in the SAME commit. Since #25 the footer
  shows the DEPLOYED version (baked into the HTML) and only appends a "newer version available" note when a
  newer release exists, so a stale footer would mislabel the deploy.
- Tag THAT commit (`git tag -a vX.Y.Z -m "..."`) and publish a GitHub Release from that tag. (Tagging must
  land on the commit that already contains the bumped version, so `git checkout vX.Y.Z` shows a matching
  `package.json` — don't tag a commit one step ahead of the bump.)
- Make the new version's `CHANGELOG.md` heading an **inline link on the version number**, pointing to its release:
  `## [X.Y.Z](https://github.com/actarus314/rozo-bridge/releases/tag/vX.Y.Z) - YYYY-MM-DD`.
