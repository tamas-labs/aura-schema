import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

import { auraContractManifest } from '../contract.js';
import { validateAuraErrorReport, validateAuraRequest, validateAuraResponse } from '../validate.js';

const repoRoot = join(import.meta.dirname, '..', '..');

/**
 * Reads a repo-relative JSON file.
 *
 * @param relativePath - Path relative to the repository root.
 * @returns The parsed value.
 */
function readJson(relativePath: string): unknown {
    return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'));
}

/**
 * Compiles one bundle on its own Ajv instance.
 *
 * Nothing else is registered on purpose — if a bundle still needed a sibling
 * document to compile, it would not be a bundle.
 *
 * @param name - `request`, `response` or `error-report`.
 * @returns The compiled validate function.
 */
function compileBundle(name: 'request' | 'response' | 'error-report') {
    const bundle = readJson(auraContractManifest.bundles[name] as string);
    const ajv = new Ajv2020({ strict: false, allErrors: true });

    return ajv.compile(bundle as object);
}

/**
 * Payloads that must be judged the same way by both forms of the schema.
 *
 * The interesting ones are the invalid entries: a bundle that lost a `$defs`
 * entry during the merge would happily accept them.
 */
const RESPONSE_CASES: Array<[string, unknown, boolean]> = [
    ['the shipped example', readJson(auraContractManifest.examples.response as string), true],
    [
        'a minimal header',
        { header: { rows: [{ cells: [{ content: 'ID', key: 'id', field: 'id' }] }] } },
        true,
    ],
    ['no header at all', { items: [] }, false],
    ['an empty rows array', { header: { rows: [] } }, false],
    [
        'an unknown align value',
        { header: { rows: [{ cells: [{ content: 'ID', key: 'id', align: 'middle' }] }] } },
        false,
    ],
    [
        'a badge config with an unknown variant',
        {
            header: { rows: [{ cells: [{ content: 'Status', key: 'status' }] }] },
            body: { status: { type: 'badge', variant: 'chartreuse' } },
        },
        false,
    ],
];

const REQUEST_CASES: Array<[string, unknown, boolean]> = [
    ['the shipped example', readJson(auraContractManifest.examples.request as string), true],
    ['a bare page request', { page: 1, paginate: 25 }, true],
    ['a page below one', { page: 0, paginate: 25 }, false],
    ['an unknown sort direction', { page: 1, sortable: [{ field: 'id', direction: 'up' }] }, false],
];

const ERROR_REPORT_CASES: Array<[string, unknown, boolean]> = [
    [
        'the shipped example',
        readJson(auraContractManifest.examples['error-report'] as string),
        true,
    ],
    [
        'a single minimal entry',
        {
            errors: [
                {
                    severity: 'warning',
                    level: 'warning',
                    timestamp: '2026-09-02T12:00:00.000Z',
                    component: 'BooleanValidator',
                    action: 'validate',
                    type: 'validation',
                    message: 'Invalid value',
                },
            ],
        },
        true,
    ],
    ['an empty batch', { errors: [] }, false],
    [
        'an entry with an unknown severity',
        {
            errors: [
                {
                    severity: 'fatal',
                    level: 'fatal',
                    timestamp: '2026-09-02T12:00:00.000Z',
                    component: 'BooleanValidator',
                    action: 'validate',
                    type: 'validation',
                    message: 'Invalid value',
                },
            ],
        },
        false,
    ],
];

describe('bundled schemas', () => {
    it('compile with nothing else registered', () => {
        expect(compileBundle('response')).toBeTypeOf('function');
        expect(compileBundle('request')).toBeTypeOf('function');
        expect(compileBundle('error-report')).toBeTypeOf('function');
    });

    it('carry no cross-file $ref', () => {
        for (const relativePath of Object.values(auraContractManifest.bundles)) {
            const source = readFileSync(join(repoRoot, relativePath), 'utf8');

            for (const match of source.matchAll(/"\$ref":\s*"([^"]+)"/g)) {
                expect(match[1], `${relativePath} still points at another file`).toMatch(
                    /^#\/\$defs\//
                );
            }
        }
    });

    it.each(RESPONSE_CASES)('agrees with the split schema on %s', (_label, payload, expected) => {
        const bundled = compileBundle('response')(payload);

        expect(bundled).toBe(expected);
        expect(validateAuraResponse(payload).valid).toBe(expected);
    });

    it.each(REQUEST_CASES)(
        'agrees with the split request schema on %s',
        (_label, payload, expected) => {
            const bundled = compileBundle('request')(payload);

            expect(bundled).toBe(expected);
            expect(validateAuraRequest(payload).valid).toBe(expected);
        }
    );

    it.each(ERROR_REPORT_CASES)(
        'agrees with the split error-report schema on %s',
        (_label, payload, expected) => {
            const bundled = compileBundle('error-report')(payload);

            expect(bundled).toBe(expected);
            expect(validateAuraErrorReport(payload).valid).toBe(expected);
        }
    );
});
