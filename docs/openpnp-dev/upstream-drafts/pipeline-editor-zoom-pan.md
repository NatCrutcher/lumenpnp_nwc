# Pipeline Editor Zoom/Pan

Draft upstream text for the `feature/pipeline-editor-zoom-pan` branch in my OpenPnP fork.
Nothing here has been posted — held until I'm ready to engage upstream. Tracking:
[lumenpnp_nwc#10](https://github.com/NatCrutcher/lumenpnp_nwc/issues/10).

## Comment for openpnp#569

To be posted on [CvPipelineEditor improvements](https://github.com/openpnp/openpnp/issues/569)
when announcing the work:

> One more pain point in the pipeline editor: the stage result image is always rendered
> fit-to-window. When tuning bottom vision for small parts (0201/0402 with a wide-angle
> camera), the region of interest is a handful of pixels, so mask fit and detection
> quality can't be judged visually at all.
>
> I've implemented mouse-wheel zoom (to the cursor, same 1x–64x range and step as
> CameraView) plus left-drag panning directly in `MatView`, with double-click to reset to
> fit. The view sticks while stepping through stages, so you can hold the part region and
> watch each stage's effect on it. As part of this, the fit-to-window math that was
> duplicated between `MatView.paintComponent()` and `MatView.scalePoint()` is consolidated
> into a small pure-math class with JUnit coverage, so the mouse-coordinate/pixel readout
> in the status bar stays correct under zoom.
>
> Happy to open a PR against `test` if there's interest.

## PR Template

### Description

Adds mouse-wheel zoom and left-button drag panning to the pipeline editor's stage result
view (`MatView`). Zoom is to the cursor, clamped 1x–64x with the same geometric step as
`CameraView`'s Medium sensitivity. Double-click resets to the fit-to-window view. The
zoom/pan persists while stepping through stages and across pipeline re-runs, and resets
when the result image size changes. When zoomed past 1:1, rendering switches to
nearest-neighbor so individual pixels show as crisp squares.

### Justification

When tuning pipelines for small parts (e.g. 0201/0402 with a wide-angle bottom camera),
the fit-to-window result renders the part a few pixels tall; mask fit and detection
quality cannot be verified visually. Related to the editor-usability discussion in #569.

### Instructions for Use

In the pipeline editor's result view:

- **Scroll wheel** zooms in and out at the mouse cursor (1x–64x, the same steps and
  limits as the main camera view).
- **Left-drag** pans the zoomed view. The view cannot be dragged outside the image.
- **Double-click** resets to the fit-to-window view.

The zoom and pan stick while stepping through pipeline stages, so a small part region can
be held in close-up while comparing each stage's output. The pixel color / coordinate
readout below the image remains correct while zoomed.

### Implementation Details

- The fit-to-window math previously duplicated between `MatView.paintComponent()` and
  `MatView.scalePoint()` is consolidated into a new pure-math class `MatViewTransform`
  (a single `AffineTransform` plus its inverse), which also carries the zoom/pan state
  with clamping. Covered by `MatViewTransformTest` (fit parity with the legacy math,
  screen↔image round-trips, zoom/pan clamping, zoom-anchor invariance, reset).
- No API changes: `scalePoint()` keeps its signature, so `ResultsPanel` and
  `ReferenceCameraCalibrationWizard` are unmodified and their status readouts stay
  correct.
- Zoom step and limits reuse `CameraView`'s constants (Medium sensitivity, 1x–64x); no
  new preferences.
- `paintComponent` now fills the background before drawing (the component previously
  relied on never painting outside the fitted image, which no longer holds when panning)
  and selects nearest-neighbor vs bilinear interpolation based on whether image pixels
  are magnified past 1:1.

## CHANGES.md Entry

Already on the branch (append the `[PR NNNN]` link when a PR exists):

```
* Pipeline editor: the stage result view now supports mouse-wheel zoom (to the cursor) and drag panning; double-click to reset to the fit-to-window view.
```

## To Run and Test

To try it (Maven 3.9.16 is now at ~/opt/maven/bin/mvn; the jar is already built):

```
  cp -r ~/dev/lumenpnp_nwc/config /tmp/openpnp-test-config
  cd ~/dev/openpnp_src/target
  java --add-opens=java.base/java.lang=ALL-UNNAMED \
       --add-opens=java.desktop/java.awt=ALL-UNNAMED \
       --add-opens=java.desktop/java.awt.color=ALL-UNNAMED \
       -DconfigDir=/tmp/openpnp-test-config \
       -jar openpnp-gui-0.0.1-alpha-SNAPSHOT.jar
```

The `--add-opens` flags are required on JDK 9+ (Main monkey-patches BeansBinding via
javassist); they are the same ones the installed `~/openpnp/v2.6/OpenPnP` launcher and
the pom's surefire argLine use. Without them startup fails with
`InaccessibleObjectException ... does not "opens java.lang"`.
The editor works offline on captured images, so no machine connection is needed to evaluate the zoom. Afterward, `diff -r ~/dev/lumenpnp_nwc/config /tmp/openpnp-test-config` shows anything the 2.7-snapshot build rewrote (expected: nothing schema-related — the 22 upstream commits touch no config serialization).