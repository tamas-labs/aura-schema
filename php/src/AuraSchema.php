<?php

declare(strict_types=1);

namespace TamasLabs\AuraSchema;

use JsonException;
use RuntimeException;

/**
 * Locator for the Aura wire contract shipped in this package.
 *
 * The schema documents are plain JSON files under `schema/`; this class exists
 * so a PHP consumer never hard-codes a path into `vendor/`. It has no
 * dependencies — the caller brings its own validator (`opis/json-schema`,
 * `justinrainbow/json-schema`, …) and points it at `directory()`.
 */
final class AuraSchema
{
    /**
     * Version of the Aura JSON contract described by this package.
     *
     * Mirrors `contract.json`; a test asserts the two never drift.
     */
    public const string VERSION = '1.0';

    /**
     * The `$id` prefix every schema document shares.
     *
     * Register this against `directory()` so relative `$ref`s between the
     * documents resolve from disk instead of being fetched over HTTP:
     *
     * ```php
     * $resolver->registerPrefix(AuraSchema::BASE_URI, AuraSchema::directory());
     * ```
     */
    public const string BASE_URI = 'https://raw.githubusercontent.com/tamas-labs/aura-schema/main/schema/';

    /**
     * Absolute path of the directory holding the schema documents.
     */
    public static function directory(): string
    {
        return \dirname(__DIR__, 2).'/schema';
    }

    /**
     * Absolute path of one schema document.
     *
     * @param  string  $name  Path relative to `schema/`, with or without the
     *                        `.schema.json` suffix — `header`, `header.schema.json`
     *                        and `column-configs/badge` all work.
     *
     * @throws RuntimeException When no such document ships with this package.
     */
    public static function path(string $name): string
    {
        $relative = str_ends_with($name, '.json') ? $name : $name.'.schema.json';
        $absolute = self::directory().'/'.ltrim($relative, '/');

        if (! is_file($absolute)) {
            throw new RuntimeException(
                sprintf('Aura schema "%s" does not exist at %s.', $name, $absolute)
            );
        }

        return $absolute;
    }

    /**
     * Absolute path of the schema a full API response is validated against.
     */
    public static function responsePath(): string
    {
        return self::path('aura-response');
    }

    /**
     * Absolute path of the schema a full API request is validated against.
     */
    public static function requestPath(): string
    {
        return self::path('aura-request');
    }

    /**
     * One schema document, decoded.
     *
     * @param  string  $name  Same forms as {@see self::path()}.
     * @return array<string, mixed>
     *
     * @throws RuntimeException When the document is missing or not valid JSON.
     */
    public static function get(string $name): array
    {
        return self::decode(self::path($name));
    }

    /**
     * Every schema document, keyed by its `$id`.
     *
     * This is what a validator wants registered up front: with all ids known,
     * the cross-file `$ref`s resolve without touching the network.
     *
     * @return array<string, array<string, mixed>>
     *
     * @throws RuntimeException When a listed document is missing or malformed.
     */
    public static function all(): array
    {
        $schemas = [];

        foreach (self::manifest()['schemas'] as $relative) {
            $decoded = self::decode(\dirname(__DIR__, 2).'/'.$relative);
            $schemas[$decoded['$id']] = $decoded;
        }

        return $schemas;
    }

    /**
     * The contract manifest — version, dialect, base URI and the file list.
     *
     * @return array{
     *     version: string,
     *     dialect: string,
     *     baseUri: string,
     *     entrypoints: array<string, string>,
     *     bundles: array<string, string>,
     *     schemas: list<string>,
     *     examples: array<string, string>
     * }
     *
     * @throws RuntimeException When `contract.json` is missing or malformed.
     */
    public static function manifest(): array
    {
        /** @var array{version: string, dialect: string, baseUri: string, entrypoints: array<string, string>, bundles: array<string, string>, schemas: list<string>, examples: array<string, string>} $manifest */
        $manifest = self::decode(\dirname(__DIR__, 2).'/contract.json');

        return $manifest;
    }

    /**
     * Absolute path of a self-contained bundle of one entrypoint.
     *
     * The split documents under `schema/` are the source of truth; the bundles
     * are the same contract flattened into one file, for tools that cannot
     * follow cross-file `$ref`s.
     *
     * @param  string  $name  `request` or `response`.
     *
     * @throws RuntimeException When the manifest lists no such bundle.
     */
    public static function bundlePath(string $name): string
    {
        $bundles = self::manifest()['bundles'];

        if (! isset($bundles[$name])) {
            throw new RuntimeException(sprintf('Aura schema has no "%s" bundle.', $name));
        }

        return \dirname(__DIR__, 2).'/'.$bundles[$name];
    }

    /**
     * Absolute path of one of the shipped example payloads.
     *
     * @param  string  $name  `request` or `response`.
     *
     * @throws RuntimeException When the manifest lists no such example.
     */
    public static function examplePath(string $name): string
    {
        $examples = self::manifest()['examples'];

        if (! isset($examples[$name])) {
            throw new RuntimeException(sprintf('Aura schema has no "%s" example.', $name));
        }

        return \dirname(__DIR__, 2).'/'.$examples[$name];
    }

    /**
     * Reads and decodes one JSON file.
     *
     * @return array<string, mixed>
     *
     * @throws RuntimeException When the file is unreadable or not valid JSON.
     */
    private static function decode(string $absolute): array
    {
        $contents = is_file($absolute) ? file_get_contents($absolute) : false;

        if ($contents === false) {
            throw new RuntimeException(sprintf('Cannot read Aura schema file %s.', $absolute));
        }

        try {
            /** @var array<string, mixed> $decoded */
            $decoded = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException(
                sprintf('Aura schema file %s is not valid JSON.', $absolute),
                0,
                $exception
            );
        }

        return $decoded;
    }
}
