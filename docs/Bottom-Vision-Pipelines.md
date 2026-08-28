# Bottom Vision Pipelines and Package Assignments

What each bottom vision pipeline in my config does, which stock pipeline it descends from and
how it differs, and which pipeline every package ends up using.

Companion to [NozzleSetup.md](NozzleSetup.md) and [ReferenceStripFeeder.md](ReferenceStripFeeder.md).
Tracked as [issue #1](https://github.com/NatCrutcher/lumenpnp_nwc/issues/1).
Fiducial vision (`FVS_*`) is out of scope.

## How a pipeline gets selected

Resolution is **part → package → machine default**, first hit wins
(`AbstractPartAlignment.getInheritedVisionSettings`):

1. `<part … bottom-vision-id="…">` in `config/parts.xml`
2. `<package … bottom-vision-id="…">` in `config/packages.xml`
3. `config/machine.xml:1011` — `<part-alignment … bottom-vision-id="BVS_Default" …>`

A part or package with no attribute inherits; it does not "have no pipeline". Today 8 of 76
packages carry an explicit assignment and the other 68 land on `BVS_Default`.

## Hardware baseline

Everything here assumes the **stock LumenPnP bottom camera** — no lens swap. The numbers that
matter:

| Property | Value | Source |
|---|---|---|
| Bottom camera units-per-pixel | 0.036245 × 0.036100 mm/px (geometric mean **0.036173**) | `machine.xml:949` |
| Camera primary Z | 5.7 mm | `machine.xml:950` |
| Stock outer mask (`MaskCircle` "4") | 525 px ≈ **19.0 mm** | `BVS_Stock` |
| Stock rectlinear mask (`MaskCircle` "3") | 900 px ≈ **32.6 mm** | `BVS_Stock_R` |
| Default-pipeline mask (`MaskCircle`) | 250 px ≈ **9.0 mm** | `BVS_Default` |

Those 9–33 mm masks are the root of the recurring problem: every one of them is far wider than any
part I place, so the pipeline sees past the black disc on the head to the overhead lights. Every
custom pipeline below is, in one way or another, a response to that.

Recommendations are tagged **[stock]** where they work on an unmodified machine and **[hw-mod]**
where they assume the telephoto lens swap. Everything currently recommended here is **[stock]** —
deliberately, so the findings stay useful to anyone running an unmodified LumenPnP. Revisit after
the lens swap, along with the camera roaming-radius experiment.

---

# §1 — Bottom vision pipelines

## Reading this section

Each custom pipeline is described as *"stock ancestor + the changes"*. Lineage was established by
comparing the ordered stage list (name + class) of each pipeline against the four stock/default
pipelines; every custom one matched a single ancestor at 0.95–1.00 while scoring ≤ 0.78 against
all others, so the ancestry is unambiguous.

**Two "differences" are not real edits.** Several pipelines show
`FilterContours.min-area = 7.642591087789861` and `DetectRectlinearSymmetry.min-feature-size =
1.3822590626354845` where stock has `0.01` and `0.05`. Those are the stock defaults converted to
**pixels** for this camera and written back on save:

- 0.01 mm² ÷ 0.036173² = 7.6426 px²
- 0.05 mm ÷ 0.036173 = 1.3823 px

The `ParameterNumeric` stages that drive them are typed `SquareMillimetersToPixels` and
`MillimetersToPixels`, so the value flips representation whenever OpenPnP saves. **Ignore these
two when reading a diff** — they carry no tuning intent, and they are why the same pipeline can
look "modified" after an open/close with no changes (cf. commit `1745a3e`, "XML file updates
after open/close OpenPnP").

## Stock and default pipelines

### `BVS_Default` — *- Default Machine Bottom Vision -* (11 stages)

The machine-wide fallback at `machine.xml:1011`; **68 of 76 packages resolve to it**.

Threshold/contour pipeline: `ImageCapture → MaskCircle(250 px ≈ 9.0 mm) → ConvertColor(gray) →
BlurGaussian → Threshold(240) → BlurGaussian → MinAreaRect`. Simpler than `BVS_Stock` — no HSV
masking, no contour filtering, no second part-sized mask, and no `ParameterNumeric` knobs.

Two things to know about it. Its mask is **250 px ≈ 9.0 mm** — tighter than `BVS_Stock`'s 19 mm,
but a fixed size that is not derived from the part. And its `Threshold` is **240**, far higher than
`BVS_Stock`'s 100: it keeps only near-white pixels, which is why it copes at all with a wide mask
but also why a bright overhead light lands squarely in its pass band.

Its `check-size-tolerance-percent` is **300** (vs 20 on the stock settings), i.e. part-size
checking is effectively wide open even if enabled.

> **Recommendation [stock]: keep, but stop relying on it.** It is doing the work for 68 packages
> by accident rather than by choice, and its 9 mm mask is fixed rather than part-sized — far too
> wide for an 0402, and combined with a 240 threshold it is the configuration most exposed to the
> overhead-light problem. The fix is not to tune this one — it is to give the
> packages that actually get placed a deliberate assignment (see §2 and the "assign bottom vision
> for all packages" task).

### `BVS_Stock` — *- Stock Bottom Vision Settings -* (20 stages)

OpenPnP's factory pipeline and the ancestor of four of my five custom pipelines. Detects the
**shiny contacts** of a part:

`ImageCapture → BlurGaussian(7) → MaskCircle(525 px ≈ 19 mm) → MaskCircle "4b"(100000 px,
effectively off) → ConvertColor(Bgr2HsvFull) → MaskHsv(hue 60–130) → ConvertColor(Hsv2BgrFull) →
ConvertColor(gray) → Threshold(100) → FindContours → FilterContours → MaskCircle "11" →
DrawContours → MinAreaRect`

Two exposed knobs: `pThreshold` (brightness that isolates the contacts) and `pDetail`
(`FilterContours.minArea`).

The key structural feature is the **second `MaskCircle` named "4b"** with `property-name="partmask"`,
shipped at diameter 100000 (disabled). That is the intended hook for a part-sized crop, and it is
exactly the knob my custom pipelines turn.

Currently assigned to package `Cree_XE-G`, plus **32 part-level overrides**.

> **Recommendation [stock]: keep as the base to specialize from.** Never edit it directly — its id
> contains `Stock`, so `AbstractVisionSettings.isStockSetting()` treats it as read-only and the
> wizard greys out. Use **Specialize** from a package to fork a copy.

### `BVS_Stock_R` — *- Rectlinear Symmetry Bottom Vision Settings -* (15 stages)

The symmetry-based alternative. Instead of finding contacts and fitting a rectangle, it finds the
part by **rectilinear symmetry** of the whole image region:

`ImageCapture → BlurGaussian(7) → MaskCircle(900 px ≈ 32.6 mm) → ConvertColor(Bgr2HsvFull) →
MaskHsv(hue 80–150, soft-edge 16) → ConvertColor(Hsv2BgrFull) → DetectRectlinearSymmetry`

`DetectRectlinearSymmetry` defaults: `max-width`/`max-height` 510 px (≈ 18.5 mm), `sub-sampling` 8,
`super-sampling` 2, `min-symmetry` 10.0, `search-angle` 30°.

Four exposed knobs: `pSymmetricLeftRight`, `pSymmetricUpperLower`, `pThreshold`, `pMinDetail`.

Better than the contact-detection approach for parts whose contacts are dull, hidden, or
underneath (LEDs, QFNs, parts with bottom terminations). Assigned to `SOT-23-6`.

> **Recommendation [stock]: prefer this as the starting point for small chip parts.** The `sub-sampling
> = 8` default is the single worst setting for an 0402 on this camera — an 0402 is only ~28 × 14 px
> to begin with, and subsampling by 8 leaves ~3 × 2 usable samples. `BVS_0402` below is the worked
> example of fixing that.

### `BVS_Stock_B` — *- Whole Part Body Bottom Vision Settings -* (16 stages)

Factory pipeline that detects the **whole part body** rather than the contacts. **Nothing
references it.**

`ImageCapture → BlurGaussian → ConvertColor(Bgr2HsvFull) → MaskHsv → MaskCircle(525 px ≈ 19 mm) →
MaskCircle "4b"(100000, off) → FindContours → FilterContours → MinAreaRect`. Same contour
machinery as `BVS_Stock`, but the body is isolated by HSV masking instead of by a brightness
threshold on the contacts, and it carries the same disabled `partmask` hook at "4b".

> **Recommendation [stock]: keep — it costs nothing and it is the right base for dark-bodied parts
> whose outline reads better than their terminations.** It is stock, so `optimizeVisionSettings()`
> will not delete it. Worth trying on the tall/opaque packages currently sitting on `BVS_Default`
> before building anything custom for them.

## Custom pipelines

### `BVS_0402` — *0402 Bottom Vision* — base: `BVS_Stock_R`

Created in `b0329ed` ("Bottom vision improvements for 0402 parts"), refined in `50e30dd`
("Improve speed for 0402 vision"). The only custom pipeline built on the **symmetry** ancestor,
and the most carefully tuned of the set.

Stage-level diff vs `BVS_Stock_R`: **none** (only the `min-feature-size` pixel-conversion artifact).
All the tuning lives in `pipeline-parameter-assignments`:

| Parameter | Stock | Mine | Why |
|---|---|---|---|
| `DetectRectlinearSymmetry.subSampling` | 8 | **1** | An 0402 is ~28 × 14 px on this camera; subsampling by 8 throws away nearly all of it |
| `DetectRectlinearSymmetry.maxWidth` | 510 px ≈ 18.5 mm | **1.7 mm** | Search window sized to the part, not the field |
| `DetectRectlinearSymmetry.maxHeight` | 510 px ≈ 18.5 mm | **0.8 mm** | ditto |
| `MaskHsv.hueMin` / `hueMax` | 80 / 150 | **100 / 165** | Retuned after the LED-ring colour balance change (`d5fcfef`) |
| `MaskHsv.saturationMin` | 64 | **40** | Admit the desaturated body of a small chip part |
| `MaskHsv.valueMax` | 225 | **255** | Stop clipping the bright terminations |

The `maxWidth`/`maxHeight` pair is what made `50e30dd` a *speed* commit: dropping `subSampling` to
1 is expensive, and shrinking the search window from 18.5 mm to 1.7 × 0.8 mm paid for it. The two
settings must be tuned together.

Assigned to `C_0402_1005Metric_HD` and `R_0402_1005Metric_HD` (20 parts).

> **Recommendation [stock]: keep — this is the model to copy.** It demonstrates the general
> principle for this camera: *size the search window to the part and stop subsampling*. Note it
> never touches `MaskCircle` (still 900 px ≈ 32.6 mm) — the symmetry search window does the
> constraining instead, which is why the overhead lights do not defeat it. Next step: measure
> whether `maxRotation`/`searchAngle` can be tightened now that feeders present parts consistently.

### `BVS_0603_C` — *C0603 Bottom Vision* — base: `BVS_Stock`

Created in `fa975a1` ("More 9LED testing and tuning"). For 1.6 × 0.8 mm capacitors.

| Change vs `BVS_Stock` | Value | Effect |
|---|---|---|
| `MaskCircle` **"4b"** (`partmask`) | 100000 → **100 px ≈ 3.6 mm** | The part-sized crop. This is the overhead-light fix |
| Stage `1` added | `ImageRead` (**disabled**) | Debug leftover — replays `config/snapshots/Bottom_2026-08-20_12.08.52.805.png` |
| Stage `2` added | `AffineWarp` (**disabled**) | Debug leftover |

> **Recommendation [stock]: keep; delete the two disabled debug stages when convenient.** Both are
> `enabled="false"`, so they do nothing at run time — but an `ImageRead` pointing at a snapshot
> file is a trap if anyone toggles it while debugging, and it hard-codes an absolute path that
> breaks on any other machine. A 3.6 mm mask on a 1.6 × 0.8 mm body is a sensible ~2× margin and matches the
> `d = a·p + b` rule of thumb in [PnP-Issues.md](PnP-Issues.md). Also: this is a *capacitor*
> pipeline, but one resistor part (`n07`) points at it — see §2.

### `BVS_L1210` — *L_1210_3225Metric* — base: `BVS_Stock`

Created in `984fec7` ("Bottom vision: tune L1210…") for the 3.2 × 2.5 mm inductor.

| Change vs `BVS_Stock` | Value | Effect |
|---|---|---|
| `MaskCircle` **"4b"** (`partmask`) | 100000 → **400 px ≈ 14.5 mm** | Part-sized crop |

The cleanest custom pipeline in the config — one deliberate change, no debug stages, no parameter
overrides.

> **Recommendation [stock]: keep, but the mask is loose.** 14.5 mm around a 3.2 × 2.5 mm body
> (diagonal ≈ 4.1 mm) is ~3.5× the part, well above the ~2× used for the 0603. Tightening toward
> **150–200 px (5.4–7.2 mm)** should improve robustness against the overhead lights at no cost.
> One part uses it, so it is a cheap experiment.

### `BVS_OSRAM1414` — *OSRAM Pure 1414 LED Vision* — base: `BVS_Stock`

Created in `d5fcfef` ("More LED9 setup and tuning. Color balance cameras and adjust exposure") for
the 1.6 × 1.6 mm OSLON Pure 1414 LED.

| Change vs `BVS_Stock` | Value | Effect |
|---|---|---|
| `MaskHsv` (stage `6`) | enabled → **disabled** | Colour masking abandoned for this part |
| `Threshold` | 100 → **99** | Marginal |
| `pThreshold` parameter assignment | — → **99** | Same value pinned as a pipeline parameter |
| Stage `1` added | `ImageRead` (**disabled**) | Debug leftover — `config/snapshots/Bottom_2026-08-19_22.10.59.879.png` |
| `MaskCircle` "4b" | **unchanged (100000, off)** | No part-sized crop |

> **Recommendation [stock]: retune — this is the weakest pipeline in the config.** Disabling
> `MaskHsv` removes the colour discrimination that separates a white LED body from the white
> overhead-light glare, and with **no part-sized mask** it is looking at the full 19 mm field.
> That combination is precisely the failure mode described in
> [PnP-Issues.md](PnP-Issues.md). Two concrete steps, in order:
> 1. Set `MaskCircle` "4b" to ≈ **120 px (4.3 mm)** for the 1.6 × 1.6 mm body and re-test.
> 2. Re-enable `MaskHsv` and retune the hue range against the current LED-ring colour balance,
>    rather than leaving it off.
>
> The disabled `ImageRead` stage should also go. Six parts use this, all on the 9LED project, so it is worth
> the effort.

### `BVS_VQFN24` — *VQFN-24 Bottom Vision* — base: `BVS_Stock`

Created in `fa975a1`. For the TI RGE0024H VQFN-24, 4 × 4 mm.

| Change vs `BVS_Stock` | Value | Effect |
|---|---|---|
| `MaskCircle` **"4b"** (`partmask`) | 100000 → **200 px ≈ 7.2 mm** | Part-sized crop |
| `MaskHsv.value-min` / `value-max` | 64 / 255 → **40 / 100** | Keeps only *dark* pixels — the black QFN body |
| `DrawRotatedRects.show-orientation` | false → **true** | Diagnostic overlay |
| Stage `1` added | `AffineWarp` (**disabled**) | Debug leftover |

The `value-max = 100` change is the interesting one: it inverts the usual strategy, selecting the
dark package body rather than the bright terminations. Sensible for a QFN, whose pads are on the
underside and barely visible.

> **Recommendation [stock]: keep. Promoted to the package in `e839f37`.** It used to be referenced
> by exactly one **part** (`k05`) and by **no package**, so any future part of
> `Texas_RGE0024H_VQFN-24-1EP_4x4_P0.5_EP2.7x2.7_ThVias` would have silently fallen through to
> `BVS_Default`. The assignment now lives on the package and the redundant part-level attribute is
> gone — the same cleanup `984fec7` did for five other packages. `k05` still resolves to
> `BVS_VQFN24`, now by inheritance. The 7.2 mm mask on a 4 × 4 mm body (diagonal 5.7 mm) is a
> reasonable ~1.3× margin.

## Removed

### `BVS_0603_R_Small` — *R_0603_1608Metric-R_Small* — deleted in `e839f37`

Recorded here so the deletion is not re-litigated. It was an **exact duplicate of `BVS_Default`** —
stage-for-stage, attribute-for-attribute, including `check-size-tolerance-percent="300"`; the
comparison found zero differences.

It arrived with Opulo's LumenPnP 4.1 config (`b1d7a78`), not from my tuning, and was named after
part id `R_0603_1608Metric-R_Small`, which exists only in `jobs/func_test_pcb/ftp.board.xml` and
never in `parts.xml`. The part was renamed away; the pipeline was left behind. Nothing referenced
it, and it was not protected — its id did not contain `Stock`, so a stray press of **Specialize**
on the Vision Settings tab with nothing selected would have run `optimizeVisionSettings()` and
deleted it silently anyway.

**Lesson for the future:** a pipeline named after a part id is only as durable as that part id.
Name pipelines after the *package* or the part *geometry*, which is what the current ids do.

## Summary

| Pipeline | Base | Real change | Assigned to | Verdict |
|---|---|---|---|---|
| `BVS_Default` | — | — | 68 packages (inherited) | keep; assign packages deliberately |
| `BVS_Stock` | — | — | `Cree_XE-G` + 32 parts | keep as fork base |
| `BVS_Stock_R` | — | — | `SOT-23-6` | keep; best base for small chips |
| `BVS_Stock_B` | — | — | nothing | keep; untried, worth trying |
| `BVS_0402` | `BVS_Stock_R` | subSampling 8→1, search window → 1.7 × 0.8 mm, HSV retune | 2 packages, 20 parts | **keep — the model** |
| `BVS_0603_C` | `BVS_Stock` | partmask → 100 px (3.6 mm) | 1 package + part `n07` | keep; drop disabled debug stages |
| `BVS_L1210` | `BVS_Stock` | partmask → 400 px (14.5 mm) | 1 package, 1 part | keep; tighten mask to 150–200 px |
| `BVS_OSRAM1414` | `BVS_Stock` | MaskHsv **off**, threshold 99, no mask | 1 package, 6 parts | **retune — add mask, re-enable HSV** |
| `BVS_VQFN24` | `BVS_Stock` | partmask → 200 px (7.2 mm), HSV value 40–100 (dark body) | `Texas_RGE0024H_VQFN-24…` package | keep — promoted `e839f37` |

---

# §2 — Packages and their pipelines

All 76 packages, grouped by how they get their pipeline. "Parts" is the number of parts in
`parts.xml` assigned to that package.

The **Notes / test** column is deliberately empty. It gets filled by the separate testing task
("test the bottom vision for 1–3 representative parts from each package type in use, with the
bright overhead lights on"). Record the date, the part tested, and pass/fail per attempt — an
untested pipeline and a passing one should never look alike in this table.

## A. Explicit package assignment (8)

| Package | Pipeline | Body (mm) | Nozzle tips | Parts | Notes / test |
|---|---|---|---|---|---|
| `C_0402_1005Metric_HD` | `BVS_0402` | 1.0×0.5 | N045 | 4 | |
| `C_0603_1608Metric_HD` | `BVS_0603_C` | 1.6×0.8 | N045 | 11 | |
| `Cree_XE-G` | `BVS_Stock` | 1.6×2.05 | N045 | 7 | |
| `L_1210_3225Metric` | `BVS_L1210` | 3.2×2.5 | N24, N045 | 1 | |
| `OSRAM-OSLON-Pure-1414` | `BVS_OSRAM1414` | 1.6×1.6 | N045 | 6 | |
| `R_0402_1005Metric_HD` | `BVS_0402` | 1.0×0.5 | N045 | 16 | |
| `SOT-23-6` | `BVS_Stock_R` | 1.6×2.9 | N045 | 4 | |
| `Texas_RGE0024H_VQFN-24-1EP_4x4_P0.5_EP2.7x2.7_ThVias` | `BVS_VQFN24` | 4.0×4.0 | N24 | 1 | |

## B. Inherits `BVS_Default`, but has part-level overrides (5)

These are the inconsistent ones: the package says nothing, so some parts get a
specialised pipeline and their siblings quietly get the machine default. Commit
`984fec7` migrated five packages from part-level to package-level assignment and
`e839f37` did the VQFN-24; these are what is left.

| Package | Effective pipeline | Part-level overrides | Body (mm) | Nozzle tips | Parts | Notes / test |
|---|---|---|---|---|---|---|
| `C_0805_2012Metric` | `BVS_Default` | `BVS_Stock` ×2 | 2.0×1.25 | N045 | 5 | |
| `D_SOD-123F` | `BVS_Default` | `BVS_Stock` ×1 | 2.8×1.8 | N045 | 1 | |
| `R_0603_1608Metric_HD` | `BVS_Default` | `BVS_0603_C` ×1, `BVS_Stock` ×25 | 1.6×0.8 | N045 | 34 | |
| `R_0805_2012Metric_HD` | `BVS_Default` | `BVS_Stock` ×3 | 2.0×1.2 | N045 | 5 | |
| `R_Array_Convex_4x0612_2` | `BVS_Default` | `BVS_Stock` ×1 | 1.6×3.2 | N045, N24 | 1 | |

## C. Plain `BVS_Default` inheritance (63)

No assignment anywhere — package or part. These reach `BVS_Default` by omission rather than by
decision, which means a fixed 9 mm mask and a 240 threshold regardless of part size. This is the
worklist for the "assign bottom vision for all packages" task; the ones that appear in a real job
should be triaged first.

| Package | Body (mm) | Nozzle tips | Parts | Notes / test |
|---|---|---|---|---|
| `Abracon_ASPI-4030S` | 4.0×4.0 | N045, N24 | 1 | |
| `AMS_TSL25911FN_2` | 2.0×2.4 | N045 | 1 | |
| `BatteryHolder_Keystone_1060_1x2032` | 28.4×16.0 | N24 | 1 | |
| `Bourns_RES_C01R00` | 3.6068×3.6068 | N045, N24 | 2 | |
| `C_1206_3216M` | 3.2×1.6 | N045, N24 | 3 | |
| `C_1210_3225M` | 3.2×2.5 | N045, N24 | 4 | |
| `C_Elec_5x5.8` | 5.3×5.3 | N24 | 1 | |
| `CP_Elec_6.3x5.8` | 6.6×6.6 | N24 | 1 | |
| `Cree_XP-L` | 3.6×3.6 | N045, N24 | 1 | |
| `D_SOD-323F` | 1.8×1.4 | N045 | 1 | |
| `FIDUCIAL-1X2` | 0.0×0.0 | — | 2 | |
| `Fiducial_0402_Pad` | 0.6×0.6 | — | 1 | |
| `Fiducial_1mm_Mask2mm` | 2.0×2.0 | — | 1 | |
| `Fiducial_1mm_Mask3mm` | 0.0×0.0 | — | 1 | |
| `FIL_CM3421Y600R-10` | 9.54×5.65 | N24 | 1 | |
| `HTSSOP-20-1EP_4.4x6.5mm_P0.65mm_EP3.4x6.5mm_Mask2.75x3.43mm_ThermalVias` | 4.4×6.5 | N24 | 1 | |
| `ICS-40730` | 4.85×3.8 | N24 | 1 | |
| `IND_DR1040` | 11.0×12.8 | N24 | 1 | |
| `JST_SH_BM03B-SRSS-TB_1x03-1MP_P1.00mm_Vert` | 5.0×2.9 | N24 | 1 | |
| `JST_SH_BM04B-SRSS-TB_1x04-1MP_P1.00mm_Vert` | 6.0×2.9 | N24 | 1 | |
| `JST_SH_BM05B-SRSS-TB_1x05-1MP_P1.00mm_Vert` | 7.0×2.9 | N24 | 1 | |
| `JST_SH_BM06B-SRSS-TB_1x06-1MP_P1.00mm_Vert` | 8.0×2.9 | N24 | 1 | |
| `JST_SH_BM08B-SRSS-TB_1x08-1MP_P1.00mm_Vert` | 10.0×2.9 | N24 | 1 | |
| `JST_SH_SM03B-SRSS-TB_1x03-1MP_P1.00mm_Horiz` | 5.0×4.25 | N24 | 1 | |
| `JST_SH_SM04B-SRSS-TB_1x04-1MP_P1.00mm_Horiz` | 6.0×4.25 | N24 | 1 | |
| `JST_SH_SM06B-SRSS-TB_1x06-1MP_P1.00mm_Horiz` | 8.0×4.25 | N24 | 1 | |
| `L_1008_2520Metric` | 2.5×2.0 | N045 | 2 | |
| `LED_0603_1608Metric_Wurth` | 1.6×0.8 | N045 | 1 | |
| `Luxeon_C_LED_AK` | 2.0×2.0 | N045 | 14 | |
| `Luxeon_CZ_LED_AK` | 2.0×2.0 | N045 | 3 | |
| `Luxeon_RGBW_5052` | 5.2×5.4 | N24 | 1 | |
| `Nexperia_CFP3_SOD-123W` | 2.6×1.7 | N045 | 1 | |
| `Oscillator_SMD_ECS_2520MV-4Pin_2.5x2.0` | 2.0×2.5 | N045 | 1 | |
| `PowerPAK_SO-8_A` | 5.89×4.9 | N24 | 2 | |
| `Pulse_Ind_BMRF_12x10` | 10.0×11.5 | N24 | 1 | |
| `PulseElec-1210CCMC` | 3.2×2.5 | N045, N24 | 1 | |
| `QFN-28_4x4_P0.5` | 4.0×4.0 | N045, N24 | 1 | |
| `QFN-32-1EP_5x5mm_P0.5mm_EP3.45x3.45mm` | 5.0×5.0 | N24 | 1 | |
| `R_0603_1608Metric` | 1.6×0.825 | N045 | 1 | |
| `R_0612_1632Metric_Ohmite` | 1.6×3.2 | N045, N24 | 1 | |
| `R_0805_2012Metric_Pad1.20x1.40mm_HandSolder` | 2.0×1.25 | N045 | 1 | |
| `SOD-123_BIDIR` | 2.8×1.8 | N045 | 1 | |
| `SOIC-8_3.9x4.9mm_P1.27mm` | 3.9×4.9 | N24 | 3 | |
| `SOT-23-5` | 1.6×2.9 | N045 | 2 | |
| `SOT-23_A` | 1.3×2.9 | N045 | 2 | |
| `SOT-583-8_A` | 1.2×2.1 | N045 | 1 | |
| `TestPoint_Keystone_5015_Micro` | 2.7×1.0 | N045 | 1 | |
| `Texas_DSG0008A_WSON-8-1EP_2x2mm_P0.5mm_EP0.9x1.6mm_ThermalVias` | 2.0×2.0 | N045 | 1 | |
| `Texas_VQFN-24_4x4mm_P0.5mm_TPS25983` | 4.0×4.0 | N045, N24 | 1 | |
| `TI_SIL0010D-MFG_TPSM828214SILR` | 2.1×2.6 | N045 | 1 | |
| `TI_TPSM33615FRDNR` | 3.62×4.82 | N24 | 2 | |
| `TI_VQFN21_RYQ_1` | 5.1054×3.0988 | N24 | 1 | |
| `TI_WQFN-20_3x3_0.5mm` | 3.6×3.6 | N045, N24 | 1 | |
| `TO-269AA_2` | 4.1×4.8 | N24 | 1 | |
| `TSSOP-14_4.4x5mm_P0.65mm` | 4.4×5.0 | N24 | 1 | |
| `TSSOP-16_4.4x5mm_P0.65mm` | 4.4×5.0 | N24 | 1 | |
| `TSSOP-28_4.4x9.7mm_P0.65mm` | 4.4×9.7 | N24 | 1 | |
| `UQFN-16_1.8x2.6_P0.4` | 1.8×2.6 | N045 | 1 | |
| `VSON-8-1EP_3x3_P0.65_EP1.6x2.4` | 3.0×3.0 | N045, N24 | 1 | |
| `VSSOP-8_2.3x2_P0.5` | 2.3×2.0 | N045 | 2 | |
| `VSSOP-8_3x3_P0.65` | 3.0×3.0 | N045, N24 | 1 | |
| `WSON-12-1EP_3x3_P0.5_EP1.5x2.5` | 3.0×3.0 | N045, N24 | 1 | |
| `XCVR_WIZFI360-PA2` | 17.7×24.0 | N24 | 1 | |

---

## Maintaining this document

§2's tables are generated from the config; §1 is hand-written. To regenerate the tables after
adding packages or changing assignments, re-run the extraction over `config/packages.xml` and
`config/parts.xml` (group by presence of `bottom-vision-id` on the package, then on its parts)
and paste the rows back, preserving the **Notes / test** column. The longer-term plan is to emit
these tables from the Python generator that already produces `parts.xml` and `packages.xml`.

To re-derive §1's lineage claims:

- **Ancestry** — compare the ordered `(stage name, stage class)` list of each pipeline against
  `BVS_Stock`, `BVS_Stock_R`, `BVS_Stock_B`, and `BVS_Default`; the real ancestor scores ≥ 0.95
  and the runners-up ≤ 0.78.
- **Changes** — diff per-stage attributes plus the `<pipeline-parameter-assignments>` map, which
  holds tuning that never appears in the stage attributes (all of `BVS_0402`'s work lives there).
- **Remember the pixel artifact** — `FilterContours.min-area` and
  `DetectRectlinearSymmetry.min-feature-size` flip between mm and px on save and are not edits.

## Related

- [Issue #1](https://github.com/NatCrutcher/lumenpnp_nwc/issues/1) — this document, plus the
  readable-id rename and the rules for renaming pipeline ids by hand.
- [PnP-Issues.md](PnP-Issues.md) — open tasks: assign bottom vision for all packages; test 1–3
  parts per package; part-size-based crop; automatic subsampling; a description field for
  pipelines in the editor (upstream candidate).
- [Issue-Tracking.md](Issue-Tracking.md) — how these items are tracked.
