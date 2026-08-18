/** Unformat's deliberately small, ordered, text-only cleaning pipeline. */

export const PRESETS = {
  safe: {
    normalizeNfc: true, normalizeNfkc: false, repairMojibake: true,
    normalizeLines: true, normalizeSpaces: true, removeInvisibles: true,
    trimLines: true, collapseBlankLines: true, markdown: false,
    keepUrls: true, decodeEntities: true, quotes: false, dashes: false,
    ellipsis: false, englishSpacing: false
  },
  plain: {
    normalizeNfc: true, normalizeNfkc: false, repairMojibake: true,
    normalizeLines: true, normalizeSpaces: true, removeInvisibles: true,
    trimLines: true, collapseBlankLines: true, markdown: true,
    keepUrls: true, decodeEntities: true, quotes: true, dashes: true,
    ellipsis: true, englishSpacing: true
  }
};

const FENCE_TOKEN = '\uE000CTF';
const INLINE_TOKEN = '\uE000CTI';
const mojibake = new Map([
  ['â€™', '’'], ['â€˜', '‘'], ['â€œ', '“'], ['â€\x9d', '”'], ['â€\u009d', '”'],
  ['â€\x9c', '“'], ['â€\u009c', '“'], ['â€“', '–'], ['â€”', '—'], ['â€¦', '…'],
  ['Â\u00a0', ' '], ['Â ', ' ']
]);

function tracker() {
  const changes = {};
  return {
    changes,
    add(category, count) { if (count) changes[category] = (changes[category] || 0) + count; },
    replace(text, regex, value, category) {
      const count = Array.from(text.matchAll(regex)).length;
      const output = typeof value === 'function' ? text.replace(regex, value) : text.replace(regex, value);
      this.add(category, count); return output;
    }
  };
}

