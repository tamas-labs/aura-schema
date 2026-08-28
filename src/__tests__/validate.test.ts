import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { auraContractManifest } from '../contract.js';
import { createAuraValidator, validateAuraRequest, validateAuraResponse } from '../validate.js';

const repoRoot = join(import.meta.dirname, '..', '..');

/**
 * Reads one of the example payloads the manifest points at.
 *
 * @param name - `request` or `response`.
 * @returns The parsed example.
 */
function example(name: 'request' | 'response'): unknown {
    const path = auraContractManifest.examples[name] as string;

    return JSON.parse(readFileSync(join(repoRoot, path), 'utf8'));
}

describe('validation', () => {
    it('compiles every schema without a network fetch', () => {
        const ajv = createAuraValidator();

        for (const path of auraContractManifest.schemas) {
            const id = auraContractManifest.baseUri + path.replace(/^schema\//, '');

            expect(ajv.getSchema(id), `${path} failed to compile`).toBeTypeOf('function');
        }
    });

    it('accepts the example response', () => {
        const result = validateAuraResponse(example('response'));

        expect(result.issues).toEqual([]);
        expect(result.valid).toBe(true);
    });

    it('accepts the example request', () => {
        const result = validateAuraRequest(example('request'));

        expect(result.issues).toEqual([]);
        expect(result.valid).toBe(true);
    });

    it('rejects a response with no header and points at the payload', () => {
        const result = validateAuraResponse({ items: [] });

        expect(result.valid).toBe(false);
        expect(result.issues).toContainEqual({
            path: '/',
            keyword: 'required',
            message: "must have required property 'header'",
        });
    });

    it('reports the JSON pointer of a nested violation', () => {
        const result = validateAuraResponse({
            header: { rows: [{ cells: [{ content: 'ID', key: 'id', align: 'middle' }] }] },
        });

        expect(result.valid).toBe(false);
        expect(result.issues.map(issue => issue.path)).toContain('/header/rows/0/cells/0/align');
    });

    it('rejects a request with a page below one', () => {
        const result = validateAuraRequest({ page: 0, paginate: 25 });

        expect(result.valid).toBe(false);
        expect(result.issues).toContainEqual({
            path: '/page',
            keyword: 'minimum',
            message: 'must be >= 1',
        });
    });
});
