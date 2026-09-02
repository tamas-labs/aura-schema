# Changelog

The format follows the recommendations of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The **contract** version (`contract.json` → `version`) is independent of the package version:
the package version tracks packaging, while the contract version tracks what Aura expects on
the wire.

## [Unreleased]

### Added

**New standalone document: `schema/aura-error-report.schema.json`** — the batch that Aura
POSTs to `errorReportingEndpoint` when `errorReporting: true`. **The contract version remains
`1.0`**: this does not modify the request/response, but adds a third entry point — the package
version gets a minor bump, while `contract.json` → `version` does not.

- The document describes the `{ "errors": [ … ] }` batch. Required fields per entry are:
  `severity`, `level`, `timestamp`, `component`, `action`, `type`, `message`; optional fields are
  `key`, `details`, `metadata`, `count`, `lastTimestamp`, `id`, `stack`.
- **Entries have `additionalProperties: true`.** Aura's payload may grow (`storeId`, `version`,
  and `batchId` are candidates); a receiver that rejects the batch for this reason will reject it
  forever — the client retries every non-2xx response four times, then retries with exponential
  backoff.
- **`count` and `lastTimestamp` are optional**: they are absent until an error has occurred more
  than once, so the count is `count ?? 1`.
- The batch has `minItems: 1` — the client does not flush an empty queue.
- Also included are `schema/examples/error-report.json`, the
  `schema/bundled/aura-error-report.bundle.json` bundle, the generated `AuraErrorReport` type,
  the `validateAuraErrorReport()` function on the `/validate` subpath, and
  `AuraSchema::errorReportPath()` on the PHP side.

### Fixed

> The release under the `[1.0.0]` section **has not been tagged yet** — the fixes below will
> therefore be included in that tag when it is created, not in a subsequent release.

Seven descriptions said the opposite of what Aura actually does. **None of these are
validation changes** — the documents accept and reject exactly the same payloads as before —
but anyone writing a payload based on the schema description would previously have written a
non-working payload. Each fix is verified against the source read by the client
(`evaluate-condition.ts`, `TableBodyRow.tsx`, `resolve-value.util.ts`), not inferred.

- **`body.columnConfigs` is keyed by the cell's `field`, not its `key`.** A multi-field cell
  receives one entry per field. The sole exception is `cellRules`, which Aura reads from the
  entry named after the column's `key` — the description previously said `key` for both, and a
  config keyed by `key` silently fails to render.
- **`conditionalConfig.key` has no default.** The description said “defaults to the column key”;
  in reality, without a string `key`, Aura **skips the conditions** and applies the base config.
  This is fail-open: conditional hiding simply does not happen.
- **`true` and `false` use exact equality**, not truthiness/falsiness. `fieldValue === true`, so
  a `tinyint` `1` sent as a number never matches.
- **`empty` considers both `0` and `false` empty**, but **not** an empty array or object — the
  description listed this exactly backwards. `notEmpty` is its negation.
- **`null` means exactly `null`, while `notNull` means everything else.** A field missing from
  the row resolves to `undefined`: it does **not** match `null`, but it **does** match `notNull`.
- **`eq` / `ne` / `in` / `notIn` use strict comparison** (`===`), without coercion: `1` and
  `"1"` never match. A decimal serialized as a string therefore never matches a number.
- **`gt` / `gte` / `lt` / `lte` / `between` try a date first, then require numbers on both sides.**
  With a numeric string (`"12.50"`), the comparison is **silently false**.

## [1.0.0] – 2026-08-27

The first release. The contract version is **1.0** — content-wise, it is exactly what previously
lived in the `aura` repository's `docs/schema/` directory, with one change: the `$id`s point to
the new canonical location.

### Added

- **The canonical home of the contract.** 16 JSON Schema documents (draft 2020-12) under
  `schema/`, plus the `request` / `response` examples. They previously lived in the `aura`
  repository and were copied manually into `laravel-aura` — two copies, two sources of truth,
  and neither was validated.
- **`contract.json`** — the contract manifest: version, dialect, `$id` base URI, entry points,
  bundles, examples, and the complete file list. Both package formats read it, so the version
  cannot drift between the two languages.
- **npm package** (`@tamas-labs/aura-schema`): the main entry point provides the documents
  (`allSchemas`, `schemasById`, per-document exports) and metadata
  (`AURA_CONTRACT_VERSION`, `AURA_SCHEMA_DIALECT`, `AURA_SCHEMA_BASE_URI`) without runtime
  dependencies.
- **Generated TypeScript payload types** (`AuraResponse`, `AuraRequest`, and the ~65 types built
  from them), generated directly from the schemas. No hand-written parallel source of truth.
- **`@tamas-labs/aura-schema/validate`** subpath: `validateAuraResponse`, `validateAuraRequest`,
  and `createAuraValidator`. `ajv` is an optional peer so the main entry point remains
  dependency-free.
- **Composer package** (`tamas-labs/aura-schema`): `TamasLabs\AuraSchema\AuraSchema` — a file
  locator with `VERSION`, `BASE_URI`, `directory()`, `path()`, `get()`, `all()`, `bundlePath()`,
  and `examplePath()` methods. Zero Composer dependencies: the consumer supplies the validator.
- **Bundles** (`schema/bundled/*.bundle.json`): one self-contained document per entry point —
  reachable `$defs` merged together and `$ref`s rewritten to local pointers. For tools that
  cannot resolve references across files.
- **Test suite (29 tests).** These had not run anywhere before:
    - shipped examples validate against their own schemas;
    - every `$id` matches the file's own path;
    - every cross-file `$ref` resolves within the published set;
    - the manifest's file list exactly matches the files on disk;
    - the PHP `VERSION` matches the `contract.json` version;
    - bundles accept and reject exactly the same payloads as the split schemas;
    - payloads described by the generated types also pass the validator.
- **Drift gates.** `schema/*.json` is the source; `bundled/`, `src/schemas.generated.ts`, and
  `src/types/contract.ts` are generated. `npm run quality` (and therefore CI) fails when a
  generated file is stale.
- **CI**: Node 20/22 on the JavaScript side, PHP 8.3/8.4 on the PHP side.

### Note

With this release, the `aura` `docs/schema/` directory and the `laravel-aura`
`.claude/docs/schema/` directory became copies. The **NY1** question in the `laravel-aura`
action plan (“where does the schema live canonically?”) is settled: here.
