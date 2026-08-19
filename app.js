import { cleanText, PRESETS } from './cleaner.js';

const $ = selector => document.querySelector(selector);
const input = $('#inputText'), output = $('#outputText'), summary = $('#summary'), live = $('#liveStatus');
const settingsKey = 'unformat-settings-v1';
const demoText = "### **Important** \u2014 \u201CDon\u2019t forget\u2026\u201D\n\n> Copy/paste can introduce\u00a0odd spaces, a soft hyphen co\u00adoperate, and mojibake: \u00e2\u20ac\u2122hello\u00e2\u20ac\u009d.\n\n- [x] Keep this task\n- [ ] Review [the docs](https://example.com/docs?source=ai_tool)\n\nUse `foo_bar() \u2014 \u201Cexact\u201D` here.\n\n```js\nconst message = \"**hello** \u2014 world\";\n```\n\nFamily emoji: \u{1F468}\u200d\u{1F469}\u200d\u{1F467}\u200d\u{1F466}\n";
let selectedPreset = 'safe';
let options = { ...PRESETS.safe };
let syncingScroll = false;
let changeDetails = [];
let hoveredChangeIndex = -1;
const changeLabels = {
  Unicode: 'Unicode normalization applied',
  encoding: 'mojibake sequence repaired',
  'unrecoverable characters': 'unrecoverable character detected',
  entities: 'HTML entity decoded',
  whitespace: 'line or invisible whitespace cleanup',
  spaces: 'unusual space normalized',
  quotes: 'smart quote converted',
  dashes: 'typographic dash converted',
  typography: 'ellipsis converted'
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey));
    if (saved && ['safe', 'plain', 'custom'].includes(saved.preset)) {
      selectedPreset = saved.preset; options = { ...PRESETS.safe, ...saved.options };
    }
  } catch { /* Settings are optional. */ }
}
function saveSettings() { try { localStorage.setItem(settingsKey, JSON.stringify({ preset: selectedPreset, options })); } catch {} }
function count(value) { return `${value.length.toLocaleString()} character${value.length === 1 ? '' : 's'}`; }
function updateCounts() { $('#inputCount').textContent = count(input.value); $('#outputCount').textContent = count(output.value); }
function syncControls() {
  document.querySelectorAll('.preset').forEach(button => {
    const active = button.dataset.preset === selectedPreset;
    button.classList.toggle('active', active); button.setAttribute('aria-checked', String(active));
  });
  document.querySelectorAll('[data-option]').forEach(box => { box.checked = Boolean(options[box.dataset.option]); });
}
function formatSummary(result) {
  const parts = Object.entries(result.changes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, n]) => `${n} ${changeLabels[name] || name}`);
  return result.total ? `${result.total} change${result.total === 1 ? '' : 's'} applied: ${parts.join(' • ')}` : 'No formatting changes applied.';
}
function renderChanges(result) {
  const panel = $('#changes');
  const list = $('#changeList');
  list.replaceChildren();
  const entries = Object.entries(result.changes).sort((a, b) => b[1] - a[1]);
  panel.hidden = entries.length === 0;
  changeDetails = result.details.slice(0, 16);
  hoveredChangeIndex = -1;
  for (const [index, detail] of changeDetails.entries()) {
    const item = document.createElement('li');
    item.className = 'change-detail';
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.changeIndex = index;
    const label = document.createElement('span');
    label.textContent = `${changeLabels[detail.category] || detail.category} · line ${detail.line}`;
    const pair = document.createElement('code');
    pair.textContent = `${displayText(detail.before)} → ${displayText(detail.after)}`;
    button.append(label, pair); item.append(button); list.append(item);
  }
  const detailedCategories = new Set(changeDetails.map(detail => detail.category));
  for (const [category, total] of entries) {
    if (detailedCategories.has(category)) continue;
    const item = document.createElement('li');
    item.className = 'change-detail change-detail-static';
    item.textContent = `${total.toLocaleString()} × ${changeLabels[category] || category}`;
    list.append(item);
  }
}
function displayText(value) {
  const names = { '\u00a0': 'NBSP', '\u00ad': 'soft hyphen', '\u200b': 'zero-width space', '\u2060': 'word joiner', '\ufeff': 'BOM', '\n': '↵', '\t': '⇥' };
  return [...value].map(character => names[character] || character).join('') || 'removed';
}
function locateChange(detail, focus = true) {
  const inputIndex = input.value.indexOf(detail.before);
  const outputIndex = output.value.indexOf(detail.after);
  if (inputIndex >= 0) input.setSelectionRange(inputIndex, inputIndex + detail.before.length);
  if (outputIndex >= 0) output.setSelectionRange(outputIndex, outputIndex + detail.after.length);
  if (focus && outputIndex >= 0) output.focus(); else if (focus && inputIndex >= 0) input.focus();
}
function clean() {
  const result = cleanText(input.value, options); output.value = result.text; updateCounts(); summary.textContent = formatSummary(result); renderChanges(result);
}
function choosePreset(name) {
  selectedPreset = name;
  if (name !== 'custom') options = { ...PRESETS[name] };
  if (name === 'custom') $('#optionsPanel').open = true;
  syncControls(); saveSettings(); clean();
}
async function copy() {
  if (!output.value) return;
  try { await navigator.clipboard.writeText(output.value); }
  catch { output.focus(); output.select(); document.execCommand('copy'); }
  const button = $('#copyButton'); button.classList.add('copied'); button.firstChild.textContent = 'Copied ';
  live.textContent = 'Cleaned text copied.';
  setTimeout(() => { button.classList.remove('copied'); button.firstChild.textContent = 'Copy '; }, 1400);
}
async function paste() {
  try { input.value = await navigator.clipboard.readText(); updateCounts(); clean(); live.textContent = 'Pasted text.'; }
  catch { input.focus(); summary.textContent = 'Paste permission was not available. Use your browser’s paste shortcut.'; }
}
loadSettings(); syncControls(); updateCounts();
$('.presets').addEventListener('click', event => { const button = event.target.closest('[data-preset]'); if (button) choosePreset(button.dataset.preset); });
document.querySelectorAll('[data-option]').forEach(box => box.addEventListener('change', () => {
  options[box.dataset.option] = box.checked; selectedPreset = 'custom'; syncControls(); saveSettings(); clean();
}));
input.addEventListener('input', () => { updateCounts(); clean(); });
function syncScroll(source, destination) {
  if (syncingScroll) return;
  syncingScroll = true;
  const sourceMaxY = Math.max(1, source.scrollHeight - source.clientHeight);
  const destinationMaxY = Math.max(0, destination.scrollHeight - destination.clientHeight);
  const sourceMaxX = Math.max(1, source.scrollWidth - source.clientWidth);
  const destinationMaxX = Math.max(0, destination.scrollWidth - destination.clientWidth);
  destination.scrollTop = (source.scrollTop / sourceMaxY) * destinationMaxY;
  destination.scrollLeft = (source.scrollLeft / sourceMaxX) * destinationMaxX;
  requestAnimationFrame(() => { syncingScroll = false; });
}
input.addEventListener('scroll', () => syncScroll(input, output));
output.addEventListener('scroll', () => syncScroll(output, input));
function preventEditorOverscroll(event) {
  const editor = event.currentTarget;
  const maxScroll = editor.scrollHeight - editor.clientHeight;
  if ((event.deltaY < 0 && editor.scrollTop <= 0) || (event.deltaY > 0 && editor.scrollTop >= maxScroll)) event.preventDefault();
}
input.addEventListener('wheel', preventEditorOverscroll, { passive: false });
output.addEventListener('wheel', preventEditorOverscroll, { passive: false });
$('#cleanButton').addEventListener('click', clean); $('#copyButton').addEventListener('click', copy); $('#pasteButton').addEventListener('click', paste);
$('#demoButton').addEventListener('click', () => { input.value = demoText; choosePreset('plain'); input.focus(); live.textContent = 'Example loaded in Plain Text mode.'; });
$('#clearButton').addEventListener('click', () => { input.value = ''; output.value = ''; updateCounts(); summary.textContent = 'Ready when you are.'; $('#changes').hidden = true; input.focus(); });
$('#changeList').addEventListener('click', event => {
  const button = event.target.closest('[data-change-index]');
  if (button) locateChange(changeDetails[Number(button.dataset.changeIndex)]);
});
$('#changeList').addEventListener('pointerover', event => {
  const button = event.target.closest('[data-change-index]');
  if (!button) return;
  const index = Number(button.dataset.changeIndex);
  if (index === hoveredChangeIndex) return;
  hoveredChangeIndex = index;
  locateChange(changeDetails[index], false);
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); clean(); }
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'c') { event.preventDefault(); copy(); }
});
