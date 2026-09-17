# git-whproxy — agent instructions

## Language

Always use English for source code, identifiers, comments, documentation, and all other project file content, regardless of the language used in the conversation. Conversation replies may use the user's language. Apply this rule to new content and when updating existing project files.

## Project and structure

HTTP proxy for Git service webhooks, written in JavaScript ESM (`type: module`), with no compilation step, database, or frontend.

- `src/server.js`: Express 5 application, `loglevel` logging, text-based JSON parsing, the `POST /wh` route, and forwarding through native `fetch`.
- `src/util.js`: `wildcardMatch(wildcard, str)`, used by the route; full-string, case-insensitive matching with `*` and `?`, escaping literal regex characters.
- `package.json` and `pnpm-lock.yaml`: scripts and dependencies managed with pnpm. `cors` is declared but not used by the server.
- `pnpm-workspace.yaml`: explicit dependency build policy; native bindings use prebuilt packages instead of running build scripts for `@parcel/watcher` and `unrs-resolver`.
- `.github/workflows/release.yml`: formatting, lint, and unit tests run before release. Only pushes or manual runs on `main`, `beta`, and `alpha` can reach the publishing job; pull requests only run checks.
- `Dockerfile`: `node:24.21.0-alpine` runtime, production-only dependency installation, and execution as the unprivileged `app` user.
- `compose.yaml`: local echo listener for inspecting forwarded webhooks, exposed at `localhost:9120`.
- `api.http`: manual GitHub/Forgejo/Gitea/Gogs webhook examples targeting the local listener, including filter mismatch and upstream error cases.
- `test/unit`: Jest tests for the matcher and webhook handler; ESM configuration in `test/jest.config.js`.

## Startup and configuration

Use Node.js 24.21.0 LTS (pinned in `.node-version`), matching the container, and the pnpm version specified by `packageManager`, with the existing lockfile. Prefix shell commands with `rtk` as required by `@/home/marcuson/.codex/RTK.md`.

```sh
rtk pnpm install --frozen-lockfile
rtk pnpm start
rtk pnpm run start:watch
```

`start` runs the server; `start:watch` enables automatic restarts. The supported environment variables are `PORT` (default `3000`) and `LOG_LEVEL` (default `info`). There is no `.env` file loader: supply variables through the process environment.

## Current route contract

- `POST /wh` accepts `Content-Type: application/json`, preserving the body as text through `body-parser.text`; JSON is parsed separately to extract `ref`.
- The optional `refMatch` filter applies to the last segment of `ref`, after splitting on `/`, rather than to the full reference. A missing reference becomes an empty string.
- A filter mismatch returns `200` with `{ success: true, msg: "not forwarded: ref not match" }`, without contacting the destination.
- `forwardUrl` and `forwardMethod` come from the query string and are passed to `fetch` along with incoming headers and the original body, without explicit header normalization.
- An upstream response with `ok: true` uses the upstream status and generates `{ success: true, msg: "ok" }`; it does not return the upstream body. Unsuccessful upstream responses and forwarding exceptions produce `500`.

Preserve the original body during forwarding: serializing JSON again can invalidate webhook signatures. Do not change filtering, response codes, or the JSON schema incidentally.

## Changes and verification

Follow the existing style: ESM imports with `.js` extensions, single quotes as configured in `.prettierrc`, semicolons, and two-space indentation. Prefer changes in the existing two modules and native features, avoiding new dependencies or abstraction layers without a concrete need. Update the lockfile alongside dependencies.

Unit tests are in `test/unit`, using Jest in ESM mode with configuration in `test/jest.config.js` (the `unit` project). Use the existing scripts:

```sh
rtk pnpm test
rtk pnpm run test:cov
rtk pnpm run test:watch
```

`pnpm test` runs `test:unit`; coverage reports are written to `coverage/`. Server tests capture the registered handler by mocking Express and `fetch`: they do not open ports or contact real destinations. Do not replace this configuration with TypeScript transformers: the project uses JavaScript ESM. The manifest includes `test:e2e` scripts, but no e2e project is configured yet.

Other scripts include `format`/`format:check` (Prettier), `lint:check`/`lint` (ESLint), and `docker:*`. Formatting and lint scripts target `src/**/*.js` and `test/**/*.js`. Run `format:check` and `lint:check` for read-only checks; `format` and `lint` apply fixes. ESLint currently enforces Prettier formatting, without a separate set of semantic lint rules. Do not run publishing or release scripts to verify a local change. For JavaScript changes, also check syntax:

```sh
rtk node --check src/server.js
rtk node --check src/util.js
```

For matcher changes, update `test/unit/util.test.js` (wildcards, full-string matching, case-insensitivity, and literal regex characters). For route changes, update `test/unit/server.test.js` (filtering, original body/headers, upstream outcomes, and exceptions). Use only a local listener for additional HTTP checks.

Limitations to consider when changing these areas: no explicit query parameter validation, authentication, signature verification, destination restrictions, or application-level forwarding timeout. `JSON.parse` and reference extraction precede the forwarding `try` block; the global logger precedes the route parser and therefore normally cannot see the parsed body. Avoid logging secrets or sensitive payloads. These are current behaviors, not security guarantees or requirements to expand them in every change.

## Documentation and generated content

Use Context7 for questions about library and tool APIs, configuration, or usage: first `resolve-library-id`, then `query-docs` for the relevant concept. To understand local behavior, verify the source while following the GitNexus workflow below.

The section delimited by the GitNexus markers is generated: preserve it in manual updates to this file. To update only the index, use `--index-only` to avoid rewriting generated documents.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **git-whproxy** (16 symbols, 23 relationships, 0 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/git-whproxy/context` | Codebase overview, check index freshness |
| `gitnexus://repo/git-whproxy/clusters` | All functional areas |
| `gitnexus://repo/git-whproxy/processes` | All execution flows |
| `gitnexus://repo/git-whproxy/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
