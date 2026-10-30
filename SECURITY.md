# Dependency security

## Current maintenance — 30 October 2026

The follow-up audit found nine affected-package entries (two high, seven moderate). The full audit and production-only audit now report **zero known vulnerabilities**, after a clean dependency installation. This is a registry snapshot, not a claim that software has no undiscovered flaws.

- Vite 8.2.2 → 8.2.4.
- Cloudflare Vite plugin 1.64.0 → 1.66.0, Wrangler 4.151.0 → 4.154.0, Workers types 5.20261023.1. Their refreshed tree uses patched Undici.
- Vinext 1.0.0-beta.9 → 1.0.0, which uses @vercel/og 1.0.3 and Satori 0.33.5. React remains 19.2.8; the stable Vinext release supports that version.
- Refreshed fast-uri to 3.1.9.
- Satori 0.33.5 pins fflate 0.7.3, so its dependency edge is overridden to the compatible patch 0.7.5, addressing [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98). No advisory output is suppressed. Remove that scoped override once Satori requests a patched version itself.
- Removed fourteen unused starter UI dependencies and their unused helper/configuration.

The fast-glob adapter below is still required by the current upstream import scanner. Neither save keys nor the version-7 save format changed. The all-fields legacy migration test and browser regressions cover saved achievements, sakuras, exploration, final checkpoints, companion, personality and historical race records. Public player storage is not used by tests.

## Previous maintenance — 17 October 2026

This maintenance update addresses the advisories detected in Gravi's installed dependency tree. `npm audit` reports vulnerable packages and affected parents separately; its counts are not counts of distinct exploitable flaws in the published game.

## Findings and remediation

| Dependency / advisory                                                                                                                                                                                  | Before                                                                                            | Remediation                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [tinypool: worker-option prototype pollution and code execution](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [additional run-option gadget](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) | 2.1.0 through the formatter                                                                       | Updated oxfmt 0.61.0 → 0.73.0, which uses tinypool 2.2.0. Development tool, not game code.                                                                                                       |
| [proxy-addr: IP spoofing](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) and [MCP SDK: OAuth credential forwarding](https://github.com/advisories/GHSA-6qxp-vccf-f47h)                             | Through the unused shadcn CLI                                                                     | Removed the CLI dependency. Existing components and their runtime packages remain available. Gravi does not use this CLI's server or OAuth flows.                                                |
| [undici: TLS validation bypass](https://github.com/advisories/GHSA-w293-vg96-wgc3), plus denial-of-service and response-handling advisories                                                            | 7.29.0 through local Worker tooling                                                               | Updated Cloudflare Vite plugin 1.54.4 → 1.64.0 and Wrangler 4.129.0 → 4.151.0; Miniflare now uses undici 7.29.1. Updated Workers types to match the supported peer range.                        |
| [source-map-js: event-loop denial of service](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)                                                                                                       | 1.2.1 through CSS tooling                                                                         | Refreshed the lockfile to patched 1.2.2.                                                                                                                                                         |
| [sharp: libheif issues](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), [librsvg use-after-free](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)                                                | 0.35.2 through local Worker tooling                                                               | The updated Miniflare uses sharp 0.35.5.                                                                                                                                                         |
| [braces: unbounded recursion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)                                                                                                                       | 3.0.3 through vinext → vite-plugin-commonjs → vite-plugin-dynamic-import → fast-glob → micromatch | No patched release was available. Replaced only the dynamic-import plugin's fast-glob dependency with the local adapter described below, removing braces and micromatch from the installed tree. |

Other propagated alerts involving Express, glob helpers, schema validation and formatting dependencies disappeared with the CLI removal and lockfile refresh. React, Vinext, Three.js, gameplay rules and save schema are unchanged.

## Scoped glob compatibility adapter

`tools/fast-glob-compat` delegates file matching to [tinyglobby](https://github.com/SuperchupuDev/tinyglobby) 0.2.17, using fdir and picomatch instead of braces. The npm override targets **only** `vite-plugin-dynamic-import`'s dependency edge. A direct local development dependency gives npm a stable `$fast-glob` reference and permits clean `npm ci` installations.

The upstream consumer at version 1.6.0 calls `sync(patterns, { cwd })`. The adapter supports that operation and the corresponding asynchronous operation, including extension braces and exclusions. It intentionally rejects unsupported fast-glob options. Pattern length is bounded to 4096 characters and brace nesting to 32 levels before reaching the matcher. It does not filter audit output or suppress advisories.

`tests/build-glob.test.mjs` resolves the scanner from the actual upstream plugin, checks filesystem matching and excludes directories, then checks rejection of deeply nested, oversized and invalid inputs. Normal build output and browser checks additionally exercise the real dependency tree. Remove this override when the upstream chain has a reviewed patched replacement, then repeat the checks below.

The formatter update and fresh dependency resolution also exposed lint checks of Node's test registration. The lint configuration permits only `node:test`'s `test()` registration calls in test files: Node's runner owns these promises. Promise checks remain enabled for other calls and application code. The CommonJS adapter documents its single `require` exception for compatibility with the upstream consumer.

## Audit snapshot

- Before: 43 affected-package entries: 6 critical, 24 high, 13 moderate.
- After a clean installation: 0 known vulnerabilities across the complete installed tree, including development dependencies.
- Production-only audit also checked separately.

These are the registry's known advisories at verification time, not a guarantee about future disclosures.

## Reproduce

```sh
npm ci
npm audit
npm audit --omit=dev
npm test
npx tsc --noEmit
npm run lint
npx oxfmt --check .
npm run build
```

Keep `package-lock.json` and the local adapter together. Do not use `npm audit fix --force`: it may suggest unrelated major changes or downgrades. Verify browser startup, companion switching, tutorial, gravity selection, map and saved achievements in an isolated browser profile. Never reset the public player's save to test a security update.
