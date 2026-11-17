// Local ROM file I/O. Uses the File System Access API for efficient in-place
// saves (only changed byte spans are written); falls back to <input type=file>
// + Blob download where the API is unavailable.

import { PatchPlan } from '../core/nds';

interface WritableFileStream {
  write(data: { type: 'write'; position: number; data: Uint8Array } | Uint8Array): Promise<void>;
  truncate(size: number): Promise<void>;
  close(): Promise<void>;
}
export interface RomFileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(opts?: { keepExistingData?: boolean }): Promise<WritableFileStream>;
}

declare global {
  interface Window {
    showOpenFilePicker?(opts?: unknown): Promise<RomFileHandle[]>;
    showSaveFilePicker?(opts?: unknown): Promise<RomFileHandle>;
  }
}

export function supportsFsAccess(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';
}

export interface OpenedRom {
  bytes: Uint8Array;
  name: string;
  handle: RomFileHandle | null;
}

export async function openRomViaPicker(): Promise<OpenedRom | null> {
  const handles = await window.showOpenFilePicker!({
    types: [{ description: 'NDS ROM', accept: { 'application/octet-stream': ['.nds'] } }],
    multiple: false,
  });
  const handle = handles[0];
  if (!handle) return null;
  const file = await handle.getFile();
  return { bytes: new Uint8Array(await file.arrayBuffer()), name: file.name, handle };
}

export function openRomViaInput(input: HTMLInputElement): Promise<OpenedRom | null> {
  return new Promise((resolve) => {
    input.onchange = async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) { resolve(null); return; }
      resolve({ bytes: new Uint8Array(await file.arrayBuffer()), name: file.name, handle: null });
    };
    input.click();
  });
}

// Write only the changed spans into the existing local file.
export async function saveInPlace(handle: RomFileHandle, plan: PatchPlan): Promise<void> {
  const writable = await handle.createWritable({ keepExistingData: true });
  try {
    for (const w of plan.writes) {
      await writable.write({ type: 'write', position: w.position, data: w.data });
    }
    await writable.truncate(plan.newRomSize);
  } finally {
    await writable.close();
  }
}

export async function saveAsViaPicker(suggestedName: string, bytes: Uint8Array): Promise<boolean> {
  const handle = await window.showSaveFilePicker!({
    suggestedName,
    types: [{ description: 'NDS ROM', accept: { 'application/octet-stream': ['.nds'] } }],
  });
  const writable = await handle.createWritable();
  try {
    await writable.write(bytes);
  } finally {
    await writable.close();
  }
  return true;
}

export function downloadRom(name: string, bytes: Uint8Array): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}