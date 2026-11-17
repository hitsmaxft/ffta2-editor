// Small DOM helpers shared by the editor tabs.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: Array<Node | string> = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

export interface RecordListOpts {
  label: (index: number) => string;
  count: number;
  onSelect: (index: number) => void;
  filter?: string;
}

// A searchable, selectable record list. Returns the <ul> and a setSelected fn.
export function recordList(opts: RecordListOpts): { list: HTMLUListElement; setSelected: (i: number) => void } {
  const list = el('ul', { class: 'record-list' });
  const items: HTMLLIElement[] = [];
  const filter = (opts.filter ?? '').toLowerCase();
  for (let i = 0; i < opts.count; i++) {
    const label = opts.label(i);
    if (filter && !label.toLowerCase().includes(filter) && !String(i).includes(filter)) continue;
    const li = el('li', {}, [el('span', { class: 'idx', text: String(i) }), label]);
    li.onclick = () => opts.onSelect(i);
    items[i] = li;
    list.append(li);
  }
  const setSelected = (i: number) => {
    for (const li of items) li?.classList.remove('selected');
    items[i]?.classList.add('selected');
    items[i]?.scrollIntoView?.({ block: 'nearest' });
  };
  return { list, setSelected };
}

export function searchBox(placeholder: string, onInput: (value: string) => void): HTMLInputElement {
  const input = el('input', { class: 'search', type: 'text', placeholder });
  input.oninput = () => onInput(input.value);
  return input;
}

export function formRow(label: string, control: HTMLElement): [HTMLLabelElement, HTMLElement] {
  const lab = el('label', { text: label });
  return [lab, control];
}

export function textInput(value: string, onChange: (v: string) => void): HTMLInputElement {
  const input = el('input', { type: 'text' });
  input.value = value;
  input.onchange = () => onChange(input.value);
  return input;
}

export function textArea(value: string, onChange: (v: string) => void): HTMLTextAreaElement {
  const ta = el('textarea');
  ta.value = value;
  ta.onchange = () => onChange(ta.value);
  return ta;
}

export function numberInput(value: number, onChange: (v: number) => void, opts: { min?: number; max?: number } = {}): HTMLInputElement {
  const input = el('input', { type: 'number' });
  if (opts.min !== undefined) input.min = String(opts.min);
  if (opts.max !== undefined) input.max = String(opts.max);
  input.value = String(value);
  input.onchange = () => {
    const n = Number(input.value);
    if (!Number.isNaN(n)) onChange(n);
  };
  return input;
}