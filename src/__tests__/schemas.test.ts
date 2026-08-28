import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AURA_SCHEMA_BASE_URI, auraContractManifest } from '../contract.js';
import { allSchemas, schemasById } from '../schemas.js';

const repoRoot = join(import.meta.dirname, '..', '..');

describe('schema documents', () => {
    it('inlines every file the manifest lists', () => {
        expect(allSchemas).toHaveLength(auraContractManifest.schemas.length);
        expect(Object.keys(schemasById)).toHaveLength(allSchemas.length);
    });

    it('has not drifted from the JSON on disk', () => {
        for (const path of auraContractManifest.schemas) {
            const onDisk = JSON.parse(readFileSync(join(repoRoot, path), 'utf8')) as {
                $id: string;
            };

            expect(schemasById[onDisk.$id], `${path} is missing from the inlined set`).toEqual(
                onDisk
            );
        }
    });

    it('derives every $id from the base URI and the file path', () => {
        for (const path of auraContractManifest.schemas) {
            const expected = AURA_SCHEMA_BASE_URI + path.replace(/^schema\//, '');
            const onDisk = JSON.parse(readFileSync(join(repoRoot, path), 'utf8')) as {
                $id: string;
            };

            expect(onDisk.$id, `${path} carries an $id that does not match its path`).toBe(
                expected
            );
        }
    });

    it('declares the 2020-12 dialect everywhere', () => {
        for (const schema of allSchemas) {
            expect(schema.$schema, schema.$id).toBe(auraContractManifest.dialect);
        }
    });

    it('resolves every cross-file $ref inside the published set', () => {
        const ids = new Set(Object.keys(schemasById));

        for (const path of auraContractManifest.schemas) {
            const source = readFileSync(join(repoRoot, path), 'utf8');
            const base = AURA_SCHEMA_BASE_URI + path.replace(/^schema\//, '');

            for (const match of source.matchAll(/"\$ref":\s*"([^"]+)"/g)) {
                const ref = match[1] as string;

                if (ref.startsWith('#')) {
                    continue;
                }

                const file = ref.split('#')[0] as string;
                const resolved = new URL(file, base).href;

                expect(ids.has(resolved), `${path} → ${ref} points outside the package`).toBe(true);
            }
        }
    });
});
