import { unzipSync, zipSync } from 'fflate';
import { RomAnalysisError } from '../src/api/errors';

export function readZip(bytes: Uint8Array, kind: 'rom' | 'package'): Record<string, Uint8Array> {
  let count = 0;
  const files = unzipSync(bytes, { filter: (file) => {
    count++;
    if (count > (kind === 'rom' ? 1 : 4) || file.originalSize > (kind === 'rom' ? 512 * 1024 * 1024 : 128 * 1024 * 1024)) {
      throw new RomAnalysisError('ZIP_LIMIT', 'ZIP', 'Archive exceeds the allowed member count or size');
    }
    if (file.name.includes('/') || file.name.includes('\\') || file.name === '..') throw new RomAnalysisError('ZIP_MEMBER', 'ZIP', 'Only flat data-package/ROM member names are accepted');
    return true;
  } });
  if (!count || Object.keys(files).length !== count) throw new RomAnalysisError('ZIP_MEMBERS', 'ZIP', 'Empty or repeated ZIP member names');
  return files;
}
export function reproducibleZip(files: Record<string, Uint8Array>): Uint8Array {
  const entries = Object.fromEntries(Object.keys(files).sort().map((name) => [name, [files[name], { mtime: new Date(1980, 0, 1), level: 9 as const, os: 0, attrs: 0 }]]));
  return zipSync(entries as Parameters<typeof zipSync>[0]);
}
