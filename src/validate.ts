/**
 * Ajv-backed validation of Aura payloads.
 *
 * Kept behind the `@tamas-labs/aura-schema/validate` subpath because it is the
 * only part of the package that needs a runtime dependency. `ajv` is declared
 * as an optional peer: consumers that only want the schema documents (the Vue
 * side validates with Zod, the Laravel side with `opis/json-schema`) never pull
 * it in.
 */
import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject, Options, ValidateFunction } from 'ajv';

import { allSchemas, auraRequestSchema, auraResponseSchema } from './schemas.js';

/**
 * One schema violation, flattened to the bits worth showing a developer.
 */
export interface AuraValidationIssue {
    /** JSON Pointer into the payload, e.g. `/header/rows/0/cells`. */
    path: string;
    /** Ajv's human-readable message, e.g. `must have required property 'cells'`. */
    message: string;
    /** The keyword that failed, e.g. `required`, `enum`, `pattern`. */
    keyword: string;
}

/**
 * Outcome of validating a payload against one of the contract entrypoints.
 */
export interface AuraValidationResult {
    /** `true` when the payload satisfies the schema. */
    valid: boolean;
    /** Empty when `valid`; otherwise every violation Ajv reported. */
    issues: AuraValidationIssue[];
}

/**
 * Ajv is run with `strict: false` on purpose.
 *
 * The contract documents pair `default` with `anyOf` (see `common.schema.json`
 * → `flag`), which strict mode rejects as a schema authoring error. The pairing
 * is intentional here — the default documents what Aura does with a missing
 * key, it is not meant to be applied — so strict mode would fail on a correct
 * schema. Callers who want it back can pass their own options.
 */
const DEFAULT_OPTIONS: Options = { strict: false, allErrors: true };

/**
 * Builds an Ajv instance with every Aura schema document pre-registered.
 *
 * Registering the whole set is what makes the cross-file `$ref`s resolve
 * offline: each document carries an absolute `$id`, and the relative refs
 * between them resolve against those ids without a network fetch.
 *
 * @param options - Ajv options merged over the package defaults.
 * @returns An Ajv instance ready to compile any contract entrypoint.
 */
export function createAuraValidator(options: Options = {}): Ajv2020 {
    const ajv = new Ajv2020({ ...DEFAULT_OPTIONS, ...options });
    ajv.addSchema(allSchemas as object[]);

    return ajv;
}

/**
 * Turns Ajv's error array into the flattened issue list this package exposes.
 *
 * @param errors - Ajv errors, or `null`/`undefined` when validation passed.
 * @returns One issue per error, in the order Ajv reported them.
 */
function toIssues(errors: ErrorObject[] | null | undefined): AuraValidationIssue[] {
    return (errors ?? []).map(error => ({
        path: error.instancePath === '' ? '/' : error.instancePath,
        message: error.message ?? 'is invalid',
        keyword: error.keyword,
    }));
}

/**
 * Compiles one entrypoint schema, memoised per Ajv instance.
 */
const compiledCache = new WeakMap<Ajv2020, Map<string, ValidateFunction>>();

/**
 * Returns the compiled validator for a schema `$id`, compiling on first use.
 *
 * @param ajv - The instance the schema was registered on.
 * @param schemaId - `$id` of the entrypoint to compile.
 * @returns The compiled Ajv validate function.
 */
function compiledFor(ajv: Ajv2020, schemaId: string): ValidateFunction {
    let perInstance = compiledCache.get(ajv);
    if (!perInstance) {
        perInstance = new Map();
        compiledCache.set(ajv, perInstance);
    }

    const cached = perInstance.get(schemaId);
    if (cached) {
        return cached;
    }

    const validate = ajv.getSchema(schemaId);
    if (!validate) {
        throw new Error(`Aura schema "${schemaId}" is not registered on this validator.`);
    }

    perInstance.set(schemaId, validate);

    return validate;
}

/**
 * The default instance, so the common case needs no setup.
 */
let sharedValidator: Ajv2020 | undefined;

/**
 * Returns the lazily created package-wide Ajv instance.
 *
 * @returns The shared validator.
 */
function shared(): Ajv2020 {
    sharedValidator ??= createAuraValidator();

    return sharedValidator;
}

/**
 * Validates a payload against `aura-response.schema.json`.
 *
 * This is what a backend should assert on: it is the JSON an Aura table expects
 * from its endpoint.
 *
 * @param payload - The candidate response, already parsed from JSON.
 * @param ajv - Optional instance from `createAuraValidator`.
 * @returns Whether it validates, plus every violation found.
 */
export function validateAuraResponse(payload: unknown, ajv = shared()): AuraValidationResult {
    const validate = compiledFor(ajv, auraResponseSchema.$id);
    const valid = validate(payload) as boolean;

    return { valid, issues: valid ? [] : toIssues(validate.errors) };
}

/**
 * Validates a payload against `aura-request.schema.json`.
 *
 * This is what Aura sends to the endpoint on every fetch — useful for asserting
 * that a backend's request parsing accepts everything the table can send.
 *
 * @param payload - The candidate request, already parsed from JSON or query.
 * @param ajv - Optional instance from `createAuraValidator`.
 * @returns Whether it validates, plus every violation found.
 */
export function validateAuraRequest(payload: unknown, ajv = shared()): AuraValidationResult {
    const validate = compiledFor(ajv, auraRequestSchema.$id);
    const valid = validate(payload) as boolean;

    return { valid, issues: valid ? [] : toIssues(validate.errors) };
}
