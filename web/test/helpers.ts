import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const fixturesDir = join(here, 'fixtures');
export const tsOutputDir = join(here, 'ts-output');

export function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(fixturesDir, name)));
}

export function fixtureJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8')) as T;
}

export function tsOutput(name: string, data: Uint8Array): void {
  const p = join(tsOutputDir, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
}

export function listFixtureDir(name: string): string[] {
  return readdirSync(join(fixturesDir, name));
}

export function assertBytesEqual(actual: Uint8Array, expected: Uint8Array, label: string): void {
  if (actual.length !== expected.length) {
    throw new Error(`${label}: length mismatch ${actual.length} != ${expected.length}`);
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(`${label}: byte mismatch at ${i} (0x${actual[i].toString(16)} != 0x${expected[i].toString(16)})`);
    }
  }
}