# Changelog

All notable user-facing changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
