import type { TextRecord } from './types';

/** Presentation tokens preserve every control; no event/state variables are evaluated. */
export function displayTokens(value: string): TextRecord['tokens'] {
  const tokens: TextRecord['tokens'] = [];
  let at = 0;
  while (at < value.length) {
    if (value.startsWith('\\n', at)) { tokens.push({ kind: 'line-break', value: '\\n' }); at += 2; continue; }
    if (value[at] === '\n') { tokens.push({ kind: 'line-break', value: '\n' }); at++; continue; }
    const unknown = /^<unknown:[0-9a-fA-F]+>/.exec(value.slice(at));
    if (unknown) { tokens.push({ kind: 'unknown', value: unknown[0] }); at += unknown[0].length; continue; }
    const control = /^\\[A-Za-z0-9]+(?::[^\\]*)?\\/.exec(value.slice(at));
    if (control) {
      tokens.push({ kind: control[0] === '\\endPage\\' ? 'page-break' : 'control', value: control[0] }); at += control[0].length; continue;
    }
    const last = tokens.at(-1);
    if (last?.kind === 'text') last.value += value[at++];
    else tokens.push({ kind: 'text', value: value[at++] });
  }
  return tokens;
}
export function plainText(value: string): string {
  return displayTokens(value).map((token) => {
    if (token.kind === 'line-break') return '\n';
    if (token.kind === 'page-break') return '\n\n';
    if (token.kind === 'control' && /^\\(?:var2:00|var9:00|end)\\$/.test(token.value)) return '';
    return token.value;
  }).join('').trim();
}
