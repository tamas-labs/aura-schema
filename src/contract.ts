/**
 * Contract metadata: version, dialect and the `$id` base URI.
 *
 * All three come from `contract.json` at the repository root, which the PHP
 * packaging reads too — the version must not be able to drift between the two.
 */
import { auraContractManifest } from './schemas.generated.js';

export type { AuraContractManifest } from './schemas.generated.js';
export { auraContractManifest };

/**
 * Version of the Aura JSON contract described by this package.
 *
 * Nothing carries it over the wire today: `aura-response.schema.json` sets
 * `additionalProperties: true`, so a version field can be added later without
 * breaking existing responses.
 */
export const AURA_CONTRACT_VERSION: string = auraContractManifest.version;

/**
 * JSON Schema dialect every document in this package is written against.
 */
export const AURA_SCHEMA_DIALECT: string = auraContractManifest.dialect;

/**
 * The `$id` prefix every schema document shares.
 *
 * A validator resolving `$ref`s from disk registers this prefix against the
 * local `schema/` directory; `AuraSchema::BASE_URI` is the PHP equivalent.
 */
export const AURA_SCHEMA_BASE_URI: string = auraContractManifest.baseUri;
