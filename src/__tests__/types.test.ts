import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { auraContractManifest } from '../contract.js';
import type { AuraRequest, AuraResponse } from '../types/contract.js';
import { validateAuraRequest, validateAuraResponse } from '../validate.js';

const repoRoot = join(import.meta.dirname, '..', '..');

/**
 * A response written against the generated types.
 *
 * The point of this file is the annotation: if `types:generate` produced types
 * that disagree with the schema, either `tsc` rejects this literal or the
 * validator rejects it at runtime. Both halves have to agree.
 */
const response: AuraResponse = {
    header: {
        rows: [
            {
                cells: [
                    { content: 'ID', key: 'id', field: 'id', sortable: true },
                    { content: 'Name', key: 'name', field: 'name', searchable: true },
                ],
            },
        ],
    },
    body: {
        name: { type: 'badge', variant: 'primary' },
    },
    items: [{ id: 1, name: 'Ada' }],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
};

const request: AuraRequest = {
    page: 2,
    paginate: 25,
    sortable: [{ field: 'name', direction: 'asc' }],
    globalSearch: 'ada',
};

describe('generated types', () => {
    it('describe payloads the schema also accepts', () => {
        expect(validateAuraResponse(response).issues).toEqual([]);
        expect(validateAuraRequest(request).issues).toEqual([]);
    });

    it('type the shipped examples', () => {
        const example = JSON.parse(
            readFileSync(join(repoRoot, auraContractManifest.examples.response as string), 'utf8')
        ) as AuraResponse;

        expect(example.header.rows.length).toBeGreaterThan(0);
    });
});
