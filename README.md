# Unformat

Clean pasted text without changing what it says.

Try it out at [jdka1.github.io/Unformat](https://jdka1.github.io/Unformat/).

## Example

```text
### **Important** — “Don’t forget…”
```

becomes:

```text
Important - "Don't forget..."
```

## Handles

- Copy/paste whitespace and hidden-character artifacts
- Smart typography, mojibake, HTML entities, and line-ending cleanup
- Markdown headings, links, lists, tables, inline code, and fenced code blocks
- Optional keyboard-style plain text conversion

All processing runs locally in the browser. Unformat preserves wording, protected code, emoji sequences, and multilingual joiners by default.

## Tests

[![Tests](https://github.com/Jdka1/Unformat/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Jdka1/Unformat/actions/workflows/test.yml)

The test suite covers typography, Unicode spaces and joiners, Markdown cleanup, protected code regions, mojibake repair, idempotence, and large input performance.

```sh
npm test
```
