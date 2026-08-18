import { cleanText, PRESETS } from './cleaner.js';

const $ = selector => document.querySelector(selector);
const input = $('#inputText'), output = $('#outputText'), summary = $('#summary'), live = $('#liveStatus');
const settingsKey = 'unformat-settings-v1';
let selectedPreset = 'safe';
let options = { ...PRESETS.safe };
let syncingScroll = false;
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
  for (const [name, total] of entries) {
    const item = document.createElement('li');
    item.textContent = `${total.toLocaleString()} × ${changeLabels[name] || name}`;
    list.append(item);
  }
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
$('#clearButton').addEventListener('click', () => { input.value = ''; output.value = ''; updateCounts(); summary.textContent = 'Ready when you are.'; $('#changes').hidden = true; input.focus(); });
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); clean(); }
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'c') { event.preventDefault(); copy(); }
});
