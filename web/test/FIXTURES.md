# Test fixtures

Most files under `web/test/fixtures/` are **synthetic** binary/JSON fixtures
created to exercise parsers and byte serializers. They are not extracted game
assets.

The real ROM, `pc.bin`/`pc.idx` dumps and Java/TS oracle payloads live under the
repository-level `data/` directory, which is git-ignored and never distributed.

Exception:

- `web/test/fixtures/ability/abilityId.json` contains game-derived ability
  names used for a Java-parity check. It is git-ignored/local-only. Its test is
  skipped when the file is absent. The `AbilityId` table itself lives in
  `web/src/data/model/abilityId.ts` because the editor needs it to display ids.
