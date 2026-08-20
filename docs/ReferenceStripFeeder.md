# ReferenceStripFeeder

Notes on OpenPnP 2.6 ReferenceStripFeeder behavior, from setting up the 9LED
job (Aug 2026). Verified against the OpenPnP source where noted.

## How it locates parts

The feeder is a **two-point line fit**. Everything is computed from the two
taught holes:

- **Reference Hole Location** — the sprocket hole nearest part 1.
- **Next Hole Location** (XML: `last-hole-location`) — *any* later sprocket
  hole on the strip, not necessarily the adjacent one.

The code measures the distance between the two points, rounds it to a whole
number of 4 mm sprocket pitches, and re-derives the effective pitch from the
measured span:

```java
double partPitchAdjusted = lineLocations[0].getLinearDistanceTo(lineLocations[1]);
double holeCount = Math.round(partPitchAdjusted / holePitch.getValue());
partPitchAdjusted = partPitch.getValue() / holePitch.getValue() * partPitchAdjusted / holeCount;
```

Pick N is then walked along that line at `(feedCount - 1) * partPitchAdjusted`.

Consequences:

- **Teach the second hole far down the strip.** A distant second point shrinks
  both angle error and scale error proportionally (a 0.05 mm teach error over a
  4 mm baseline is 1.25% of strip length; over 40 mm it is 10× smaller). It
  also calibrates the pitch against the machine's actual steps/mm.
- **There is no third-hole bonus.** Only the two taught points matter; spend
  the care jogging the crosshair dead-center into each hole (at correct Z)
  before capturing.

## Vision correction

With Vision Enabled, each pick predicts where the current sprocket hole should
be, drives the camera there, and finds the nearest hole, with two limits:

- search radius = half the hole pitch (**2 mm**), so it cannot lock onto the
  wrong hole;
- the found hole must be within **2 mm** of the prediction, else
  `FeederEmptyException`.

So vision corrects small per-pick errors, and a slightly-off tape angle is fine
as long as predicted-vs-actual drift stays under ~2 mm at the farthest part
(≈1.1° over 100 mm of tape). The vision result also feeds back into the line
(`getIdealLineLocations` swaps in a vision-adjusted line), so a good initial
teach means less correction on marginal tapes.

Vision does **not** find a tape that moved. If the tape shifts when peeling
cover film, re-teach the reference hole (or run Auto Setup) and reset Feed
Count to 0. Peel film *before* teaching, or peel only what a test needs and
tape the tail down.

## Auto Setup

Auto Setup finds holes by vision starting from the current camera position, so
it must start roughly centered over a sprocket hole with at least two holes in
frame — "works on one feeder, not the next" is usually start position, glare,
or film, not configuration.

To see why it fails: Log tab → set level to **Debug**, press Auto Setup, read
which filter rejected the circles (diameter out of range, not on the 4 mm
pitch line, too far from camera center).

- 0 results → camera not centered on a hole, or contrast/glare hides it.
- Circles found but rejected → hole diameter reads wrong (check the reticle
  measures ~1.5 mm across a hole; if not, recalibrate units-per-pixel), or the
  detector latched onto pockets instead of holes (easy on 2 mm-pitch 0402
  tape — center over the hole row).

## Vision pipeline

The stock 2.6 pipeline is `ImageCapture → BlurGaussian →
DetectCircularSymmetry`, with disabled `ImageWriteDebug` / `ImageRecall` /
`DrawCircles` stages that can be enabled to see the detection overlay.

`DetectCircularSymmetry` has `property-name="sprocketHole"`: the feeder injects
the expected diameter (1.5 mm) and max distance at run time, **overriding** the
min/max-diameter values visible in the stage. Editing those per feeder is
pointless; if detection fails, fix the physical contrast or the camera
calibration instead.

Debug technique: in Edit Pipeline, click each stage to see the image *at that
stage*; walk back from `DetectCircularSymmetry` to find where the holes stop
being distinguishable.

## Clear tape contrast

Sprocket holes are found because they contrast with the tape. If the raw
camera image barely shows the hole, no pipeline setting will help. Fixes, in
preference order:

