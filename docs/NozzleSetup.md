# Nozzle Tip Setup

Notes on OpenPnP 2.6 nozzle-tip configuration for the LumenPnP 4.1, from the
first prototype-board run (Aug 2026). Verified against the shipped
`~/openpnp/v2.6/openpnp-gui-0.0.1-alpha-SNAPSHOT.jar` where noted.

Plan for this machine: **no automatic tip changes.** N045 stays on N1 for
chip parts, N24 stays on N2 for larger parts. Both nozzles already list all
six tips as compatible, so either can take either tip when swapped by hand.

## Nozzle-tip / part compatibility

The "nozzle tip is not compatible with this part" error has **nothing to do
with the Part Dimensions fields.** The whole test is
`AbstractNozzle.isNozzleTipAndPartCompatible`:

```java
return part.getPackage().getCompatibleNozzleTips().contains(nozzleTip);
```

An explicit allow-list, held **per package** — Packages tab → package →
Nozzle Tips sub-tab, persisted as `<compatible-nozzle-tip-ids>` in
`config/packages.xml`. Freshly imported packages get an *empty* list, and an
empty list means **no tip is compatible with anything**. That is the normal
state after importing parts from a board file, and it is what blocked the
0402s.

There is no bulk editor in the GUI, so for the 74 packages in this config the
lists were written directly into `packages.xml` (OpenPnP closed — it rewrites
its config files on exit and would clobber the edit). Rule used, on the
package's larger body dimension:

| Max body dimension | Tips assigned | Count |
| --- | --- | --- |
| 0 (fiducials) | none — never picked | 2 |
| ≤ 4 mm | N045 | 31 |
| 3–4 mm (overlap) | N045 + N24 | 14 |
| ≥ 4 mm | N24 | 27 |

The 3–4 mm overlap (1206, 1210, 0612, QFN-4×4, Cree XP-L) lets the planner use
either nozzle. Uncheck N24 there if those should always go to N045.

## Part Dimensions

These feed **vision, not job planning**:

