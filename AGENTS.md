# git-whproxy — istruzioni per gli agenti

## Progetto e struttura

Proxy HTTP per webhook dei servizi Git, scritto in JavaScript ESM (`type: module`), senza build, database o frontend.

- `src/server.js`: applicazione Express 5, logging con `loglevel`, parsing testuale del JSON, rotta `POST /wh` e inoltro tramite `fetch` nativo.
- `src/util.js`: `wildcardMatch(wildcard, str)`, usata dalla rotta; confronto completo, senza distinzione tra maiuscole e minuscole, con `*` e `?` e caratteri regex letterali escapati.
- `package.json` e `pnpm-lock.yaml`: script e dipendenze gestiti con pnpm. `cors` è dichiarato ma non utilizzato dal server.
- `Dockerfile`: runtime `node:24.21.0-alpine`, installazione delle sole dipendenze di produzione e processo eseguito dall'utente non privilegiato `app`.
- `api.http`: esempio manuale di webhook Forgejo/GitHub/Gitea/Gogs; contiene una destinazione di rete reale, da sostituire con un listener locale per le prove.

## Avvio e configurazione

Usare Node.js 24.21.0 LTS (versione fissata in `.node-version`), in linea con il container, e pnpm nella versione indicata da `packageManager`, con il lockfile esistente. Anteporre `rtk` ai comandi shell come richiesto da `@/home/marcuson/.codex/RTK.md`.

```sh
rtk pnpm install --frozen-lockfile
rtk pnpm start
rtk pnpm run start:watch
```

`start` avvia il server; `start:watch` lo avvia con il riavvio automatico. Le variabili lette sono `PORT` (default `3000`) e `LOG_LEVEL` (default `info`). Non è presente un caricatore di file `.env`: passare le variabili nell'ambiente del processo.

## Contratto attuale della rotta

- `POST /wh` accetta `Content-Type: application/json`, conservando il body come testo tramite `body-parser.text`; il JSON viene letto separatamente per estrarre `ref`.
- Il filtro opzionale `refMatch` si applica all'ultimo segmento di `ref`, dopo lo split su `/`, non al riferimento completo. Un riferimento assente diventa una stringa vuota.
- Se il filtro non corrisponde, risponde `200` con `{ success: true, msg: "not forwarded: ref not match" }`, senza contattare la destinazione.
- `forwardUrl` e `forwardMethod` arrivano dalla query string e sono passati a `fetch` con gli header ricevuti e il body originale, senza normalizzazione esplicita degli header.
- Per una risposta upstream con `ok: true`, usa lo stato upstream e genera `{ success: true, msg: "ok" }`; non restituisce il body upstream. Risposte upstream non riuscite ed eccezioni di inoltro producono `500`.

Conservare il body originale durante l'inoltro: serializzare nuovamente il JSON può invalidare le firme dei webhook. Non modificare filtro, codici di risposta o schema JSON incidentalmente.

## Modifiche e verifiche

Mantenere lo stile esistente: import ESM con estensione `.js`, virgolette doppie, punto e virgola e indentazione di due spazi. Preferire modifiche nei due moduli esistenti e funzionalità native, evitando nuove dipendenze o livelli di astrazione senza necessità concreta. Aggiornare il lockfile insieme alle dipendenze.

Non esistono script di test, lint o build. Per modifiche JavaScript controllare almeno la sintassi:

```sh
rtk node --check src/server.js
rtk node --check src/util.js
```

Per modifiche al matcher aggiungere una verifica eseguibile con assert nativi che copra `*`, `?`, case-insensitivity e caratteri regex letterali. Per modifiche alla rotta usare un listener HTTP locale e verificare filtro corrispondente/non corrispondente, body originale, errore upstream ed errore di connessione. Non inoltrare le prove alla destinazione di `api.http`.

Limiti da considerare quando si toccano queste aree: nessuna validazione esplicita dei parametri di query, autenticazione, verifica delle firme, restrizione delle destinazioni o timeout applicativo di inoltro. `JSON.parse` e l'estrazione di `ref` precedono il `try` dell'inoltro; il logger globale precede il parser della rotta e quindi normalmente non vede il body parsato. Evitare di registrare segreti o payload sensibili. Questi sono comportamenti attuali, non garanzie di sicurezza né richieste di ampliarli in ogni modifica.

## Documentazione e contenuto generato

Usare Context7 per domande su API, configurazione o uso di librerie e strumenti: prima `resolve-library-id`, poi `query-docs` sul concetto pertinente. Per comprendere il comportamento locale verificare il sorgente, rispettando il workflow GitNexus sotto.

La sezione delimitata dai marker GitNexus è generata: mantenerla intatta negli aggiornamenti manuali di questo file. Per aggiornare soltanto l'indice usare la modalità `--index-only`, evitando la riscrittura dei documenti generati.

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
