import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative } from 'node:path';

import {
    AURA_CONTRACT_VERSION,
    AURA_SCHEMA_BASE_URI,
    AURA_SCHEMA_DIALECT,
    auraContractManifest,
} from '../contract.js';

const repoRoot = join(import.meta.dirname, '..', '..');
const schemaDir = join(repoRoot, 'schema');

/**
 * Every `*.schema.json` under `schema/`, as repo-relative POSIX paths.
 *
 * Walking the directory rather than trusting the manifest is the whole point:
 * a file added without a manifest entry has to fail somewhere.
 *
 * @param directory - Absolute directory to walk.
 * @returns Repo-relative paths, sorted.
 */
function schemaFilesOnDisk(directory: string): string[] {
    const found: string[] = [];

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const absolute = join(directory, entry.name);

        if (entry.isDirectory()) {
            if (entry.name !== 'examples') {
                found.push(...schemaFilesOnDisk(absolute));
            }
            continue;
        }

        if (entry.name.endsWith('.schema.json')) {
            found.push(relative(repoRoot, absolute).split(/[\\/]/).join(posix.sep));
        }
    }

    return found.sort();
}

describe('contract manifest', () => {
    it('exposes the version, dialect and base URI', () => {
        expect(AURA_CONTRACT_VERSION).toMatch(/^\d+\.\d+$/);
        expect(AURA_SCHEMA_DIALECT).toBe('https://json-schema.org/draft/2020-12/schema');
        expect(AURA_SCHEMA_BASE_URI).toMatch(/\/$/);
    });

    it('lists exactly the schema files that exist on disk', () => {
        expect([...auraContractManifest.schemas].sort()).toEqual(schemaFilesOnDisk(schemaDir));
    });

    it('points at entrypoints and examples that exist', () => {
        const paths = [
            ...Object.values(auraContractManifest.entrypoints),
            ...Object.values(auraContractManifest.examples),
        ];

        for (const path of paths) {
            expect(() => readFileSync(join(repoRoot, path), 'utf8'), path).not.toThrow();
        }
    });

    it('keeps the PHP side on the same version', () => {
        const php = readFileSync(join(repoRoot, 'php', 'src', 'AuraSchema.php'), 'utf8');
        const version = /public const string VERSION = '([^']+)'/.exec(php)?.[1];

        expect(version).toBe(AURA_CONTRACT_VERSION);
    });
});
