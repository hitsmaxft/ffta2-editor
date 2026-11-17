// Dropdown/autocomplete controls for enum fields and numeric game-data ids.

import { el } from './widgets';
import type { EnumDef } from '../data/model/enums';
import type { RefOption } from './schema';

let nextDatalistId = 0;

function labelOf(option: RefOption): string {
  return option.name ? `#${option.id} ${option.name}` : `#${option.id}`;
}

export function referenceInput(
  current: number,
  options: RefOption[],
  onChange: (value: number) => void
): HTMLElement {
  const listId = `ref-options-${++nextDatalistId}`;
  const input = el('input', { type: 'text', class: 'ref-input', autocomplete: 'off' });
  input.value = labelOf(
    options.find((option) => option.id === current) ?? { id: current, name: '' }
  );

  const datalist = el('datalist', { id: listId });
  for (const option of options) {
    const opt = el('option', { value: labelOf(option) });
    datalist.append(opt);
  }
  input.setAttribute('list', listId);

  const commit = () => {
    const text = input.value.trim();
    const numeric = /^#?\s*(-?\d+)/.exec(text);
    let id: number | undefined = numeric ? Number(numeric[1]) : undefined;
    if (id === undefined) {
      id = options.find((option) => option.name === text)?.id;
    }
    if (id === undefined || Number.isNaN(id)) {
      input.classList.add('invalid');
      // Restore the previous value rather than silently writing NaN.
      input.value = labelOf(
        options.find((option) => option.id === current) ?? { id: current, name: '' }
      );
      return;
    }
    input.classList.remove('invalid');
    onChange(id);
    input.value = labelOf(
      options.find((option) => option.id === id) ?? { id, name: '' }
    );
  };
  input.onchange = commit;
  input.onblur = commit;

  const wrapper = el('div', { class: 'ref-control' });
  wrapper.append(input, datalist);
  return wrapper;
}

export function enumInput(
  current: number,
  enumeration: EnumDef,
  onChange: (value: number) => void
): HTMLSelectElement {
  const select = el('select', { class: 'enum-input' });
  let known = false;
  for (const item of enumeration.values) {
    const option = el('option', { value: String(item.value), text: `${item.name} (#${item.value})` });
    if (item.value === current) known = true;
    select.append(option);
  }
  if (!known) {
    select.append(el('option', {
      value: String(current),
      text: `0x${(current & 0xff).toString(16).toUpperCase().padStart(2, '0')} (unknown)`,
    }));
  }
  select.value = String(current);
  select.onchange = () => onChange(Number(select.value));
  return select;
}
