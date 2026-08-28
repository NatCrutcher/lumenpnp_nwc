# Issue Tracking Organization

How I track LumenPnP/OpenPnP bugs, tuning tasks, enhancements, and questions, and how the
ad-hoc lists in [PnP-Issues.md](PnP-Issues.md) migrate into it.

## The system

**Single tracker:** GitHub Issues on
[NatCrutcher/lumenpnp_nwc](https://github.com/NatCrutcher/lumenpnp_nwc/issues).

Everything goes here — LumenPnP hardware ideas, my machine-config tuning, OpenPnP software
bugs/enhancements, and documentation tasks — because most items span more than one of those
worlds. Items that mature into upstream contributions get *mirrored* upstream (an OpenPnP
GitHub issue or Google Group post, or feedback to Opulo), with links in both directions. The
issue here stays open as my working record; the upstream issue is the public, minimal version.

Rationale: OpenPnP's tracker is for actionable, well-formed reports against their software,
not for my brainstorming. Keeping the full list in my own repo lets me think out loud, attach
machine-specific detail, and be selective about what I propose upstream.

## Labels

Every issue gets one `scope:`, one `type:`, and usually one or more `area:` labels.
Disposition labels are added as an item matures.

| Group | Labels | Meaning |
|---|---|---|
| Scope | `scope:openpnp` | OpenPnP software (bug, enhancement, question) |
| | `scope:lumenpnp-hw` | LumenPnP hardware/mechanical (incl. printed parts, feeders) |
| | `scope:my-config` | Tuning/config of *my* machine (machine.xml, pipelines, …) |
| | `scope:docs` | Documentation to write — mine, Opulo's, or OpenPnP's |
| Type | `type:bug` | Something is wrong |
| | `type:enhancement` | New capability or improvement |
| | `type:question` | Something to understand or investigate |
| | `type:experiment` | A measurement or test to run (e.g. Z repeatability) |
| | `type:tuning` | Adjust/calibrate with existing knobs |
| Area | `area:vision`, `area:feeders`, `area:vacuum`, `area:motion`, `area:nozzles`, `area:calibration` | Subsystem |
| Disposition | `upstream:openpnp-candidate` | Worth proposing to OpenPnP (issue or PR) |
| | `upstream:opulo-candidate` | Worth reporting/suggesting to Opulo |
| | `hw-mod` | Requires non-stock hardware (e.g. lens swap) — keep separate from stock-hardware advice so recommendations stay useful to the most users |

**Milestones** (optional, use when helpful): *Stock-hardware vision*, *Bottom lens upgrade*,
*First OpenPnP PR*.

## Issue body conventions

Aim for issues that are useful months later without re-reading my head:

- **Symptom / goal** — what's wrong or what I want, one or two sentences.
- **Evidence** — log excerpt, photo, XML snippet, measured values. Attach, don't paraphrase.
- **Ideas so far** — brainstormed approaches, including rejected ones and why.
- **Acceptance** — how I'll know it's done (a measurement, a behavior, a doc published).

## Migration from PnP-Issues.md

**One issue per session — no bulk migration.** Each item deserves discussion, brainstorming,
and often research in the OpenPnP source before it's written up. The process per item:

1. Start a fresh Claude session; pick one bullet from `PnP-Issues.md`.
2. Discuss/expand: clarify the symptom, research the code or docs, sketch approaches,
   decide labels and (if any) upstream disposition.
3. Create the issue: `gh issue create --label ... --title ... --body-file ...`
4. In `PnP-Issues.md`, replace the bullet with a one-line link: `- Migrated: #NN — title`.
5. When the file is nothing but migrated links, retire it.

## Upstream flow

When an issue earns `upstream:openpnp-candidate`:

1. If it touches core/`Reference*` behavior, discuss first on the
   [OpenPnP Google Group](https://groups.google.com/group/openpnp).
2. Open the upstream issue (or go straight to a PR for small clear fixes) following
   [OpenPnP_Dev_Guidelines.md](openpnp-dev/OpenPnP_Dev_Guidelines.md).
3. Cross-link: upstream issue links here for background; my issue links the upstream URL.

For `upstream:opulo-candidate`, use Opulo's feedback channels (docs repo PRs, support,
or community forum) and cross-link the same way.

## Public repo notes

This repo is public, so anyone can file issues — GitHub offers no way to disable that on a
public repo (only temporary interaction limits). If outside issues appear:

- My own items: filter with `author:NatCrutcher` or a pinned saved search.
- Tag outside reports `external`; they may actually be useful signal from other LumenPnP users.
