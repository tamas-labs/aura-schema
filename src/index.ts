/**
 * `@tamas-labs/aura-schema` — the Aura wire contract as data.
 *
 * The main entry has no runtime dependencies: it hands out the schema documents
 * and the contract metadata, nothing more. Validation lives behind the
 * `@tamas-labs/aura-schema/validate` subpath, which needs `ajv`.
 */
export {
    AURA_CONTRACT_VERSION,
    AURA_SCHEMA_DIALECT,
    AURA_SCHEMA_BASE_URI,
    auraContractManifest,
} from './contract.js';

export type { AuraContractManifest } from './contract.js';

export {
    allSchemas,
    schemasById,
    auraErrorReportSchema,
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
} from './schemas.js';

export type { AuraSchemaDocument } from './schemas.js';

/**
 * Payload types generated from the contract entrypoints.
 *
 * `AuraResponse` and `AuraRequest` are the two roots; the rest are the named
 * pieces they are built from (`HeaderCell`, `BadgeConfig`, …).
 */
export type * from './types/contract.js';
