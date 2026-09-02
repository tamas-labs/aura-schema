# @tamas-labs/aura-schema

The canonical definition of the **Aura wire contract** — the JSON an
[Aura](https://github.com/tamas-labs/aura) data table sends to its endpoint, and the JSON it
expects back.

One set of JSON Schema documents, published twice: as an npm package for the TypeScript side and
as a Composer package for the PHP side. Every Aura package reads the contract from here instead of
carrying its own copy.

|                  |                                                                    |
| ---------------- | ------------------------------------------------------------------ |
| Contract version | **1.0**                                                            |
| Dialect          | JSON Schema [draft 2020-12](https://json-schema.org/draft/2020-12) |
| npm              | `@tamas-labs/aura-schema`                                          |
| Composer         | `tamas-labs/aura-schema`                                           |
| License          | MIT                                                                |

## Why this repository exists

The schema documents used to live inside `aura` and were copied by hand into `laravel-aura`. Two
copies is two truths, and nothing validated either of them — they were documentation that happened
to be written in JSON Schema.

Here they are executable: the shipped examples are validated against the schemas on every CI run,
the `$id` of each document is checked against its own path, and every cross-file `$ref` is proven
to resolve inside the published set.

## Layout

```
schema/                            the contract — the source of truth
├── aura-request.schema.json       what Aura sends on every fetch
├── aura-response.schema.json      what the endpoint must return
├── aura-error-report.schema.json  what Aura POSTs to the error-reporting endpoint
├── header.schema.json             column definitions
├── body.schema.json               per-column rendering configuration
├── footer.schema.json             footer rows
├── pagination.schema.json         meta / links
├── common.schema.json             shared field-level building blocks
├── column-configs/                one file per column type (badge, button, link, …)
├── bundled/                       generated: each entrypoint flattened into one file
└── examples/                      a complete request, response and error report
contract.json                      version, dialect, base URI, file list
src/                               the npm surface (TypeScript)
php/src/AuraSchema.php             the Composer surface (PHP, zero dependencies)
```

`schema/*.json` is what you edit. Everything under `schema/bundled/`, plus
`src/schemas.generated.ts` and `src/types/contract.ts`, is generated from it and checked for drift
in CI.

## Using it from TypeScript

```bash
npm install @tamas-labs/aura-schema
```

The main entry has **no runtime dependencies** — it hands out the documents and the metadata:

```ts
import {
    AURA_CONTRACT_VERSION,
    auraResponseSchema,
    allSchemas,
    schemasById,
} from '@tamas-labs/aura-schema';

import type { AuraResponse, AuraRequest, HeaderCell } from '@tamas-labs/aura-schema';
```

`AuraResponse` and `AuraRequest` are generated from the schemas, so they cannot drift from the
contract. Register `allSchemas` with any 2020-12 validator and the cross-file `$ref`s resolve
offline, because each document carries an absolute `$id`.

### Validating

Validation lives behind a subpath so `ajv` stays optional:

```bash
npm install ajv
```

```ts
import { validateAuraResponse } from '@tamas-labs/aura-schema/validate';

const { valid, issues } = validateAuraResponse(await response.json());

if (!valid) {
    // [{ path: '/header/rows/0/cells', message: "must have required property 'content'", … }]
    console.error(issues);
}
```

`validateAuraRequest` and `validateAuraErrorReport` are the same for the other two entrypoints,
and `createAuraValidator(options)` gives you the pre-loaded Ajv instance if you want to compile
something else against the same set.

## Using it from PHP

```bash
composer require tamas-labs/aura-schema
```

The package ships **no Composer dependencies** — it locates the files and leaves validation to
whichever library you already use:

```php
use TamasLabs\AuraSchema\AuraSchema;

AuraSchema::VERSION;             // '1.0'
AuraSchema::directory();         // …/vendor/tamas-labs/aura-schema/schema
AuraSchema::responsePath();      // …/schema/aura-response.schema.json
AuraSchema::errorReportPath();   // …/schema/aura-error-report.schema.json
AuraSchema::path('column-configs/badge');
AuraSchema::get('header');       // decoded, as an array
AuraSchema::all();               // every document, keyed by $id
AuraSchema::bundlePath('response');
```

With `opis/json-schema`, point the resolver at the local directory so the `$id` URLs are never
fetched:

```php
$validator = new Opis\JsonSchema\Validator();
$validator->resolver()->registerPrefix(AuraSchema::BASE_URI, AuraSchema::directory());

$result = $validator->validate($payload, AuraSchema::BASE_URI.'aura-response.schema.json');
```

## Bundles

`schema/bundled/aura-response.bundle.json`, `aura-request.bundle.json` and
`aura-error-report.bundle.json` are the same contract flattened into a single self-contained
document: every reachable `$defs` entry merged under the
entrypoint, every `$ref` rewritten to a local pointer. Use them with tools that cannot follow
cross-file references — code generators, online validators, OpenAPI toolchains.

They are generated, never edited. A test compiles each bundle with nothing else registered and
asserts it accepts and rejects exactly what the split schemas do.

## Working on the contract

```bash
npm install

npm run generate      # rebuild bundles, inlined schemas and types after editing schema/*.json
npm run quality       # drift checks + type-check + format + tests — what CI runs
npm run test:php      # the PHP smoke checks, in Docker
npm run build         # emit dist/
```

Editing anything under `schema/` means running `npm run generate` and committing the result;
`npm run quality` fails otherwise. Adding a schema file means adding it to `contract.json` and to
the `EXPORTS` list in `scripts/generate-schemas.mjs` — a test proves the manifest and the directory
agree, so a forgotten entry cannot slip through.

There is no PHP or Composer on the host; `npm run test:php` runs the checks in `php:8.4-cli-alpine`
via `compose.yaml`.

## Versioning

`contract.json` carries the **contract** version (`1.0`), mirrored in `AuraSchema::VERSION` and
`AURA_CONTRACT_VERSION`; a test fails if the two ever disagree. The npm and Composer package
versions track the packaging and move independently of it.

Nothing carries the contract version over the wire today: `aura-response.schema.json` sets
`additionalProperties: true`, so a version field can be added later without breaking existing
responses.

The `$id` URLs point at `main`. They are identity, not a download location — every consumer
resolves them against the files it already has, and no tool in this repository fetches them.
