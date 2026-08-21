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

`ReferenceNozzle.isPartOn()`, per **Measurement Method**:

- **Absolute** — passes iff `low ≤ reading ≤ high`, inclusive.
- **Difference** — computes `reading − baseline` (baseline = the before-pick
  level) and requires **both** that the baseline falls inside the *absolute*
  PartOn range **and** that the difference falls inside the Difference Range.
  So switching to Difference means widening the absolute range to contain the
  free-flow baseline, not narrowing it around the part-on level.

On this machine the sensor value **falls** as vacuum rises, so a Difference
Range is negative (e.g. `−20 .. −3`). The stock `0.0 .. 0.0` fails everything
— set it before selecting the method.

**Establish Level** (on for N045, part-on and part-off): during the pick the
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

## Session findings (Aug 2026)

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
recorded but unused). N24: `Absolute`, PartOn `219 .. 239`.
