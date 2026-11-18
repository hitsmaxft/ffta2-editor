#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { analyzeRom, attachTextReference, createDataPackage, verifyDataPackage, RomAnalysisError, sha256, DATASET_JSON_SCHEMA, canonicalJson, type Edition } from '../src/api/index';
import { readZip, reproducibleZip } from './data-zip';

const HELP = `FFTA2 Editor Core 0.1.0 (read-only; no upload)
  export --rom FILE.nds|FILE.zip --sha256 HEX --edition standard|acj --version LABEL
         --output NEW_DIRECTORY|NEW_FILE.zip [--word-table FILE] [--language TAG]
         [--english-rom FILE --english-sha256 HEX --english-version LABEL] [--strict]
  verify --package DIRECTORY|FILE.zip --sha256 HEX [--edition standard|acj] [--manifest-sha256 HEX]
  schema
Exported data can contain game text. Keep it private unless separately authorized.
`;
function options(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const allowed = new Set(['rom', 'sha256', 'edition', 'version', 'output', 'word-table', 'language', 'english-rom', 'english-sha256', 'english-version', 'strict', 'package', 'manifest-sha256']);
  while (args.length) {
    const flag = args.shift()!;
    if (!flag.startsWith('--') || !allowed.has(flag.slice(2)) || flag.slice(2) in result) throw new RomAnalysisError('CLI_OPTIONS', 'CLI', 'Unknown or duplicate option');
    const key = flag.slice(2), value = key === 'strict' ? 'true' : args.shift();
    if (!value || value.startsWith('--')) throw new RomAnalysisError('CLI_OPTIONS', 'CLI', `Option requires a value: ${flag}`);
    result[key] = value;
  }
  return result;
}
function need(options: Record<string, string>, key: string): string {
  const value = options[key];
  if (!value) throw new RomAnalysisError('CLI_OPTIONS', 'CLI', `Missing --${key}`);
  return value;
}
function bytes(path: string): Uint8Array {
  if (statSync(path).size > 512 * 1024 * 1024) throw new RomAnalysisError('INPUT_LIMIT', 'input', 'Input exceeds 512 MiB');
  return new Uint8Array(readFileSync(path));
}
function rom(path: string): Uint8Array {
  const raw = bytes(path);
  if (!path.toLowerCase().endsWith('.zip')) return raw;
  const files = readZip(raw, 'rom'), names = Object.keys(files);
  if (names.length !== 1 || !names[0].toLowerCase().endsWith('.nds')) throw new RomAnalysisError('ROM_ZIP', 'ZIP', 'ROM ZIP must contain exactly one NDS file');
  return files[names[0]];
}
function packageFiles(path: string): Record<string, Uint8Array> {
  if (statSync(path).isDirectory()) return Object.fromEntries(['dataset.json', 'manifest.json', 'layout.json', 'dataset.schema.json'].map((name) => [name, bytes(join(path, name))]));
  return readZip(bytes(path), 'package');
}
async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || command === 'help') { process.stdout.write(HELP); return; }
  if (command === 'schema') { process.stdout.write(canonicalJson(DATASET_JSON_SCHEMA)); return; }
  const o = options(args);
  if (command === 'verify') {
    const files = packageFiles(need(o, 'package'));
    const verified = await verifyDataPackage(files, { romSha256: need(o, 'sha256'), edition: o.edition as Edition | undefined, manifestSha256: o['manifest-sha256'] });
    console.log(JSON.stringify({ status: 'verified', romSha256: verified.dataset.source.romSha256, manifestSha256: await sha256(files['manifest.json']) }));
    return;
  }
  if (command !== 'export') throw new RomAnalysisError('CLI_COMMAND', 'CLI', 'Unknown command');
  const output = need(o, 'output');
  if (existsSync(output)) throw new RomAnalysisError('OUTPUT_EXISTS', 'output', 'Refusing to overwrite an existing export');
  const edition = need(o, 'edition') as Edition;
  let dataset = await analyzeRom(rom(need(o, 'rom')), { expectedSha256: need(o, 'sha256'), edition, version: need(o, 'version'),
    textLanguage: o.language ?? 'und', strictDiagnostics: o.strict === 'true',
    wordTable: o['word-table'] ? { bytes: bytes(o['word-table']), format: basename(o['word-table']) } : undefined });
  if (o['english-rom'] || o['english-sha256']) {
    const reference = await analyzeRom(rom(need(o, 'english-rom')), { expectedSha256: need(o, 'english-sha256'), edition,
      version: o['english-version'] ?? 'English text reference', textLanguage: 'en' });
    dataset = attachTextReference(dataset, reference);
  }
  const files = await createDataPackage(dataset);
  await verifyDataPackage(files, { romSha256: dataset.source.romSha256, edition });
  mkdirSync(dirname(output), { recursive: true });
  if (output.toLowerCase().endsWith('.zip')) writeFileSync(output, reproducibleZip(files), { flag: 'wx' });
  else { mkdirSync(output); for (const [name, file] of Object.entries(files)) writeFileSync(join(output, name), file, { flag: 'wx' }); }
  console.log(JSON.stringify({ status: 'exported', schema: dataset.schema, coreVersion: dataset.coreVersion, edition,
    romSha256: dataset.source.romSha256, manifestSha256: await sha256(files['manifest.json']),
    packageSha256: output.toLowerCase().endsWith('.zip') ? await sha256(bytes(output)) : null,
    records: Object.fromEntries(Object.entries(dataset.tables).map(([key, rows]) => [key, rows.length])),
    recruitment: dataset.relations.recruitment.length, quests: dataset.quests.length, diagnostics: dataset.diagnostics.length }));
}
main().catch((error: unknown) => {
  console.error(JSON.stringify({ status: 'error', ...(error instanceof RomAnalysisError ? error.toJSON() : { code: 'CLI_ERROR', message: error instanceof Error ? error.message : String(error) }) }));
  process.exitCode = 1;
});
