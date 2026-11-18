# FFTA2 Web Editor (TypeScript)

Browser port of the data-editing half of the original JavaFX FFTA2 editor.
The Java project at the repository root is kept as the behavioural reference;
`web/src` is a dependency-free TypeScript implementation of the ROM parsing,
model serialization and minimal NDS save path.

## Run

The production build is a single static page with relative asset paths, so it
works at a domain root or under a GitHub Pages project path. Pushing `main`
deploys it via `.github/workflows/deploy-pages.yml`.

```bash
cd web
npm ci
npm run dev
```

Open the printed URL, then **Open ROM…** and select an `.nds` file. In Chromium
the File System Access API is used to write only the changed byte spans back to
the same file. In other browsers, saving downloads the patched ROM.

- Official FFTA2 ROM: open the `.nds` directly.
- Chinese FFTA2 ROM: open the `.nds`; the editor detects double-byte text and
  uses the bundled FFTA-DECOMP V4.1 word table automatically.
- Word-table selector: Auto / US default / FFTA-DECOMP V4.1 / Local file…
- GitHub Pages: <https://hitsmaxft.github.io/ffta2-editor/> after the workflow
  runs.

For development you can auto-load a served ROM:

```bash
# from web/, with the ROM under ../data (Vite is configured to allow that dir)
npm run dev -- --open '/?rom=/data/extracted/your-rom.nds'
```

## What is implemented

- NDS filesystem parser (FAT/FNT/overlay table), no external `ndstool`.
- `pc.idx`/`pc.bin` archive parser + repacker (`Archive`).
- All `.idx`/`.pak` containers and the data domains edited by the Java app:
  text tables, active/SP abilities + animations, jobs/ability sets, characters,
  job groups/requirements, equipment/consumables/loot/item tables/law bonuses,
  formations, quests, bazaar, auctions, sprites/faces/top-sprites/maps.
- The save order and serialization logic are ported line-for-line from the Java
  models/controllers. UI-only JavaFX properties/cell renderers are omitted.
- Relationship-aware form UI: numeric foreign keys display as `#id name` and use
  searchable dropdowns (items, abilities, jobs, formations, etc.); enums are
  dropdowns; record fields are grouped into sections. Nested records, arrays,
  bit flags and hex byte arrays remain editable. Read-only domains
  (sprites/maps) are still inspectable.
- UI language switch: English / 中文, persisted in localStorage and auto-detected
  from the browser locale. Fields, all enum choices, nested headings, reference
  fallbacks and known equipment/job/race/region bits have Chinese labels.
- Chinese mode adds 2,987 category-scoped display-name translations for jobs,
  abilities, items, characters, quests, laws, bazaar sets and locations. Exact
  English matches display as Chinese + original, supporting bilingual search;
  custom names and ROM text are preserved. See [UI localization notes](UI-LOCALIZATION.md)
  for sources, regeneration and verification boundaries.
- Save uses a minimal in-place patch plan. Changed files that fit their original
  FAT span are overwritten; grown files are appended and the FAT/header updated.
- The optional ARM9/overlay code patches from the Java `PatchesController`
  (animation fix, signed equipment stats, MP gain, etc.) are not ported yet.
  The expanded-top-sprite layout detection *is* ported because it changes the
  serialized job record size.

## Chinese / double-byte word table

Localized ROMs (including the bundled Chinese test ROM) use the otherwise
unused `0xA9..0xBF` bytes as double-byte lead bytes.

The toolbar exposes a word-table selector:

- **Auto** — detect Chinese double-byte text and use the built-in
  FFTA-DECOMP V4.1 table.
- **US default** — use the original single-byte charset, no external table.
- **FFTA-DECOMP V4.1** — force the built-in FFTA-DECOMP V4.1 table.
- **Local file…** — load a custom `glyphs.json`, `decode.tbl`, `glyphs.csv`,
  or TSV word table.

The built-in file is `web/public/wordtables/ffta-decomp-v4.1.tsv`, derived from
the public **FFTA-DECOMP / FFTA2-US-CHS V4.1** charset published under GNU GPL
v3. See `web/public/wordtables/README.md` and `GPL-3.0.txt` for attribution and
license. Only the code-to-text mapping is included — no ROM, font, translation
or other game assets.

Custom JSON format:

```json
{
  "name": "FFTA2 Chinese",
  "leadBytes": ["A9-BF"],
  "entries": { "ABD8": "阿", "AA3B": "尔" }
}
```

or TSV/CSV:

```text
# name FFTA2 Chinese
# lead A9-BF
ABD8	阿
AA3B	尔
```

Codes are hex. Unknown double-byte codes are displayed as
`<unknown:ABD8>` and are encoded back to the original two bytes, so loading a
partial word table does not destroy uncovered Chinese text.

Generate a fill-in template containing every double-byte code found in a ROM:

```bash
cd web
npm run wordtable -- ../data/extracted/your-rom.nds ../data/chinese-wordtable.tsv
```

Fill the second column and load the resulting TSV. The editor re-decodes the
text tables immediately. Without a word table the original single-byte charset
behavior is retained.

## Tests and byte-consistency verification

```bash
cd web
npm test
npm run build
```

Test fixtures are local/synthetic except for one git-ignored ability-name parity
fixture; see [`test/FIXTURES.md`](test/FIXTURES.md). Real ROMs and oracle payloads
under `../data/` are never committed.

The suite has three layers:

1. Reference fixtures generated from the original Java classes for every model
   (`test/fixtures`), compared byte-for-byte against TS `toBytes()` output.
2. Real-ROM read/repack tests against `../data/extracted/*.nds`.
3. Java-oracle comparisons (`test/realrom-compare.test.ts`,
   `test/acceptance.test.ts`). These compare complete saved payloads
   (`pc.idx`, `pc.bin`, `arm9`, `overlay11`) byte-for-byte with the original
   Java implementation, including a full controller load → deterministic edit
   → save pipeline.

Regenerate the oracle payloads after changing the Java reference:

```bash
mvn -q -DskipTests compile       # from the repository root
tools/oracle/run.sh              # needs JDK 25 + JavaFX 25 from ~/.m2
```

The current local verification result is all payloads identical:

- `oracle_full_pc.{idx,bin}` == TS container save
- `oracle_acc_pc.{idx,bin}` == TS full-pipeline save
- `oracle_acc_arm9.bin` / `oracle_acc_overlay11.bin` == TS patched arm9/overlay
- Applying either payload to the same ROM copy produces identical final `.nds`
  bytes (`test/acceptance.test.ts`).