1. Matte black backing under the strip feeder behind the sprocket holes
   (non-destructive; camera sees black through the hole).
2. Sharpie over the tape top surface next to the holes — darkens the
   surround so holes stay bright. Keep ink off the pockets.
3. Lighting: uniform diffuse light beats a ring light reflecting off shiny
   tape.

The `tape-type` attribute (`WhitePaper` / `BlackPlastic` / `ClearPlastic`)
is vestigial in 2.6: it is not exposed in the GUI, and in the source it is
only a persisted field — no vision or pick code reads it. It survives from
the old HoughCircles pipeline, which did branch on tape polarity. Leave it
alone; the value has no effect.

## Issues

Two Auto Setup defects found Aug 2026, both confirmed in the OpenPnP source
(`ReferenceStripFeederConfigurationWizard.java`, develop branch). Neither
blocks us: manual two-point teaching works, and per-pick vision does not use
this code path.

### "Feeder null" message

When Auto Setup fails, the error reads `Feeder null: No tape holes found.`
The throw site is in the wizard's `findHoles`:

```java
throw new Exception("Feeder " + getName() + ": No tape holes found.");
```

The wizard is a Swing `JPanel`, and `JPanel.getName()` returns null unless
explicitly set — the code means `feeder.getName()`. Cosmetic, one-line fix,
easy upstream PR. (When Auto Setup *succeeds*, other code paths print the
real name, which is why the null only shows on failure.)

### Auto Setup re-centers on the part

After clicking part 1, the wizard moves the camera to the clicked **part**
location before searching for holes:

```java
autoSetupCamera.moveTo(firstPartLocation);
MovableUtils.fireTargetedUserAction(autoSetupCamera);
part1HoleLocations = findHoles(autoSetupCamera);
```

On 8 mm tape the sprocket-hole centerline is 3.5 mm from the part centerline.
Our top camera's FOV short axis is ~7.8 mm (720 px × 0.0108 mm/px), so a view
centered on the part puts the hole row ~0.4 mm from the frame edge — whether
the second hole is fully visible depends on sub-mm feeder placement. This
matches the observed "works on one feeder, fails on the next" behavior:
in the failing feeder's Edit Pipeline view (camera parked over the hole) the
circles are found fine; it is the re-centered view during Auto Setup that
loses them.

Candidate fixes, none applied yet:

- Skip the `moveTo` and search from the current view (simplest; the clicked
  location is already known in machine coordinates, and the user has just
  framed the holes deliberately). Risk: the click point is coarse; the move
  also serves to settle/center before vision.
- Better: move to the **predicted hole row** instead of the part — offset the
  clicked part location laterally by tape-width/2 − 0.5 mm per EIA-481, so
  holes are centered in frame regardless of FOV.
- Workaround without code changes: none found; camera FOV is fixed by optics.

### Options going forward

1. **Keep manual teaching** (current plan): jog to hole 1 and a far hole,
   capture both. Auto Setup adds convenience, not capability.
2. **Patch OpenPnP locally**: Java/Maven build; keep a small patch branch and
   run it against this config. Both fixes are small and wizard-local.
3. **Upstream**: file issues / PRs for both regardless — they are
   self-contained and uncontroversial.
4. **Sidestep**: the planned feeder generator (with the strip-feeder
   registration post giving known hole offsets) writes reference + far hole
   locations directly, making Auto Setup unnecessary for our workflow.

## Session findings (Aug 2026)

State of the 26 hand-added 9LED feeders in `~/dev/lumenpnp_nwc/config/machine.xml`:

- Configuration is complete and uniform — "Feeder null" in the log is 2.6's
  message formatting, not a missing name.
- Every `last-hole-location` was taught exactly 4 mm from the reference hole;
  re-teach them at the far end of each strip (see above).
- `9LED_2_08_r1C` had hole 1 and hole 2 at different X (346.068 vs 345.988)
  while all other feeders are colinear — re-teach.
- All feeders carry `tape-type="WhitePaper"` regardless of actual tape;
  harmless — the attribute is dead code (see Clear tape contrast).
- Top camera units-per-pixel ≈ 0.0108 mm/px at Z=4.1, 3D UPP enabled.
