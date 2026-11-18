// Searchable dropdown controls for numeric game-data ids and enums.

import { el } from './widgets';
import type { EnumDef } from '../data/model/enums';
import type { RefOption } from './schema';
import { enumLabel, t } from './i18n';

function labelOf(option: RefOption): string {
  return option.name ? `#${option.id} ${option.name}` : `#${option.id}`;
}

export function referenceInput(
  current: number,
  options: RefOption[],
  onChange: (value: number) => void
): HTMLElement {
  let selected = current;
  let highlighted = -1;
  let visible: RefOption[] = [];

  const wrapper = el('div', { class: 'search-select' });
  const input = el('input', {
    type: 'text',
    class: 'search-select-input',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  const toggle = el('button', { type: 'button', class: 'search-select-toggle', text: '▾', tabindex: '-1' });
  const list = el('ul', { class: 'search-select-list' });
  list.hidden = true;
  list.setAttribute('role', 'listbox');
  wrapper.append(input, toggle, list);

  const selectedLabel = () =>
    labelOf(options.find((option) => option.id === selected) ?? { id: selected, name: '' });

  const close = () => {
    list.hidden = true;
    highlighted = -1;
    input.setAttribute('aria-expanded', 'false');
    input.value = selectedLabel();
    input.classList.remove('invalid');
  };

  const choose = (option: RefOption) => {
    selected = option.id;
    input.value = labelOf(option);
    onChange(option.id);
    close();
  };

  const renderList = (query: string) => {
    const q = query.trim().toLowerCase();
    visible = options.filter((option) => {
      if (!q) return true;
      const text = labelOf(option).toLowerCase();
      return text.includes(q) || String(option.id) === q;
    });
    highlighted = -1;
    list.replaceChildren();
    if (visible.length === 0) {
      list.append(el('li', { class: 'search-select-empty', text: t('ref.noMatches') }));
    } else {
      visible.forEach((option, index) => {
        const item = el('li', { class: 'search-select-option', text: labelOf(option) });
        item.setAttribute('role', 'option');
        item.onmousedown = (e) => { e.preventDefault(); choose(option); };
        item.onmouseenter = () => { highlighted = index; refreshHighlight(); };
        list.append(item);
      });
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const refreshHighlight = () => {
    [...list.children].forEach((node, index) => {
      node.classList.toggle('highlighted', index === highlighted);
    });
    const node = list.children[highlighted];
    node?.scrollIntoView?.({ block: 'nearest' });
  };

  const open = () => {
    renderList('');
    input.select();
  };

  input.onfocus = open;
  input.onclick = () => { if (list.hidden) open(); };
  input.oninput = () => renderList(input.value);
  input.onblur = () => {
    // Let an option's mousedown finish before closing.
    setTimeout(() => {
      if (!list.hidden) close();
    }, 0);
  };
  toggle.onmousedown = (e) => e.preventDefault();
  toggle.onclick = () => { if (list.hidden) open(); else close(); };
  input.onkeydown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (list.hidden) open();
      highlighted = Math.min(highlighted + 1, visible.length - 1);
      refreshHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlighted = Math.max(highlighted - 1, 0);
      refreshHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = visible[highlighted] ?? visible[0];
      if (option) choose(option);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
      input.blur();
    }
  };

  input.value = selectedLabel();
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
    const option = el('option', { value: String(item.value), text: `${enumLabel(item.name, item.name)} (#${item.value})`, title: item.name });
    if (item.value === current) known = true;
    select.append(option);
  }
  if (!known) {
    select.append(el('option', {
      value: String(current),
      text: `0x${(current & 0xff).toString(16).toUpperCase().padStart(2, '0')} (${t('ref.unknown')})`,
    }));
  }
  select.value = String(current);
  select.onchange = () => onChange(Number(select.value));
  return select;
}
