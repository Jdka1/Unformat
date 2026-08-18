import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, PRESETS } from '../cleaner.js';

const safe = input => cleanText(input, PRESETS.safe).text;
const plain = input => cleanText(input, PRESETS.plain).text;
test('ASCII is unchanged in Safe Clean', () => assert.equal(safe('A normal sentence.\n\nAnother.'), 'A normal sentence.\n\nAnother.'));
test('plain typography: quotes, apostrophes, dashes, and ellipsis', () => {
  assert.equal(plain('“Don’t” 2024–2026—yes…'), '"Don\'t" 2024-2026 - yes...');
});
test('spaces and invisibles', () => {
  assert.equal(safe('a\u00a0b\u202fc\u2009d\u200be\u2060f\u00adg\ufeffh'), 'a b c defgh');
});
test('preserves ZWNJ, emoji ZWJ, and bidi-safe joiners', () => assert.equal(safe('a\u200cb 👨‍👩‍👧‍👦'), 'a\u200cb 👨‍👩‍👧‍👦'));
test('normalizes all common line separators and blanks', () => assert.equal(safe('a\r\nb\rc\u2028d\u2029e   \n\n\n\nf'), 'a\nb\nc\nd\n\ne\n\nf'));
test('Markdown presentation cleanup', () => {
  const input = '### **Important** — “Don’t forget…”\n> hello\n* item\n1. stay\n~~old~~\n';
  assert.equal(plain(input), 'Important - "Don\'t forget..."\nhello\n- item\n1. stay\nold\n');
});
test('Markdown emphasis only removes actual marker pairs', () => assert.equal(plain('**bold** *italics* ***both*** a_b c'), 'bold italics both a_b c'));
test('links, images, autolinks, and URLs', () => {
  assert.equal(plain('[OpenAI](https://example.com/a_b?q=x) ![cat](img.png) <https://x.test/a_b>'), 'OpenAI (https://example.com/a_b?q=x) cat https://x.test/a_b');
  assert.equal(cleanText('[OpenAI](https://example.com)', { ...PRESETS.plain, keepUrls: false }).text, 'OpenAI');
});
test('inline and fenced code contents are protected', () => {
  assert.equal(plain('Use `foo_bar() — “x”` now.'), 'Use foo_bar() — “x” now.');
  assert.equal(plain('Before\n```js\nconst s = "**hello** — world";\n```\nAfter'), 'Before\nconst s = "**hello** — world";\nAfter');
});
test('mojibake repairs before typography conversion', () => {
  assert.equal(safe('â€œHiâ€\x9d â€” x'), '“Hi” — x');
  assert.equal(plain('â€œHiâ€\x9d â€” x'), '"Hi" - x');
});
test('entities, headings, blockquotes, lists, and tables', () => {
  assert.equal(plain('# A&nbsp;&amp; B\n| H | V |\n|---|---|\n| a | b |'), 'A & B\nH | V\n\na | b');
});
test('cleaning is idempotent', () => {
  const once = plain('### **Important** — “Don’t forget…”\n\n\n`x_y`');
  assert.equal(plain(once), once);
});
test('large input remains reasonable', () => {
  const input = ('“Hello”\u00a0— *world*\r\n').repeat(10000);
  const start = performance.now(); const out = plain(input);
  assert.ok(out.length > 100000); assert.ok(performance.now() - start < 3000);
});
