/**
 * Every schema document of the Aura wire contract, as a plain object.
 *
 * The documents themselves live in `schema/*.json` — that directory is the
 * source of truth, and `scripts/generate-schemas.mjs` inlines it into
 * `schemas.generated.ts` so TypeScript consumers need no JSON loader.
 */
export type { AuraSchemaDocument, AuraContractManifest } from './schemas.generated.js';

export {
    auraRequestSchema,
    auraResponseSchema,
    commonSchema,
    headerSchema,
    bodySchema,
    footerSchema,
    paginationSchema,
    badgeSchema,
    buttonSchema,
    customSchema,
    iconSchema,
    linkSchema,
    modalSchema,
    progressSchema,
    referenceSchema,
    staticSchema,
} from './schemas.generated.js';

import type { AuraSchemaDocument } from './schemas.generated.js';
import {
    auraRequestSchema,
    auraResponseSchema,
    commonSchema,
    headerSchema,
    bodySchema,
    footerSchema,
    paginationSchema,
    badgeSchema,
    buttonSchema,
    customSchema,
    iconSchema,
    linkSchema,
    modalSchema,
    progressSchema,
    referenceSchema,
    staticSchema,
} from './schemas.generated.js';

/**
 * Every schema document, `common` first.
 *
 * Load order is irrelevant to a 2020-12 validator — `$ref`s resolve by `$id`,
 * not by registration order — but it keeps diagnostic output readable.
 */
export const allSchemas: readonly AuraSchemaDocument[] = Object.freeze([
    commonSchema,
    headerSchema,
    bodySchema,
    footerSchema,
    paginationSchema,
    badgeSchema,
    buttonSchema,
    customSchema,
    iconSchema,
    linkSchema,
    modalSchema,
    progressSchema,
    referenceSchema,
    staticSchema,
    auraRequestSchema,
    auraResponseSchema,
]);

/**
 * The same documents keyed by `$id`.
 *
 * This is the shape a validator wants: register the whole map once and every
 * cross-file `$ref` resolves offline, with no network fetch of the `$id` URLs.
 */
export const schemasById: Readonly<Record<string, AuraSchemaDocument>> = Object.freeze(
    Object.fromEntries(allSchemas.map(schema => [schema.$id, schema]))
);
