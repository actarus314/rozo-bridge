// Regenerates web/assets/walletkit.js from the installed
// @creit.tech/stellar-wallets-kit version. Dev-only — the app itself has
// no build step; this just keeps the vendored bundle reproducible and
// visible to Dependabot. Run: npm run build:walletkit
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkgPath = new URL(
  "../node_modules/@creit.tech/stellar-wallets-kit/package.json",
  import.meta.url
);
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));

// Only the wallet modules actually used by web/assets/wallet.js — keeps the
// bundle free of unused modules (WalletConnect, Ledger, Trezor, D'CENT...)
// and their heavier dependencies.
const entry = `
export { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
export { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
export { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
export { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
export { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
export { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
export { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
`;

await build({
  stdin: { contents: entry, resolveDir: process.cwd() },
  bundle: true,
  format: "esm",
  outfile: "web/assets/walletkit.js",
  banner: {
    js: `// @creit.tech/stellar-wallets-kit@${version} — vendored bundle (esbuild); regenerate: npm run build:walletkit`,
  },
});

console.log(`web/assets/walletkit.js rebuilt — @creit.tech/stellar-wallets-kit@${version}`);
