# Project Conventions

## Markdown Headings

**Keep headings to 1–4 words.** They are navigation targets, not summaries. The
Typora outline pane and any generated table of contents are only useful if a
heading can be scanned at a glance; a heading that reads as a sentence makes the
document feel structureless even where the structure is fine.

Put the qualifier in the section's first sentence, never in the heading:

| Don't | Do |
|---|---|
| `### Composite columns: one Excel cell, several SQL columns` | `### Composite columns` |
| `### Recommended: uv (isolated, reproducible, no activation ritual)` | `### Python with uv` |
| `## 10. Migration horizon — when to leave this for InvenTree` | `## InvenTree` |

**Do not number sections.** Cross-reference by Markdown link
(`[merge contract](DESIGN.md#merge-contract)`) so a heading can be renamed
without a renumbering pass, and so a reference survives content moving between
files.

Capitalize headings the way we capitalize titles in US English.
