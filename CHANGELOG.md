# Changelog

All notable user-facing changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.2.1] - 2026-07-07

### Fixed
- The footer now shows the **deployed** version instead of the repository's latest release (it used to overwrite its text with whatever release was newest), and it appends a discreet "newer version available ↗" link only when the deployed build is actually behind a release.
- The split-fee table no longer stays stuck loading after generating an intent, and no longer reports live data as unavailable when switching back to that route: creating intents now re-prices the table against the updated liquidity, and a cleared quote cache is handled defensively instead of throwing.

## [1.2.0] - 2026-07-07

### Added
- A hosted demo on GitHub Pages (unofficial): <https://actarus314.github.io/rozo-bridge/> — the same client-side app, deployed from `web/`.
- CLI `--json` flag (`rozo-quote.sh`): machine-readable output on any subcommand for piping into jq/spreadsheets (`curve` emits NDJSON).
- Export the batch history: a CSV (one row per chunk — dates, direction, amounts, fee, intent id, deposit tx) and a full JSON, for reconciliation/accounting.
- Regenerate only the expired, unsigned chunks of a batch: fresh intents for those rows, already-signed chunks kept (on Stellar→Base this re-reserves only the regenerated amounts).
- Unofficial / not-affiliated-with-Rozo badge on the Bridge top bar, and a first-run onboarding hint on the empty Bridge tab.
- The footer app version now links to the project's GitHub repository.
- Wallet buttons now hint that quotes and liquidity work without a wallet — only signing needs one.
- Touch support for the fee-curve tooltip (previously mouse-hover only).
- Dev/CI self-checks: a fee-model invariant test and an i18n fr/en parity check, run by a new CI workflow (syntax + parity + model).

### Changed
- Reworded the release-cutting checklist in CONTRIBUTING.md so the version bump + CHANGELOG entries land in the same commit that gets tagged (both past releases had tagged a commit one step ahead of the bump).
- Extracted the pure fee-model math into `computeSplit()` so it can be tested in isolation — no behaviour change.
- Gathered the fee-model tuning knobs into one block and deduplicated the on-chain balance readers (internal; no behaviour change).
- Folded the last inline fr/en UI strings into the i18n dictionary and moved it to its own `assets/i18n.js`, so the fr/en parity check now covers the whole interface (internal; no behaviour change).
- The high-fees advice no longer implies a fixed ~10 min refill: hub refills are desk-driven and unpredictable (from ~10 min to several hours).
- Larger `max` button tap target and a narrow-screen top-bar reflow for mobile.
- Reworded and aerated the in-app Documentation (the min/max fee-range explanation) for readability — one idea per line.
- Removed the inverse fee planner (an unreleased work-in-progress that was never part of a shipped version).

### Fixed
- The fee-curve chart's x-axis now auto-scales to the live liquidity, so the cap line and its label no longer clip or fall off-frame when the hub's liquidity exceeds the previously hard-coded range.
- The batch "liquidity reserved" banner is now direction-aware: Base→Stellar (which doesn't reserve the hub's Available) no longer claims it does — it shows only the frozen-fee note.
- Corrected the documented measured accuracy of the max estimate to ≤0.04€ (matching the model's own measurement) in the app's Documentation tab and the README, and clarified there that the chart's cap line is the Rozo API's Available (≈ the hub's on-chain balance).
- Offline quote state: a mid-session network failure now shows a clearly labelled offline estimate and clears the split table, instead of leaving an endless "pricing chunks…" spinner.
- Kept the footer's static fallback version in sync with the release, and corrected the `#pWhyRange` static HTML fallback so it matches the live i18n text.
- Added a 3s timeout to the GitHub release fetch that fills the footer version, so a stalled response fails fast.
- Fixed a shell→python argument-injection risk on the CLI hub-balance line by passing the untrusted RPC value through the environment, consistent with the rest of the script.
- Corrected stale paths and dangling doc references in `CLI/README.md` and `CLI/rozo-quote.sh` (pointing at files not in the public repo).

### Removed
- Dropped the orphan `stellarWalletMismatch` i18n key (fr/en, unused) and the unused `addr` parameter of `syncFromWallet`.

### Security
- `web/serve.py` now sends `X-Content-Type-Options: nosniff` / `X-Frame-Options: DENY` on every response and denies dotfile/`.bak` requests on the static file path (defense-in-depth; the server is loopback-only).
- The CI workflow now runs with a least-privilege `GITHUB_TOKEN` (`contents: read`).

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
