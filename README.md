# Unformat

[![Tests](https://github.com/Jdka1/Unformat/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Jdka1/Unformat/actions/workflows/test.yml)

Browser-based cleanup for pasted text. Try it out at [jdka1.github.io/Unformat](https://jdka1.github.io/Unformat/).

Unformat processes text locally and does not rewrite its content. It removes copy/paste artifacts while preserving protected code and meaningful Unicode by default.

It is a formatting normalizer—not a content linter. For text copied from AI tools, it can remove common presentation artifacts such as Markdown markers, smart quotes, em dashes, ellipses, non-breaking spaces, hidden characters, and mojibake. Those characters are legitimate typography; conversion is optional and never changes the wording.

## Capabilities

- Unicode, whitespace, line-ending, HTML-entity, and mojibake cleanup
- Markdown presentation cleanup, including links, lists, tables, and code regions
- Optional plain-text conversion for typographic quotes, dashes, ellipses, and English spacing