- **Min / Max Part Diameter** and **Max Pick Tolerance** → bottom-vision
  Vision Compositing (search-window sizing, partial views for parts larger
  than the camera view) and the nozzle-tip background-calibration mask. Max
  Part Diameter is a diameter/**diagonal**, not a side length.
- **Max Part Height** → fallback safe-Z when a part's height is unknown
  (`ReferenceNozzle.getSafePartHeight`).

Current values:

| | N045 | N24 |
| --- | --- | --- |
| Min part diameter | 0.5 mm (0402 short side) | 2.0 mm |
| Max part diameter | 6.0 mm (1206, SOT-23, QFN-4×4 diagonals) | 20 mm |
| Max part height | 2.5 mm | 10 mm |
| Max pick tolerance | 0.3 mm | 1.0 mm |

Max Part Diameter should track whatever the compatibility lists actually allow
onto that tip — it sizes the bottom-vision window.

## Vacuum part detection

Current thresholds, the two-byte sensor scale, part-off detection, and how to
record a settling curve are in [Vacuum Sensing](Vacuum-Sensing.md). This
section covers how OpenPnP evaluates the check.

`ReferenceNozzle.isPartOn()`, per **Measurement Method**:

- **Absolute** — passes iff `low ≤ reading ≤ high`, inclusive.
- **Difference** — computes `reading − baseline` (baseline = the before-pick
  level) and requires **both** that the baseline falls inside the *absolute*
  PartOn range **and** that the difference falls inside the Difference Range.
  So switching to Difference means widening the absolute range to contain the
  free-flow baseline, not narrowing it around the part-on level.

On this machine the sensor value **falls** as vacuum rises (it reads more
negative), so a Difference Range is negative, and the Vacuum Range's *Low*
field holds the sealed, high-vacuum end. The stock `0.0 .. 0.0` fails
everything — set it before selecting the method.

**Establish Level** (part-on only, on N045 and N24): during the pick the
level is sampled repeatedly until it reaches the Vacuum Range **or the pick
dwell expires**, whichever comes first. Pick Dwell is therefore a timeout on
vacuum build-up, not just a settling delay — too short and a slow-sealing part
reports "no part."

### Debugging a failure

Set the Log tab to **Debug** and repeat the pick. The exact failing value is
printed:

```
Nozzle tip {} absolute vacuum level {} outside PartOn range {} .. {}
Nozzle tip {} baseline vacuum level {} outside PartOn range {} .. {}
Nozzle tip {} vacuum level difference {} outside PartOn range {} .. {}
```

The graph in Nozzle Tips → N045 → Part Detection plots the curve for the pick
— it separates a slow build-up (timing) from a plateau short of the range
(seal).

## Part Detection Failures

Local-test build only (fork branches `fix/vacuum-check-messages` →
`feature/recycle-on-pick-failure` → `feature/part-detection-dialog`, a linear
stack; see [the upstream drafts](openpnp-dev/upstream-drafts/)). Stock 2.6
re-picks `1 + pick retry count` times, discards the part, retries within Max
Placement Attempts, and pauses with a bare "No part vacuum-detected after pick."

What the build does instead:

- **The message and the log say what was measured.** Every failed check reads like
  `Nozzle tip N045 absolute vacuum level -5700.0 outside Part On range -7900.0 .. -5800.0`,
  in the error box and at WARN in the log, so `bin/vacuum-log --messages` sees it.
- **Two settings** under Machine Setup → Job Processors → ReferencePnpJobProcessor:
  - **Part detection failure**, used with Alert error handling (the normal toolbar state):
    *Prompt with dialog* (default), *Place the part*, *Recycle and retry*, *Discard and retry*,
    *Discard and pause*, *Pause*.
  - **Part detection failure (deferred)**, used with Defer error handling or without a GUI:
    the same list minus the prompt. Default *Discard and retry*, which is stock behaviour.
- **What the actions do.** *Place the part* goes on as if the check had passed. *Recycle and
  retry* puts the part back via the feeder's take-back (the strip feeder decrements its feed
  count, so the next feed presents the same pocket) and picks once more; a feeder that can't
  take the part back discards it instead. *Discard and retry* discards and retries within the
  feeder's pick retries and Max Placement Attempts. The two pause actions pause the job even
  with deferred errors, with the part discarded or left on the nozzle. The peel jog fires for
  every automatic recycle, because it goes through the same `Feeder.BeforeTakeBack` /
  `AfterTakeBack` events as the Recycle button.
- **The dialog.** A failed part-on check after pick, after alignment or before place blocks
  the job on a dialog showing the message above plus part, placement, nozzle and feeder, with
  the five actions as buttons (*Recycle and retry* only when the feeder can take the part
  back). The job carries on according to the choice; no Start press. Closing the dialog is
  *Pause*. While it is open, Pause/Stop presses queue behind it. The feeder's *Pick retry
  count* is still the number of silent re-picks before you are asked; a retry chosen in the
  dialog always gets another attempt, regardless of the counters.
- **Feeders panel test pick.** The feed-and-pick button shows the same numbers and asks
  *Keep the part* / *Recycle the part* / *Discard the part*, since the part only sits on the
  nozzle for inspection there.
- **After-place part-off failures are unchanged.** No dialog, no discard: `place()` has
  already cleared the nozzle's part. That is [#44].

## Peel Jog

Releasing a part is "cut the vacuum, wait out the place dwell, lift straight
up" — nothing shears the bond between tip and part, so a small part held by
residual vacuum, static or surface tack rides back up on the nozzle. On this
machine that showed up first when recycling 0402s: **3 of 14 recycles** left
the part on the tip across the 2026-09-11 sessions, the first with part-off
detection live (`config/log/OpenPnP.log`, `OpenPnP.0.log`).

The fix is a sideways jog, injected between the release and the lift. The
pocket wall holds the part while the tip slides off it. The jog follows the
part's long axis, or across the tape for a square part — see
[Geometry](#geometry). It applies to the OSLON Pure 1414 too, which is square
and is the part #24 is about; #45 covers it on the recycle side, and the same
idea at *place* is rung 3 of #24.

**Result (2026-09-11).** Confirmed working on `r0B` (0402, long axis) and `p04`
(OSLON Pure 1414, square, across the tape) with `LIFT_MM = 0` — the part comes
off at the jog. Across the two sessions that ran the scripts: 8 peels, 8
completed, no skips, no script failures, and **no part-off failures**, against
3 in 15 take-backs before. The lift has not been needed, and no scrubbing was
seen, so 0 stands as the default.

### Hook Points

`ReferenceNozzle.place()` is shared by board placements, discards and feeder
take-backs, and fires `Nozzle.AfterPlace` while still at place Z, before the
caller retracts. That is the only window in which motion can be injected. The
three paths are told apart by which events bracket them:

| Path | Bracketing events | Fired from |
| --- | --- | --- |
| Recycle / take-back | `Feeder.BeforeTakeBack` / `Feeder.AfterTakeBack` | the GUI Recycle button; in the local-test build also the job's automatic recycle (#33) and the failure dialog's *Recycle and retry* (#34), all through `Cycles.recycle()` |
| Discard | `Job.BeforeDiscard` / `Job.AfterDiscard` | `Cycles.discardAlways()` |
| Board placement | neither | — |

So `Feeder.BeforeTakeBack` arms a flag, `Nozzle.AfterPlace` acts only when
armed, and placements are untouched. Recycle, discard and place can each get
their own behaviour with no change to OpenPnP itself.

Discard is deliberately left alone for now: `discard-location` is at z = 30,
i.e. safe Z, so the part is dropped in free air with nothing to shear against.
A peel there only becomes possible once #27 sets a real bin-floor Z.

### The Scripts

Three files in `config/scripts/Events/`, the first event scripts on this
machine:

| File | Role |
| --- | --- |
| `Feeder.BeforeTakeBack.peel.js` | arms `nwc.peel.armed` in `config.scriptState` as `nozzle\|feederId\|millis` |
| `Nozzle.AfterPlace.peel.js` | consumes the flag, checks the gates, jogs |
| `Feeder.AfterTakeBack.peel.js` | clears the flag; in practice a diagnostic |

Tunables live at the top of `Nozzle.AfterPlace.peel.js`: `LIFT_MM` 0.00,
`BACK_MM` 0.10, `FWD_MM` 0.20, `SPEED` 0.2, `MAX_AGE_MS` 30000, `XY_TOL_MM` 0.5,
`SQUARE_TOL_MM` 0.05.

Three gates have to pass before anything moves, because a take-back that
throws before `place()` leaves the flag armed and `Feeder.AfterTakeBack` never
runs — it is not in a `finally`. The nozzle name must match, the flag must be
under 30 s old, and the nozzle must be standing within 0.5 mm of the armed
feeder's pick location. The last one is what actually protects a board: a
placement is never that close to a feeder. The flag is consumed before any
gate is evaluated, so a stale one survives at most a single place event.

**Every failure is swallowed and logged.** An exception out of
`Nozzle.AfterPlace` aborts `place()`, and `ReferenceStripFeeder.takeBackPart()`
only decrements `feedCount` *after* `putPartBack()` returns — so a throwing
script silently desyncs the feed count from the tape. The peel is an
optimisation; the part-off check that runs straight afterwards is the real
safety net. Grep the log for `[peel]`; TinyLog cannot resolve a caller class
from Nashorn, so the tag is the only handle.

### Geometry

The jog follows the part's **long** axis where it has one. The footprint's
body width lies along part-local X, so the machine-frame heading is
`(cos C, sin C)` when `bodyWidth > bodyHeight`, and C + 90° otherwise, where C
is the part's rotation in the tape.

**Take C from `feeder.getPickLocation()`, not from `nozzle.getLocation()`.**
`place()` calls `setPart(null)` before firing `Nozzle.AfterPlace`, and
`AbstractNozzle.setPart(null)` clears the nozzle's `rotationModeOffset`
(`AbstractNozzle.java:112-114`). From that moment `getLocation()` reports the
raw *head* rotation instead of the *part* rotation — on N1 the two differ by
exactly 90°, so the jog comes out across the part instead of along it. The log
names the moment:

```
17:14:00.117  N1.moveTo((..., -0.154867 mm), 1.0)                        ; pick location
17:14:00.117  N1.toHeadLocation((..., -90.154867 mm)) rotation mode offset 90.0
17:14:00.505  N1.place()
17:14:01.514  Nozzle N1: set rotation mode offset: none.                 ; setPart(null)
17:14:01.641  [peel] ... part C=-0.15 (head -90.15)
```

The *move targets* still use the current rotation from `nozzle.getLocation()`,
so the nozzle holds the angle it is physically at. Only the axis derivation
uses the pick rotation. Mixing those up would rotate the nozzle 90° while the
part is in the pocket.

A **square** part has no long axis, so the jog runs **across the tape** — the
perpendicular to the line from the feeder's reference hole to its last hole
(`getIdealLineLocations()`). A square part sits in a square pocket, so the
clearance is the same either way and the only thing left to decide on is
tape-shift risk: the strip feeders do not always hold the tape firmly, and a
jog along its length can drag the tape and lose the taught position. That is
the case for the OSLON Pure 1414 (1.6 × 1.6 mm) in 8 mm tape at 4 mm pitch.

It happens that both parts jog across the tape on this machine. The 0402's
long axis already lies across the tape — with `9LED_2_06_r0B` running along −Y
the pick rotation is C ≈ 0, so the long-axis heading is (1, 0), i.e. ±X.
Verified against the real feeder geometry: the along-tape component of both
jogs is 0.000 mm for the 0402 and for the 1414. If a jog ever comes out along
±Y on these two feeders, the rotation source is wrong again.

Two cases still skip rather than guess, because jogging along a pocket's short
dimension is the one thing that can jam the tip against a pocket wall: a part
with no footprint or no body dimensions, and a square part on a feeder that
gives no tape direction (anything that is not a strip feeder, or a strip feeder
whose two holes are coincident).

`BACK_MM` then `FWD_MM` is relative travel, so the net displacement from the
pick point is only `FWD_MM - BACK_MM`: the default −0.1 / +0.2 stays within
**±0.1 mm of pocket centre**, not 0.2. For an 0402 (1.0 × 0.5 mm body) in 8 mm
paper tape the pocket is roughly 1.15 × 0.65 mm, so there is ~0.15 mm of
clearance to the wall on either axis. The first move guarantees wall contact,
the second guarantees contact on the opposite wall with travel left over to
shear.

`LIFT_MM` defaults to **0**. Jogging along the long axis should not need a
lift at all: at place Z the part rests on the pocket floor and the end wall
takes the load, which is where the shear works best. Lifting also lifts a part
that is *still stuck*, and a 0.35 mm part in a ~0.6 mm pocket has little
headroom before its top edge clears the rim — at which point the jog drags it
out onto the carrier tape instead of shearing it off. That failure **passes**
the part-off check while losing the part. Raise it to 0.05 only if the tip is
seen scrubbing the part along the pocket floor.

### Installing a Script

`Scripting` negatively caches events that had no scripts, so dropping files
into `config/scripts/Events/` is not enough on a running instance. Use
**Machine Setup → Scripting → clear the scripting engine pool**, which clears
that cache too; a restart also works. OpenPnP rewrites its XML on exit but
never touches `scripts/`, so the files can be added while it is running.

If `Feeder.AfterTakeBack.peel.js` ever logs that the flag survived the
take-back, `Nozzle.AfterPlace.peel.js` did not run — that cache, or a
filename typo, is the usual reason.

## Session findings (Aug 2026)

> **Superseded.** These readings came from the one-byte vacuum read, which
> discarded the low eight bits of the sensor ([#22](https://github.com/NatCrutcher/lumenpnp_nwc/issues/22)).
> The numbers below are on the old 0–255 scale and are **not current settings**;
> multiply `(old − 256) × 256` to compare. See [Vacuum Sensing](Vacuum-Sensing.md).

**0402 "No part detected" on N045.** Readings: **235 free-flow, 229 with the
0402 on the tip** — only 6 counts of signal, against a PartOn range of
215–232. Vacuum was observed responding *slowly*, i.e. the level had not
finished building when the check ran.

Changes applied:

- Pick dwell **100 → 400 ms**, place dwell **100 → 300 ms** on N045. The pick
  dwell is the real fix: with Establish Level on, it is the window the level
  has to reach the range.
- PartOn High **231 → 232**, the midpoint of 229 and 235.

Note the 232 threshold leaves only 3 counts to the no-part level. That is
thin: a part lost in transit could still read inside the range and pass. If
this proves flaky, the durable fixes are, in order:

1. Improve the seal — clean or replace the tip, confirm part height (0402 =
   0.5 mm) so the nozzle actually seats, check feeder pick Z and that the tape
   pocket is not deep enough to tilt the part.
2. Switch Method Part On to **Difference** with range ≈ `−20 .. −3` and the
   absolute range widened to ≈ `200 .. 245` so it contains the ~235 baseline.
   Relative measurement rides out pump drift.

6 counts is weak even for an 0402 — worth comparing against the drop a 0603
gives on the same tip to tell "small part" from "leaking tip."

Other current N045 part-detection settings: Method Part On `Absolute`, PartOn
range `215 .. 232`, Method Part Off `None` (part-off range `248 .. 255`
recorded but unused). N24: `Absolute`, PartOn `219 .. 244`.
