# Changelog

All notable user-facing changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- CLI `--json` flag (`rozo-quote.sh`): machine-readable output on any subcommand for piping into jq/spreadsheets (`curve` emits NDJSON).
- Unofficial / not-affiliated-with-Rozo badge on the Bridge top bar, and a first-run onboarding hint on the empty Bridge tab.
- Touch support for the fee-curve tooltip (previously mouse-hover only).
- Dev/CI self-checks: a fee-model invariant test and an i18n fr/en parity check, run by a new CI workflow (syntax + parity + model).

### Changed
- Reworded the release-cutting checklist in CONTRIBUTING.md so the version bump + CHANGELOG entries land in the same commit that gets tagged (both past releases had tagged a commit one step ahead of the bump).
- Extracted the pure fee-model math into `computeSplit()` so it can be tested in isolation — no behaviour change.
- Larger `max` button tap target and a narrow-screen top-bar reflow for mobile.

### Fixed
- Offline quote state: a mid-session network failure now shows a clearly labelled offline estimate and clears the split table, instead of leaving an endless "pricing chunks…" spinner.
- Footer fallback version bumped to v1.1.0; corrected the `#pWhyRange` static HTML fallback so it matches the live i18n text.
- Added a 3s timeout to the GitHub release fetch that fills the footer version, so a stalled response fails fast.
- Fixed a shell→python argument-injection risk on the CLI hub-balance line by passing the untrusted RPC value through the environment, consistent with the rest of the script.
- Corrected stale paths and dangling doc references in `CLI/README.md` and `CLI/rozo-quote.sh` (pointing at files not in the public repo).

### Removed
- Dropped the orphan `stellarWalletMismatch` i18n key (fr/en, unused) and the unused `addr` parameter of `syncFromWallet`.

### Security
- `web/serve.py` now sends `X-Content-Type-Options: nosniff` / `X-Frame-Options: DENY` on every response and denies dotfile/`.bak` requests on the static file path (defense-in-depth; the server is loopback-only).

## [1.1.0] - 2026-07-07

### Added
- Footer showing the deployed app version, read live from GitHub's releases API (falls back to a static tag if the API is unreachable).

### Fixed
- Pinned `protobufjs` and `uuid` (dev-only, transitive via the vendored wallet-connect bundle's dependency tree) to patched versions, resolving the corresponding Dependabot alerts. `elliptic` remains open — no patched version exists upstream yet (see [SECURITY.md](SECURITY.md)).

## [1.0.0] - 2026-07-07

Initial public release.

### Added
- Client-side fee quote & split calculator for the Rozo EURC bridge (Base ⇄ Stellar): exact `dryrun` quotes, best-split recommendation, live liquidity check in both directions.
- Generate/sign/track flow for real Rozo intents — EVM wallets (Base) and Stellar Wallets Kit (Albedo, Freighter, Hana, Lobstr, Rabet, xBull).
- Documentation tab deriving the reverse-engineered fee model (measurement method, formulas, measured accuracy).
- Dispersion tab tracking how real, generated Stellar→Base batches land against the projected min/max range.
- Command-line quote tool (`CLI/rozo-quote.sh`).
- Light/dark theme, FR/EN UI.
- MIT license and GitHub community health files (Code of Conduct, Contributing, Security policy, issue/PR templates).
- Dev-only tooling (`scripts/build-walletkit.mjs`) to reproducibly rebuild the vendored wallet-connect bundle.