function protectFences(text, store, t, removeFences) {
  return text.replace(/(^|\n)([ \t]*)(`{3,}|~{3,})[^\n]*(\n|$)([\s\S]*?)(?:\n\2\3[ \t]*(?=\n|$)|$)/g,
    (whole, lead, indent, fence, afterStart, code) => {
      store.push(code);
      if (removeFences) t.add('fenced-code delimiters removed', 2);
      return lead + (removeFences ? '' : `${indent}${fence}${afterStart}`) + `${FENCE_TOKEN}${store.length - 1}\uE001` + (removeFences ? '' : `\n${indent}${fence}`);
    });
}
function restore(text, store, prefix) {
  const re = new RegExp(`${prefix}(\\d+)\\uE001`, 'g');
  return text.replace(re, (_, n) => store[Number(n)]);
}
function protectInline(text, store, t) {
  return text.replace(/`([^`\n]+)`/g, (_, code) => {
    store.push(code); t.add('inline-code delimiters removed', 2); return `${INLINE_TOKEN}${store.length - 1}\uE001`;
  });
}
function decodeEntities(text, t) {
  const names = { nbsp: '\u00a0', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
  return t.replace(text, /&(#x[0-9a-f]+|#\d+|nbsp|amp|quot|apos|lt|gt);/gi, (whole, entity) => {
    const key = entity.toLowerCase();
    if (names[key] !== undefined) return names[key];
    const number = key.startsWith('#x') ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
    try { return Number.isValid ? (Number.isFinite(number) && number >= 0 && number <= 0x10ffff ? String.fromCodePoint(number) : whole) : whole; } catch { return whole; }
  }, 'entities');
}
function markdown(text, options, t, inlines) {
  text = protectInline(text, inlines, t);
  text = t.replace(text, /^(?: {0,3}#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/gm, '$1', 'heading marker removed');
  text = t.replace(text, /^[ \t]*(?:>\s?)+/gm, '', 'block quote marker removed');
  text = t.replace(text, /^[ \t]*(?:[-*_][ \t]*){3,}$/gm, '', 'horizontal rule removed');
  text = t.replace(text, /^(\s*)[-*+]\s+\[([ xX])\]\s+/gm, (_, indent, done) => `${indent}- [${done.toLowerCase() === 'x' ? 'x' : ' '}] `, 'task-list marker normalized');
  text = t.replace(text, /^(\s*)[*+]\s+/gm, '$1- ', 'list bullet normalized');
  text = t.replace(text, /!\[([^\]]*)\]\([^\s)]+(?:\s+"[^"]*")?\)/g, '$1', 'image syntax removed');
  text = t.replace(text, /\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g,
    (_, label, url) => options.keepUrls ? `${label} (${url})` : label, 'Markdown link converted');
  text = t.replace(text, /<((?:https?:\/\/|mailto:)[^ >]+)>/g, '$1', 'autolink brackets removed');
  // Simple pipe tables: remove separator rows, retain readable TSV-like cells.
  text = t.replace(text, /^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?[ \t]*$/gm, '', 'table separator removed');
  text = t.replace(text, /^[ \t]*\|[ \t]*(.*?)[ \t]*\|[ \t]*$/gm, (_, cells) => cells.split('|').map(x => x.trim()).join(' | '), 'table row normalized');
  text = t.replace(text, /(?<!\w)(\*\*\*|___)([^\n]+?)\1(?!\w)/g, '$2', 'bold-italic markers removed');
  text = t.replace(text, /(?<!\w)(\*\*|__)([^\n]+?)\1(?!\w)/g, '$2', 'bold markers removed');
  text = t.replace(text, /~~([^\n]+?)~~/g, '$1', 'strikethrough markers removed');
  text = t.replace(text, /(?<!\w)(\*|_)([^\s\n][^\n]*?[^\s\n])\1(?!\w)/g, '$2', 'italic markers removed');
  return text;
}

export function cleanText(input, suppliedOptions = PRESETS.safe) {
  const options = { ...PRESETS.safe, ...suppliedOptions };
  const t = tracker();
  let text = String(input ?? '');
  const fences = [];
  // Fenced contents are shielded before every prose-oriented transformation.
  text = protectFences(text, fences, t, options.markdown);
  if (options.normalizeNfc) { const out = text.normalize('NFC'); if (out !== text) t.add('Unicode', 1); text = out; }
  if (options.normalizeNfkc) { const out = text.normalize('NFKC'); if (out !== text) t.add('Unicode', 1); text = out; }
  if (options.repairMojibake) for (const [bad, good] of mojibake) text = t.replace(text, new RegExp(bad, 'g'), good, 'encoding');
  const replacement = (text.match(/\uFFFD/g) || []).length; if (replacement) t.add('unrecoverable characters', replacement);
  if (options.decodeEntities) text = decodeEntities(text, t);
  if (options.normalizeLines) {
    text = t.replace(text, /\r\n?/g, '\n', 'whitespace');
    text = t.replace(text, /\u2028|\u0085/g, '\n', 'whitespace');
    text = t.replace(text, /\u2029/g, '\n\n', 'whitespace');
  }
  if (options.removeInvisibles) text = t.replace(text, /[\u00AD\u200B\u2060\uFEFF]/g, '', 'whitespace');
  if (options.normalizeSpaces) text = t.replace(text, /[\u00A0\u202F\u2000-\u200A\u205F\u3000]/g, ' ', 'spaces');
  const inlines = [];
  if (options.markdown) text = markdown(text, options, t, inlines);
  if (options.quotes) text = t.replace(text, /[\u2018\u2019\u201A\u201B]/g, "'", 'quotes');
  if (options.quotes) text = t.replace(text, /[\u201C\u201D\u201E\u201F]/g, '"', 'quotes');
  if (options.dashes) {
    text = t.replace(text, /\u2013/g, '-', 'dashes');
    text = t.replace(text, /\s*\u2014\s*/g, ' - ', 'dashes');
  }
  if (options.ellipsis) text = t.replace(text, /\u2026/g, '...', 'typography');
  if (options.englishSpacing) {
    text = t.replace(text, /[^\S\r\n]+/g, ' ', 'spaces');
    text = t.replace(text, /[ \t]+([,.;!?])/g, '$1', 'spaces');
    text = t.replace(text, /([\[(])[ \t]+/g, '$1', 'spaces');
    text = t.replace(text, /[ \t]+([\])])/g, '$1', 'spaces');
    text = t.replace(text, /[ \t]+-[ \t]+/g, ' - ', 'spaces');
  }
  if (options.trimLines) text = t.replace(text, /[\t ]+$/gm, '', 'whitespace');
  if (options.collapseBlankLines) text = t.replace(text, /\n{3,}/g, '\n\n', 'whitespace');
  text = restore(text, inlines, INLINE_TOKEN);
  text = restore(text, fences, FENCE_TOKEN);
  return { text, changes: t.changes, total: Object.values(t.changes).reduce((a, b) => a + b, 0) };
}
