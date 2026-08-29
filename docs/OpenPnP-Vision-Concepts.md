# OpenPnP Vision Concepts

General OpenPnP computer-vision concepts, mechanisms, and stage documentation — the material
the [OpenPnP wiki](https://github.com/openpnp/openpnp/wiki) is thin on. Everything here is
derived from the OpenPnP 2.6 source (`~/dev/openpnp_src`, commit `5bd404c`, matching the
installed jar); file/line references point there.

Machine-specific pipelines and per-package assignments live in
[Bottom-Vision-Pipelines.md](Bottom-Vision-Pipelines.md); this document is the general
reference behind them. Where a concrete number helps, examples use the stock LumenPnP bottom
camera (0.036173 mm/px geometric mean).

---

## §1 — How a stage property gets its value

A stage property like `DetectRectlinearSymmetry.subSampling` can be set in **three layers**,
and the layers explain the confusing pipeline-editor behavior where a field shows **grayed out
and empty** even though the XML has a value.

### Layer 1 — stage attributes (lowest priority)

The values stored on the `<cv-stage …>` element in the XML and shown as editable fields in the
pipeline editor. These are only the *fallback*: any pipeline **property** with the matching
name silently replaces them at evaluation time.

### Layer 2 — properties set by the vision operation

When a real alignment runs (and also when the pipeline editor is opened from the vision
settings wizard), `ReferenceBottomVision.preparePipeline()`
(`ReferenceBottomVision.java:464`) computes and sets a standard family of pipeline properties
before processing. Notable ones:

| Property | Derived from |
|---|---|
| `camera`, `footprint`, `footprint.rotation/offsets/maxWidth/maxHeight` | camera, package footprint, vision-compositing shot (planned capture, see §1.1) |
| `MinAreaRect.center`, `.expectedAngle`; `DetectRectlinearSymmetry.center`, `.expectedAngle` | wanted part location/rotation |
| `DetectRectlinearSymmetry.searchDistance` | nozzle tip **max pick tolerance × 1.2** |
| `MaskCircle.diameter` | the planned capture's **max mask radius** — see §1.1; on this machine, nozzle-tip-derived, not part-derived |
| `MaskHsv.hueMin/hueMax/saturationMin/valueMax` | nozzle tip **background calibration** (if calibrated) |
| `BlurGaussian.kernelSize`, `DetectRectlinearSymmetry.subSampling` | sampling size: background-calibration min detail × 0.5, else 0.1 mm; floored at 2 px (≈ 3 px on the stock camera) |
| `DetectRectlinearSymmetry.maxWidth`, `.maxHeight` | the planned capture's **expected subject size + 2 × sampling size** margin — see §1.1; on this machine, nozzle-tip-derived |
| `partmask.diameter`, `partmask.center` (advanced compositing only) | pad radius + pick tolerance |

These properties are pushed for **every** bottom-vision pipeline — `BVS_Default` and
`BVS_Stock` included; there is nothing rectilinear-specific about the mechanism. Whether a
property has any effect depends solely on whether some stage **listens** for it: a property
lands only on a stage whose `property-name` matches its prefix. `MinAreaRect.*` matters to the
contour pipelines, `DetectRectlinearSymmetry.*` to the symmetry ones, and `MaskCircle.diameter`
to *any* `MaskCircle` whose `property-name="MaskCircle"` — which includes the outer masks of
`BVS_Stock` (525 px), `BVS_Stock_R` (900 px), and `BVS_Stock_B`, making those XML diameters
dead at run time. The notable exception: **`BVS_Default`'s `MaskCircle` has
`property-name=""`**, so it listens to nothing and really does run at its fixed 250 px ≈ 9.0 mm
in every context.

### §1.1 What the auto-derived sizes actually are

A **shot** is OpenPnP's term (class `VisionCompositing.Shot`) for one planned camera
capture within a bottom-vision operation: the capture itself plus the geometry attached to it
— its X/Y offset from the part center (for large parts imaged corner by corner), its expected
subject size, and the smallest and largest mask radii that are safe to apply to it. Small
parts get a single centered shot; only advanced compositing plans several. The shot geometry
that drives `MaskCircle.diameter` and the `DetectRectlinearSymmetry` window comes from
`VisionCompositing.Composite` (`VisionCompositing.java:820–965`). Three cases:

1. **Fallback: one classic centered capture** — taken when the package has **no footprint
   pads**, the vision settings carry vision offsets, or the camera's **roaming radius is
   unset** (`VisionCompositing.java:839`; `Length.isInitialized()` is literally
   `value != 0.0`, `Length.java:347`). The expected subject size and max mask radius are the
   **nozzle tip's** `max-part-diameter` plus 2 × `max-pick-tolerance` — the part plays no
   role.
2. **Footprint fits in one view** (roaming radius set, footprint present, small part): one
   centered capture whose *min* mask radius is part-sized (footprint diagonal/2 + tolerance) but whose
   **max** mask radius is `cameraViewRadius = min(tip max-part-diameter, camera view)/2` —
   and `preparePipeline` sends `getMaxMaskRadius()`. The auto mask is the *largest safe* mask
   (never clips the part at worst-case pick offset), **not** the tightest.
3. **Advanced compositing** (roaming radius set + footprint + part larger than view):
   multiple captures aimed at individual part corners, each with genuinely geometry-limited
   mask radii; only here are the part-derived
   `partmask.diameter`/`partmask.center` properties set at all
   (`ReferenceBottomVision.java:539`, gated on `compositingSolution.isAdvanced()`).

**On a LumenPnP V4.1 with default settings the fallback case always applies**, because the bottom camera's
`roaming-radius` is 0.0 (`machine.xml:953`) — every run reports `NoCameraRoaming` and takes
case 1. The auto mask diameter is therefore set per nozzle tip:

| Tip | max-part-diameter + 2 × pick tol | Auto `MaskCircle.diameter` |
|---|---|---|
| N045 | 6.0 + 0.7 mm | **6.7 mm** (~185 px) |
| N08 | 8.0 + 1.0 mm | 9.0 mm |
| N14 | 14.0 + 2.0 mm | 16.0 mm |
| N24 | 20.0 + 2.0 mm | **22.0 mm** |
| N40 | 30.0 + 2.0 mm | 32.0 mm |

### §1.2 So why does the vision see the overhead lights?

Combining the above, the overhead-light exposure documented in
[Bottom-Vision-Pipelines.md](Bottom-Vision-Pipelines.md) has three distinct causes, not one:

1. **`BVS_Default` is immune to the auto mask** (`property-name=""`): 68 packages run a fixed
   9.0 mm mask with `Threshold(240)` — near-white glare passes, on every tip.
2. **For listening pipelines the auto mask is tip-sized, not part-sized.** On N045 the 6.7 mm
   auto mask lands well inside the black nozzle disc — those runs should be protected
   regardless of the huge XML diameters. But on **N14/N24/N40 the 16–32 mm auto mask reaches
   past the disc**, and nothing part-derived tightens it: the part-sized `partmask` hook is
   only fed by advanced compositing (case 3 above), which this machine never enters. That is
   why the manual `partmask` diameters in `BVS_0603_C`/`BVS_L1210`/`BVS_VQFN24` do real work.
3. **The standalone pipeline editor shows the raw stage attributes.** Only the editor opened
   from a vision-settings wizard runs `preparePipeline`
   (`BottomVisionSettingsConfigurationWizard.java:553`); judged from other editor contexts,
   the 19–32.6 mm XML masks are what you see, which can make the run-time behavior look worse
   than it is on N045.

Caveat: the per-tip numbers in §1.1 are derived from source + config, not yet verified on the
machine. A quick check is to enable `diagnostics` or an `ImageWriteDebug` stage and confirm
the masked diameter in a saved frame for one N045 and one N24 part (worth folding into
[issue #6](https://github.com/NatCrutcher/lumenpnp_nwc/issues/6)'s protocol). The larger
implication for [issue #4](https://github.com/NatCrutcher/lumenpnp_nwc/issues/4): setting a
real camera roaming radius is the gateway that turns on footprint-based captures and the
part-derived `partmask` — the "camera roaming radius experiment" in PnP-Issues.md and a
part-sized default mask are the same project.

Why the roaming radius gates footprint sizing *at all* for small parts that need no roaming is
questionable — a single centered capture involves no camera or nozzle roaming, yet the gate
runs before the footprint is ever consulted. Tracked as
[issue #7](https://github.com/NatCrutcher/lumenpnp_nwc/issues/7), an upstream candidate.

### Layer 3 — `pipeline-parameter-assignments` (highest priority)

Each vision-settings object (`AbstractVisionSettings.java:45`) carries an optional
`<pipeline-parameter-assignments>` map of `"Stage.property" → value` entries.
`preparePipeline()` applies it **last** (`pipeline.addProperties(...)`,
`ReferenceBottomVision.java:550`, a plain map `putAll`), so an assignment overrides both the
stage attribute *and* the operation's auto-derived value. This is where all of `BVS_0402`'s
tuning lives: `DetectRectlinearSymmetry.subSampling = 1` beats the auto ~3 px,
`maxWidth = 1.7 mm` beats the footprint-derived window.

Values typed as `Length`/`Area` (e.g. `<object class="org.openpnp.model.Length" value="1.7"
units="Millimeters"/>`) are converted to pixels at use via the camera's units-per-pixel
(`CvStage.getConvertedPipelineProperty`, `CvStage.java:515`), so they stay correct across
cameras and lenses.

### Why the editor field is grayed out AND empty

When a stage consumes an override, it records it (`recordPropertyOverride`,
`CvStage.java:507`). The stage's BeanInfo then **nulls the getter and setter** of that
property descriptor (`CvStage.java:194–210`): no getter means the property sheet cannot even
display a value — hence grayed *and blank*. The actual value is in the tooltip: hover the
field and it shows, in red, **"Controlled by pipeline caller: subSampling=1"**.

Note this happens for *any* override, not just parameter assignments — `expectedAngle`,
`searchDistance`, `maxWidth` etc. gray out too because Layer 2 sets them.

### Where can these be edited?

- **GUI sliders/controls** in the vision settings wizard exist **only for exposed parameters** —
  `ParameterNumeric`/`ParameterBool` stages inside the pipeline (`PipelineControls.java:230`
  builds controls solely from `CvAbstractParameterStage`). `pThreshold` and friends are these.
- A raw `"Stage.property"` assignment (like `DetectRectlinearSymmetry.subSampling`) has **no
  GUI anywhere**: it can only be created or edited in the XML, or made GUI-editable by adding
  a `Parameter*` stage to the pipeline whose `property-name` targets it.
- Each stage's `property-name` attribute (e.g. `"DetectRectlinearSymmetry"`, `"partmask"`) is
  the prefix the stage listens on; renaming it changes which properties reach the stage. That
  is how `MaskCircle` "4b" listens on `partmask.*` while `MaskCircle` "3" listens on
  `MaskCircle.*`.

---

## §2 — DetectRectlinearSymmetry

Source: `org/openpnp/vision/pipeline/stages/DetectRectlinearSymmetry.java`. Finds the subject
and angle with maximum rectilinear symmetry and returns a `RotatedRect` (center, size, angle).
Used by `BVS_Stock_R` and descendants (`BVS_0402`); the alternative to contact/contour
detection for parts whose contacts read poorly (LEDs, QFNs, bottom terminations).

### Algorithm

1. **Angle sweep.** For each candidate angle in `expectedAngle ± searchAngle`, the image
   region is projected into horizontal and vertical **cross-sections** (per-channel sums along
   rows/columns of the rotated grid). The angle with the largest cross-section contrast wins.
   The angle step adapts: `max(0.0001, min(searchAngle/4, subSampling/maxSpan/superSampling))`
   — a smaller search window or finer sampling buys finer angle resolution.
2. **Symmetry search.** Along each winning cross-section, the mid-point with maximal symmetry
   (per the symmetry function) locates the subject center; the cross-section bounds give
   width/height.
3. **Coarse-to-fine recursion.** The first pass runs at `subSampling`; each recursion divides
   it by 4 (8 → 2 → 1) while shrinking the search window to
   `max(64 px, found size) + subSampling × 8` and narrowing the angle range around the
   preliminary result. Recursion stops when effective subsampling reaches 1 (or the negative
   `superSampling` early-stop, below).

### Properties

Defaults below are the stage's Java defaults; stock pipelines may ship different values
(e.g. `BVS_Stock_R`: `maxWidth/maxHeight 510`, `searchAngle 30`).

| Property | Default | Meaning / tuning notes |
|---|---|---|
| `expectedAngle` | 0 | Center of the angle sweep. Auto-set from the wanted rotation (Layer 2). |
| `searchAngle` | 45 | Two-sided sweep range. Cost is linear in it; tighten if parts are presented consistently. |
| `searchDistance` | 100 | Position search range around center, px. Auto-set from nozzle pick tolerance × 1.2. |
| `maxWidth`, `maxHeight` | 100 | The search window, px (mm via Length assignment). **The** speed/robustness knob: size to part + margin. Auto-derived from footprint at run time; assignments override. |
| `subSampling` | 8 | Starting sample grid. Auto-reduced internally to `min(maxDiagonal/16, searchDistance/2)`, floored at 1. For tiny parts set 1 — but shrink the window in the same move or it is slow (this pairing is `BVS_0402`'s whole trick). Use `BlurGaussian` before the stage if subsampling causes moiré. |
| `superSampling` | 1 | Sub-pixel finish: samples binned into an N× finer cross-section — but only in the innermost pass, and clamped off for small windows; see the note below the table. Source comment: only reliable at 2. **Negative values are an early-stop**: −2 halts refinement at 2-px resolution (speed over precision). |
| `symmetricLeftRight`, `symmetricUpperLower` | true | Per-axis: is the subject symmetric (as seen at 0°)? Selects `symmetricFunction` or `asymmetricFunction` per axis. Exposed as `pSymmetricLeftRight`/`pSymmetricUpperLower` in stock pipelines. |
| `symmetricFunction` | FullSymmetry | How the cross-section is scored for symmetric axes. See functions table. |
| `asymmetricFunction` | OutlineSymmetryMasked | Ditto for asymmetric axes. |
| `minSymmetry` | 10 | Minimum relative symmetry score; > 1.0 indicates symmetry. Raise to reject weak/false detections, lower if good parts are rejected. |
| `threshold` | 128 | Luminance mask threshold, used only by `OutlineSymmetryMasked`. Exposed as `pThreshold`. |
| `minFeatureSize` | 40 | For `OutlineSymmetryMasked`: minimum masked-pixel count for a cross-section bin to register — rejects specks/impurities. Exposed as `pMinDetail`; typed mm↔px (source of the save artifact noted in Bottom-Vision-Pipelines.md). |
| `gamma` | 2.5 | Luminance raised to this power before scoring; > 1 emphasizes bright areas (shiny contacts). |
| `smoothing` | 5 | Gaussian kernel on the cross-sections; suppresses pixel-grid interference at 45° multiples. |
| `diagnostics`, `diagnosticsMap` | false | Cross-hair/bounds overlay; angular-contrast heat map. Invaluable when tuning — turn on in the editor, off for production speed. |
| `propertyName` | DetectRectlinearSymmetry | The Layer-2/3 property prefix this stage listens on. |

### The superSampling clamp: sub-pixel precision is disabled where it is needed most

Two lines of code decide the stage's final precision, and their interaction is surprising
enough to deserve its own note.

First, `superSampling` only ever takes effect in the innermost coarse-to-fine pass, and even
then it is clamped by the window size (`DetectRectlinearSymmetry.java:542`):

```java
// Super sampling seems to only work reliably with 2. Sampling vs. pixel grid interference seems to be a big problem.
final int superSamplingEff = (subSamplingEff == 1 ? Math.max(1, Math.min(maxDiagonal/100, superSampling)) : 1);
```

The integer division makes a hard cliff at a **200 px window diagonal** (≈ 7.2 mm on the stock
camera): below it, the configured `superSampling` is silently ignored — no diagnostic, no
documentation, no opt-out. `BVS_0402`'s inherited `superSampling = 2` is inert for exactly
this reason (window ≈ 52 px diagonal).

Second, the cost is real because the symmetry peak search is a plain **argmax over integer bin
positions with no interpolation** (`findCrossSectionSymmetry`,
`DetectRectlinearSymmetry.java:1086–1092`). The detected center is therefore quantized to one
cross-section bin = `subSampling/superSampling` px:

- small subjects (window < 200 px diagonal): **1 px** quantization ≈ 36 µm on the stock camera
  — a meaningful fraction of an 0402/0603 placement budget;
- large subjects (≥ 200 px): 0.5 px, where a full pixel would hardly have mattered.

Exactly backwards from the need. The charitable reading of the clamp: supersampled bins are
finer than the pixel grid, so at most sweep angles they receive systematically alternating
sample counts (aliasing/moiré). A large subject averages hundreds of pixels per bin and the
aliasing washes out; a small subject has only a handful per bin, so alias noise can rival the
signal and produce false peaks. The clamp is an empirical "enough samples per bin" guard —
but it keys off the diagonal rather than the perpendicular extent that actually sets the
per-bin count, and disabling is not the only tool available (the stage already scales its
cross-section smoothing with `superSamplingEff` to fight the same interference).

Tracked upstream as [issue #9](https://github.com/NatCrutcher/lumenpnp_nwc/issues/9)
(companion to [#7](https://github.com/NatCrutcher/lumenpnp_nwc/issues/7)). The preferred fix
proposed there: **parabolic (3-point quadratic) interpolation of the score peak**, which
yields sub-bin precision at any window size with no finer-than-pixel binning — no aliasing
exposure — and would likely make `superSampling` and its clamp unnecessary altogether.

### Symmetry functions

| Function | Looks at | Use for |
|---|---|---|
| `FullSymmetry` | inner + outline symmetry | Truly symmetric subjects; best precision |
| `EdgeSymmetry` | inner + outline symmetry of edges | Partially symmetric: features on both sides differ in shade or presence |
| `OutlineSymmetry` | outline only | Symmetric outline, asymmetric interior |
| `OutlineEdgeSymmetry` | outline edges only | As above, with differing shades/features |
| `OutlineSymmetryMasked` | thresholded outline mask only | Quite asymmetric subjects; needs `threshold` (+ `minFeatureSize`) |

### Tuning recipe for small parts (the `BVS_0402` lessons)

An 0402 on the stock LumenPnP camera is ~28 × 14 px. The stage's defaults are hostile to that:

1. **Shrink the window to the part**: `maxWidth`/`maxHeight` ≈ part body + a few × sampling
   margin (1.7 × 0.8 mm for an 0402). This is also what keeps overhead-light glare outside the
   search — the window constrains instead of a `MaskCircle`.
2. **`subSampling = 1`** — subsampling by 8 leaves ~3 × 2 samples of an 0402. Expensive, but
   step 1 pays for it; tune the two together, never separately.
3. Expect no help from `superSampling` at this scale — it is clamped off below a 200 px
   window diagonal, leaving small-part precision at 1 px; see "The superSampling clamp"
   above and [issue #9](https://github.com/NatCrutcher/lumenpnp_nwc/issues/9).
4. Retune `MaskHsv` upstream if lighting/color balance changed — the stage sees only what the
   masks pass.
5. A tighter `searchAngle` (default sweep ± 30–45°) is a free speed win once feeders present
   parts consistently.

## Related

- [Bottom-Vision-Pipelines.md](Bottom-Vision-Pipelines.md) — my pipelines, packages, and
  assignments; [issue #4](https://github.com/NatCrutcher/lumenpnp_nwc/issues/4) builds on
  these mechanisms.
- OpenPnP wiki: [Bottom Vision](https://github.com/openpnp/openpnp/wiki/Bottom-Vision),
  [CvPipeline](https://github.com/openpnp/openpnp/wiki/CvPipeline) — the pages this document
  supplements.
