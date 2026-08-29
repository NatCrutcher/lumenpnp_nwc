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
| `camera`, `footprint`, `footprint.rotation/offsets/maxWidth/maxHeight` | camera, package footprint, vision compositing shot |
| `MinAreaRect.center`, `.expectedAngle`; `DetectRectlinearSymmetry.center`, `.expectedAngle` | wanted part location/rotation |
| `DetectRectlinearSymmetry.searchDistance` | nozzle tip **max pick tolerance × 1.2** |
| `MaskCircle.diameter` | compositing shot max mask radius |
| `MaskHsv.hueMin/hueMax/saturationMin/valueMax` | nozzle tip **background calibration** (if calibrated) |
| `BlurGaussian.kernelSize`, `DetectRectlinearSymmetry.subSampling` | sampling size: background-calibration min detail × 0.5, else 0.1 mm; floored at 2 px (≈ 3 px on the stock camera) |
| `DetectRectlinearSymmetry.maxWidth`, `.maxHeight` | compositing **shot size + 2 × sampling size** margin |
| `partmask.diameter`, `partmask.center` (advanced compositing only) | pad radius + pick tolerance |

So OpenPnP already tries to size the symmetry search window to the part and pick a sane
subsampling — *when* the package footprint and nozzle-tip background calibration provide good
inputs. A stage attribute like `max-width="510"` in the XML is typically dead at run time.

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
| `superSampling` | 1 | Sub-pixel finish: samples binned into an N× finer cross-section, **only in the innermost pass** (`superSamplingEff = 1` unless subsampling has reached 1, line 542) **and** only when the window diagonal ≥ 200 px (`min(maxDiagonal/100, superSampling)` clamp — inert for small windows like `BVS_0402`'s 1.7 × 0.8 mm). Source comment: only reliable at 2. **Negative values are an early-stop**: −2 halts refinement at 2-px resolution (speed over precision). |
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
3. Expect no help from `superSampling` at this scale (clamped off below 200 px window
   diagonal); sub-pixel precision must come from `subSampling = 1` itself.
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
