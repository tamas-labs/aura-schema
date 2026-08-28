# Változásnapló

A formátum a [Keep a Changelog](https://keepachangelog.com/hu/1.1.0/) ajánlását követi.
A **szerződés** verziója (`contract.json` → `version`) külön él a csomagverziótól: a csomag
verziója a csomagolást követi, a szerződésé azt, hogy mit vár a dróton az Aura.

## [Unreleased]

## [1.0.0] – 2026-08-27

Az első kiadás. A szerződés verziója: **1.0** — tartalmilag pontosan az, ami eddig az
`aura` repó `docs/schema/` könyvtárában élt, egyetlen változtatással: a `$id`-k az új,
kanonikus helyre mutatnak.

### Hozzáadva

- **A szerződés kanonikus otthona.** 16 JSON Schema dokumentum (draft 2020-12) a `schema/`
  alatt, plusz a `request` / `response` példa. Eddig az `aura` repóban éltek, kézzel másolva
  a `laravel-aura`-ba — két másolat, két igazság, és egyiket sem validálta semmi.
- **`contract.json`** — a szerződés manifesztje: verzió, dialektus, `$id` alap-URI, a
  belépési pontok, a bundle-ök, a példák és a teljes fájllista. Ezt olvassa mindkét
  csomagolás, így a verzió nem tud elcsúszni a két nyelv között.
- **npm-csomag** (`@tamas-labs/aura-schema`): a fő belépési pont futásidejű függőség nélkül
  adja a dokumentumokat (`allSchemas`, `schemasById`, dokumentumonkénti export) és a
  metaadatokat (`AURA_CONTRACT_VERSION`, `AURA_SCHEMA_DIALECT`, `AURA_SCHEMA_BASE_URI`).
- **Generált TypeScript payload-típusok** (`AuraResponse`, `AuraRequest` és a belőlük
  felépülő ~65 típus), közvetlenül a schemákból. Nem kézzel írt párhuzamos igazság.
- **`@tamas-labs/aura-schema/validate`** alútvonal: `validateAuraResponse`,
  `validateAuraRequest`, `createAuraValidator`. Az `ajv` opcionális peer, hogy a fő belépési
  pont függőségmentes maradjon.
- **Composer-csomag** (`tamas-labs/aura-schema`): `TamasLabs\AuraSchema\AuraSchema` — fájl-
  lokátor `VERSION`, `BASE_URI`, `directory()`, `path()`, `get()`, `all()`, `bundlePath()`,
  `examplePath()` metódusokkal. Nulla Composer-függőség: a validátort a fogyasztó hozza.
- **Bundle-ök** (`schema/bundled/*.bundle.json`): belépési pontonként egyetlen,
  önmagában megálló dokumentum — az elérhető `$defs`-ek összefésülve, a `$ref`-ek lokális
  mutatóra írva. Azoknak az eszközöknek, amelyek nem tudnak fájlok között hivatkozni.
- **Teszthálózat (29 teszt).** Ezek eddig sehol nem futottak:
    - a szállított példák validálnak a saját schemájukra;
    - minden `$id` egyezik a fájl saját útvonalával;
    - minden fájlközi `$ref` feloldható a publikált halmazon belül;
    - a manifeszt fájllistája pontosan a lemezen lévő fájlokat sorolja;
    - a PHP `VERSION` és a `contract.json` verziója megegyezik;
    - a bundle-ök pontosan ugyanazt fogadják el és utasítják el, mint az osztott schemák;
    - a generált típusok által leírt payload a validátoron is átmegy.
- **Drift-kapuk.** A `schema/*.json` a forrás; a `bundled/`, a `src/schemas.generated.ts` és
  a `src/types/contract.ts` generált. A `npm run quality` (és így a CI) elbukik, ha a
  generált állomány elavult.
- **CI**: JavaScript-oldal Node 20/22-n, PHP-oldal 8.3/8.4-en.

### Megjegyzés

Ezzel a kiadással az `aura` `docs/schema/` és a `laravel-aura` `.claude/docs/schema/`
könyvtára másolattá vált. A `laravel-aura` action-planjének **NY1** kérdése („hol él
kanonikusan a schema?") ezzel eldőlt: itt.
