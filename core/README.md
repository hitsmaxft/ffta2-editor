# FFTA2 Editor Core 0.1.0

A read-only TypeScript API for USA-layout FFTA2 ROMs and separately identified ACJ editions. The Editor owns ROM parsing; guide sites consume verified data packages. Node 22+ and modern browsers with Web Crypto are supported. No ROM, translated text, charset file or extracted image is distributed with this library.

Build from the repository root:

```sh
npm --prefix web ci
npm --prefix web run build:core
```

Import `core/dist/index.js` directly, or install the local `core/` package as `@ffta2-editor/core`. Types are included. This version is source-distributed; there is no npm publication or remote data service.

## API

```ts
import { analyzeRom, createDataPackage, attachTextReference } from '@ffta2-editor/core';

const dataset = await analyzeRom(romBytes, {
  expectedSha256: approvedRomSha256, // required, exact lowercase SHA-256
  edition: 'standard',              // or 'acj'; never inferred from translated names
  version: 'my approved build',
  textLanguage: 'zh-Hans',
  wordTable: { bytes: localCharsetBytes, format: 'charset.json' }, // optional
});
const files = await createDataPackage(dataset); // filename -> Uint8Array
```

`attachTextReference(primary, english)` optionally aligns an independently SHA-bound English ROM by stable text IDs. Every gameplay record and table count must match, and the declared edition and layout must agree. The primary ROM remains the source of truth. Missing peer text IDs are explicit. No cross-edition fallback is applied.

`openImageSession(romBytes, approvedRomSha256)` exposes `portrait(id)`, `unitSprite(id, frame?, palette?)`, `topSprite(id, frame?)` and `mapTexture(id, palette?)`. Each returns RGBA pixels or `null` for an absent image. Use job portrait/sprite fields and equipment `sprite`/`palette` fields from raw records (equipment palette uses its low byte). Images are extracted in memory using the same renderers as the Web UI. They are never part of a data package or a project asset. The optional image session loads more resources than analysis and reports `IMAGE_READ_ERROR` separately.

## CLI

```sh
node core/dist/cli.mjs export \
  --rom /local/input.zip --sha256 APPROVED_SHA256 \
  --edition standard --version APPROVED_LABEL --language zh-Hans \
  --word-table /local/charset.json --output /local/new-data.zip
node core/dist/cli.mjs verify \
  --package /local/new-data.zip --sha256 APPROVED_SHA256 \
  --edition standard --manifest-sha256 APPROVED_MANIFEST_SHA256
```

An input ZIP must contain exactly one flat NDS member. Output can be a new ZIP or directory; existing outputs are refused. Add `--english-rom`, `--english-sha256` and `--english-version` to attach a peer. `--strict` rejects any diagnostic; ordinary analysis retains warnings, including legitimate unknown values. Failures are structured JSON with `code`, `resource`, `message` and `details`. The CLI never uploads anything.

A package contains exactly `dataset.json`, `layout.json`, `dataset.schema.json`, and `manifest.json`. Canonical JSON and ZIP timestamps/order are deterministic. The manifest binds all payload hashes, sizes, ROM SHA, edition, charset SHA, layout SHA and core version. Pin its externally approved SHA when consuming a package; an internal checksum alone does not authenticate a source. See [consume-package.mjs](examples/consume-package.mjs) for a consumer that accepts only package files, without a ROM parser.

## Version 1 contract

- Dataset: `ffta2-editor.dataset/1`; package: `ffta2-editor.package/1`; layout: `ffta2-usa-sysdata-v1`. JSON Schema draft 2020-12 is shipped under `schema/`. Breaking changes require a new schema major. Consumers reject unsupported versions. Human-readable version labels do not replace ROM SHA identities.
- `source` records the exact ROM, explicit edition/version/language, external charset SHA and each named resource's identity. Files are found through NitroFS and the master archive, rather than physical ROM addresses. Layout offsets describe fields within records. Only the USA `A6FE` ABI is supported; this is not a promise to parse arbitrary MOD layouts.
- `tables` holds lossless unsigned raw fields, original IDs, unknown fields, enum values plus nullable symbols, and per-record SHA/source coordinates. Composite `key` values disambiguate domains. Reaction/support IDs retain their original shared ability namespace; items retain the equipment/consumable/loot namespace. Formation units use `formationUnits:<formation>:<slot>`.
- `relations` contains job sets, inclusive set membership, equipment teaching/group/job links, raw job requirements, formations and formation-0 recruitment. Recruitment resolves a zero formation job via the named character's default job, retaining both values and resolution status. Stored units beyond a formation header's count are retained separately. A missing set entry remains a null reference, never a read into the next archive member.
- `texts` uses IDs such as `message:0:6:123` or `questtext:0:123:0`. Each keeps payload SHA, resource/table/string coordinates, original decoded `value`, readable `plain`, language, empty state, unknown glyphs and structural/control tokens. `plain` converts line/page breaks and removes terminal bookkeeping; dynamic controls remain visible and are not evaluated. The optional charset is supplied by the caller; no private Chinese words are built into this core.
- `quests` joins quest info/data with name (message 6), short description (35), and full quest text. All slots remain present, including empty ones. Conditions retain raw fields and only field-identified references; story/flag/group semantics remain unknown. Prerequisite edges and event completion logic are explicitly unresolved. Category stays unknown until independently established. Dispatch is boolean only for raw 0/1. Stored gil/AP/CP/EXP values are not claimed to be observed payouts. Each reward retains the packed word, low-ten-bit item ID, upper-six-bit quantity, fourth-slot flag, missing/empty status and item text ID.
- `diagnostics` preserves unknown enums and unresolved references. Fatal shape/bounds/source errors throw `RomAnalysisError`; malformed reads never become empty/default records. Null, zero, empty text, unknown enum and absent references have distinct representations.

The older editable UI models normalize some fields for controls. They are not the public extraction contract. This raw decoder shares the Editor's containers/charset and defines a lossless analysis boundary; downstream projects must not copy parsing code or fall back to old Python readers. Java reference metadata generates generic bit labels via `web/scripts/generate-analysis-flags.mjs`; source hashes are included in the layout.

Generated packages can contain copyrighted game text or private localization. Keep them outside this public repository unless separately authorized. Public source/schema/tests contain synthetic fixtures only. Validation against a ROM proves stored configuration and text decoding, not a natural gameplay path or reward settlement.
