# Security Policy

This is a personal, unofficial, **client-side only** tool — see the
[disclaimer in the README](README.md). There is no backend, no database, and
no server-side component to compromise: everything runs in the visitor's
browser and talks directly to Rozo's public API and to Stellar/Base RPC
endpoints. It never holds custody of funds — every transfer is signed by the
user's own wallet.

That said, real bugs here can have real consequences (a malformed transaction,
a misleading fee/liquidity display, an XSS via unescaped API data). Reports
are taken seriously.

## Reporting a vulnerability

Preferred: use GitHub's **private vulnerability reporting** —
[Security tab → Report a vulnerability](https://github.com/actarus314/rozo-bridge/security/advisories/new)
on this repo. This keeps the report private until a fix is out.

If that's not available to you, open a regular issue with as few sensitive
details as possible and ask to be contacted privately, or reach
[@actarus314](https://github.com/actarus314) directly.

## Scope

In scope: this repo's own code (`web/`, `CLI/`) — e.g. unescaped/unsanitized
data reaching the DOM, a transaction built with the wrong recipient/amount/
memo, a wallet-connection flow that misbehaves.

Out of scope: `web/assets/walletkit.js` (vendored third-party bundle — report
upstream to [`@creit.tech/stellar-wallets-kit`](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
instead), and Rozo's own API/infrastructure (report to Rozo directly, see
their contact info in the app's Documentation tab).

## Known accepted findings

Dependabot flags several transitive vulnerabilities (protobufjs, uuid,
elliptic — via `@trezor/*` and `@solana/wallet-adapter-base`, pulled in by
`@creit.tech/stellar-wallets-kit`'s own dependency tree). These are **dev-time
only**: they live in `node_modules/` (gitignored, never shipped) and are only
used by Ledger/Trezor/Solana code paths that `scripts/build-walletkit.mjs`
doesn't import into the vendored bundle at all (see the entry list in that
file). `npm audit fix` (non-breaking) resolves none of them — only
`--force`, which would downgrade `stellar-wallets-kit` to a much older,
unmaintained version. Revisit when upstream bumps its own Ledger/Trezor
dependencies.

## Response

This is maintained solo, best-effort, no SLA — but security reports get
priority over everything else in the backlog.
