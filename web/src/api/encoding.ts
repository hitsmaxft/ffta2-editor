export function canonicalJson(value: unknown): string {
  const sort = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(sort);
    if (input && typeof input === 'object') return Object.fromEntries(Object.keys(input).sort().map((key) => [key, sort((input as Record<string, unknown>)[key])]));
    return input;
  };
  return JSON.stringify(sort(value)) + '\n';
}
export const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);
export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
