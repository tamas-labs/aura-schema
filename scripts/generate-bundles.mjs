/**
 * Bundles each entrypoint into one self-contained JSON Schema document.
 *
 * The `schema/` files are split for readability and cross-reference each other
 * with relative `$ref`s. That is the source of truth, but plenty of tools —
 * code generators, online validators, OpenAPI toolchains — only accept a single
 * file. The bundles are that single file, and nothing more: every `$defs` entry
 * of the whole set merged under the entrypoint's root, with the file part of
 * each `$ref` dropped.
 *
 * The merge relies on `$defs` names being unique across the whole contract; the
 * script fails loudly if that ever stops being true.
 *
 * `node scripts/generate-bundles.mjs`         rewrites schema/bundled/*.json
 * `node scripts/generate-bundles.mjs --check` fails if they are out of date
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundleDir = join(repoRoot, 'schema', 'bundled');

/**
 * Reads and parses one repo-relative JSON file.
 *
 * @param relativePath - Path relative to the repository root.
 * @returns The parsed value.
 */
async function readJson(relativePath) {
    return JSON.parse(await readFile(join(repoRoot, relativePath), 'utf8'));
}

/**
 * Rewrites every `$ref` in a subtree to a bundle-local pointer.
 *
 * Cross-file refs all take the form `<path>#/$defs/<name>`; since `$defs` names
 * are unique across the contract, dropping the path part is enough.
 *
 * @param node - Any JSON value from a schema document.
 * @returns The same value with rewritten refs.
 */
function localiseRefs(node) {
    if (Array.isArray(node)) {
        return node.map(localiseRefs);
    }

    if (node === null || typeof node !== 'object') {
        return node;
    }

    const result = {};
    for (const [key, value] of Object.entries(node)) {
        if (key === '$ref' && typeof value === 'string') {
            const fragment = value.slice(value.indexOf('#'));

            if (!fragment.startsWith('#/$defs/')) {
                throw new Error(`Cannot bundle unsupported $ref target: ${value}`);
            }

            result.$ref = fragment;
            continue;
        }

        result[key] = localiseRefs(value);
    }

    return result;
}

const manifest = await readJson('contract.json');

/** Every `$defs` entry of the whole contract, keyed by name. */
const mergedDefs = {};
/** Where each name came from, for the collision message. */
const origin = {};

for (const relativePath of manifest.schemas) {
    const document = await readJson(relativePath);

    for (const [name, definition] of Object.entries(document.$defs ?? {})) {
        if (name in mergedDefs) {
            throw new Error(
                `$defs name "${name}" is declared in both ${origin[name]} and ${relativePath}. ` +
                    'Bundling needs these names to be unique across the contract.'
            );
        }

        origin[name] = relativePath;
        mergedDefs[name] = localiseRefs(definition);
    }
}

/**
 * Collects the `$defs` names reachable from a subtree, transitively.
 *
 * An entrypoint uses only part of the contract — the request schema references
 * nothing at all — so carrying every definition into every bundle would ship a
 * lot of dead schema.
 *
 * @param node - Any JSON value from a schema document.
 * @param reached - Accumulator of names already visited.
 * @returns The accumulator.
 */
function collectReachable(node, reached = new Set()) {
    if (Array.isArray(node)) {
        node.forEach(child => collectReachable(child, reached));

        return reached;
    }

    if (node === null || typeof node !== 'object') {
        return reached;
    }

    for (const [key, value] of Object.entries(node)) {
        if (key === '$ref' && typeof value === 'string' && value.startsWith('#/$defs/')) {
            const name = value.slice('#/$defs/'.length);

            if (!reached.has(name)) {
                reached.add(name);
                collectReachable(mergedDefs[name], reached);
            }

            continue;
        }

        collectReachable(value, reached);
    }

    return reached;
}

const written = [];

for (const [name, relativePath] of Object.entries(manifest.entrypoints)) {
    const source = await readJson(relativePath);
    const { $defs: _ignored, ...root } = source;

    const localisedRoot = localiseRefs(root);
    const reachable = [...collectReachable(localisedRoot)].sort();

    const bundle = {
        ...localisedRoot,
        $id: `${manifest.baseUri}bundled/aura-${name}.bundle.json`,
        ...(reachable.length > 0
            ? { $defs: Object.fromEntries(reachable.map(def => [def, mergedDefs[def]])) }
            : {}),
    };

    // `$schema` and `$id` read better at the top, as in the hand-written files.
    const ordered = {
        $schema: bundle.$schema,
        $id: bundle.$id,
        ...Object.fromEntries(
            Object.entries(bundle).filter(([key]) => key !== '$schema' && key !== '$id')
        ),
    };

    written.push([
        `schema/bundled/aura-${name}.bundle.json`,
        `${JSON.stringify(ordered, null, 4)}\n`,
    ]);
}

if (process.argv.includes('--check')) {
    for (const [relativePath, contents] of written) {
        const current = await readFile(join(repoRoot, relativePath), 'utf8').catch(() => '');
        if (current !== contents) {
            console.error(
                `${relativePath} is out of date with schema/*.json.\n` +
                    'Run `npm run bundles:generate` and commit the result.'
            );
            process.exit(1);
        }
    }
    console.log('schema/bundled/*.json is up to date.');
} else {
    await mkdir(bundleDir, { recursive: true });
    for (const [relativePath, contents] of written) {
        await writeFile(join(repoRoot, relativePath), contents, 'utf8');
        console.log(`Wrote ${relativePath}`);
    }
}
