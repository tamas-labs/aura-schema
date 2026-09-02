<?php

declare(strict_types=1);

/**
 * Dependency-free checks for the PHP packaging.
 *
 * This package ships no Composer dependencies on purpose — the point is that a
 * consumer can require it and bring its own validator. That leaves nothing to
 * hang a PHPUnit/Pest suite on, so the PHP surface is verified by this script,
 * which `composer test` and CI both run.
 */

require __DIR__.'/src/AuraSchema.php';

use TamasLabs\AuraSchema\AuraSchema;

$failures = [];

/**
 * Records a failed expectation instead of aborting, so one run reports all of them.
 */
function check(string $what, bool $passed): void
{
    global $failures;

    if ($passed) {
        echo "  ok    {$what}\n";

        return;
    }

    echo "  FAIL  {$what}\n";
    $failures[] = $what;
}

echo "AuraSchema smoke checks\n";

$manifest = AuraSchema::manifest();

check('manifest version matches the class constant', $manifest['version'] === AuraSchema::VERSION);
check('manifest base URI matches the class constant', $manifest['baseUri'] === AuraSchema::BASE_URI);
check('schema directory exists', is_dir(AuraSchema::directory()));

$all = AuraSchema::all();

check(
    'all() returns one entry per manifest schema',
    count($all) === count($manifest['schemas'])
);

foreach ($manifest['schemas'] as $relative) {
    $expectedId = AuraSchema::BASE_URI.substr($relative, strlen('schema/'));

    check("{$relative} is registered under its \$id", isset($all[$expectedId]));
    check(
        "{$relative} declares the 2020-12 dialect",
        ($all[$expectedId]['$schema'] ?? null) === $manifest['dialect']
    );
}

check('responsePath() resolves', is_file(AuraSchema::responsePath()));
check('requestPath() resolves', is_file(AuraSchema::requestPath()));
check('errorReportPath() resolves', is_file(AuraSchema::errorReportPath()));
check('path() accepts a bare name', is_file(AuraSchema::path('header')));
check('path() accepts a nested name', is_file(AuraSchema::path('column-configs/badge')));
check('path() accepts a full filename', is_file(AuraSchema::path('header.schema.json')));
check('get() decodes a document', (AuraSchema::get('header')['title'] ?? null) !== null);

foreach (array_keys($manifest['examples']) as $name) {
    check("{$name} example resolves", is_file(AuraSchema::examplePath($name)));
}

$threw = false;
try {
    AuraSchema::path('no-such-schema');
} catch (RuntimeException) {
    $threw = true;
}
check('path() throws on an unknown schema', $threw);

$threw = false;
try {
    AuraSchema::examplePath('no-such-example');
} catch (RuntimeException) {
    $threw = true;
}
check('examplePath() throws on an unknown example', $threw);

if ($failures !== []) {
    echo "\n".count($failures)." check(s) failed.\n";
    exit(1);
}

echo "\nAll checks passed.\n";
