# Capturing OpenPnP Config Changes for a Tutorial

How to organize, capture, and explain the tuning of my LumenPnP so it can become a tutorial
for other users. The tutorial itself comes later; this describes the method.

## Source of truth

The git history of `config/*.xml` in this repo **is** the tuning record — each commit is one
or more tuning steps. `docs/LumenPnP-Pick-and-Place-Notes.md` holds the narrative that the
XML can't (why, what failed, measurements).

## Going forward: commit discipline

- **One topic per config commit.** Don't mix a vision change with a motion change.
- Commit message names the GUI path and the why, e.g.:
  `Bottom vision 0402: subSampling 3→1 (Machine Setup → Vision → Bottom Vision pipeline) — small parts lost at 3px`
- When a change has before/after measurements (placement error, cycle time, detection rate),
  record them in the commit message or notes file.
- The `*.bak-*` files and `backups/` are noise — the git history is the record.

## Capture template (per change)

For each tuning step worth teaching, capture:

1. **Symptom** — what was wrong, with evidence (photo, log, failed-detection screenshot).
2. **Setting changed** — GUI path (Machine Setup → …) *and* the XML element/attribute,
   so readers can find it either way.
3. **Values** — old → new, and how the new value was derived (formula, experiment, guess).
4. **Why it works** — the mechanism, one paragraph.
5. **Result** — measurement or observation confirming the fix.
6. **Applicability** — stock hardware, or `hw-mod` (e.g. requires the telephoto bottom lens)?
   Machine-specific (my offsets) or general advice?

## The retroactive pass (deferred — do in a fresh session)

1. Walk `git log --follow -p config/machine.xml` (and parts/packages/vision-settings) from the
   initial commit forward.
2. For each diff, map XML elements back to GUI settings by reading the matching `@Attribute`/
   `@Element` annotations in `~/dev/openpnp_src` (pinned at tag 2.6 = my jar) — don't guess
   from the XML alone.
3. Cross-reference `LumenPnP-Pick-and-Place-Notes.md` and commit messages for the why; flag
   changes with no recorded rationale for me to reconstruct.
4. Classify each change with the capture template, especially machine-specific vs general and
   stock vs `hw-mod`.

## Tutorial output shape

- Ordered by topic, not chronology: machine setup/homing → calibration → motion → nozzles →
  feeders → top vision → bottom vision → job settings.
- Two tiers throughout: **stock hardware** first (helps the most users), then a separate
  **hardware mods** section (lens swap, fiducials, plate stiffening) with its own tuning deltas.
- Every recommended value marked as either *universal*, *LumenPnP-typical*, or *measure your
  own* (with the measurement procedure).
