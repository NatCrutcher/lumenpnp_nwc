# LumenPnP 4.1 + OpenPnP — Setup, Calibration & Validation Checklist

Machine: LumenPnP V4.1 (dual datum boards / secondary fiducial)
Software: OpenPnP 2.6 with Opulo V4.1 config files
Date started: ______________

> **Before anything else:** put `~/.openpnp2` under git.
> ```
> cd ~/.openpnp2 && git init && git add -A && git commit -m "baseline: imported Opulo V4.1 config"
> ```
> Commit after **every** calibration step, using the step name as the commit message.
> Several Issues & Solutions steps are irreversible; without this, "start over" means
> reimporting config files and redoing everything.
>
> Always `File > Save Configuration` in OpenPnP before committing — OpenPnP writes XML lazily.

---

## 0. Mechanical prep

Do this before touching the software. Most first-time accuracy problems originate here,
and no amount of vision calibration compensates for loose hardware.

- [ ] Machine sits on a flat, rigid, level surface. No bench flex or rocking.
- [ ] Frame squareness checked; gantry not racked.
- [ ] **Every** pulley grub screw checked and tight: X, Y-left, Y-right, Z1, Z2, and both nozzle rotation motors.
      *(Loose grub screws are the #1 cause of "calibration drifted after an hour.")*
- [ ] Y belt tension matched left vs. right. Pluck-test both, or measure deflection under a fixed load.
      *(Mismatch racks the gantry and produces a Y-dependent X error that calibration cannot model.)*
- [ ] X belt tensioned; no visible slack on direction reversal.
- [ ] Linear rails / bearings run smoothly end to end with power off. No binding, no gritty spots.
- [ ] Both nozzle shafts spin freely with no axial slop.
- [ ] Nozzle tips (N045, N24) seated fully and not cross-threaded.
- [ ] Nozzles physically level and parked before homing. **Check this every single time.**
      *(OpenPnP does not remember nozzle positions from the previous homing sequence.)*
- [ ] Compressor connected, pressure at spec, no audible leaks at the manifold or umbilicals.
- [ ] Both cameras physically clean (lens and any protective window).
- [ ] Datum boards (primary and secondary) installed, clean, and unobstructed.

Recorded: Y-left tension ______  Y-right tension ______  Compressor pressure ______

---

## 1. Software preflight

- [ ] OpenPnP 2.6 installed. Version confirmed under Help > About.
- [ ] Opulo **V4.1** config files imported (not V4.0, not the OpenPnP default machine).
- [ ] `git commit -m "baseline config imported"`
- [ ] Serial port selected under Machine Setup > Drivers > GcodeDriver.
- [ ] Green power button pressed; turns red = connected.
- [ ] Motherboard firmware version checked against the version the V4.1 config expects.

### Cameras
- [ ] Top camera assigned to the correct device.
- [ ] Bottom camera assigned to `LumenPnP Bottom`.
      *(If two devices show the same name, pick one; swap if the feed is wrong.)*
- [ ] Ring lights ON via Machine Controls > Actuators > LED. Leave on for all of calibration.
- [ ] **Auto-exposure DISABLED** on both cameras. Exposure set manually.
- [ ] **Auto-white-balance DISABLED** on both cameras.
- [ ] **Autofocus DISABLED** if the device exposes it.
      *(Any "auto" setting makes vision non-repeatable and will waste hours later.)*
- [ ] Top camera image is genuinely sharp at PCB working distance.
- [ ] Bottom camera image is sharp with a nozzle tip at the pick height.
- [ ] Bottom camera exposure set with a nozzle tip in frame — tip clearly distinct from background.
- [ ] `git commit -m "cameras assigned, exposure fixed, auto modes disabled"`

Recorded: Top exposure ______  Bottom exposure ______  Ring light brightness ______

### Homing prep
- [ ] Machine Setup > Heads > ReferenceHead H1 > Homing Method = **None** (temporary).
- [ ] Nozzle Tips > N045 > Calibration > Auto Recalibration = **Manual**.
- [ ] Nozzle Tips > N24 > Calibration > Auto Recalibration = **Manual**.
- [ ] Apply, then File > Save Configuration.
- [ ] Park (`P` button). Nozzles verified level.
- [ ] Home. Watch it — hand on the power switch the first time.
- [ ] `git commit -m "homing prep, first successful home"`

---

## 2. Issues & Solutions — fundamentals

Run **only** these, in this order. Opulo's config intentionally generates entries labelled
*Error* (ignore them) and *Suggestion* (do not run — unvalidated, and several introduce
conflicting calibration data).

Commit after each. Note the reported residual/error value where OpenPnP gives one.

- [ ] 1. Primary calibration fiducial position & initial camera calibration — residual: ______
- [ ] 2. Secondary calibration fiducial position & initial camera calibration — residual: ______
- [ ] 3. Nozzle N1 offsets for the primary fiducial
- [ ] 4. Nozzle N1 offsets for the secondary fiducial
- [ ] 5. Nozzle N2 offsets for the primary fiducial
- [ ] 6. Up-looking (bottom) camera position & initial calibration — residual: ______
- [ ] 7. Precise camera ↔ nozzle N1 offsets
- [ ] 8. Precise camera ↔ nozzle N2 offsets
- [ ] 9. Adaptive camera settling method (top) — settle time: ______ ms
- [ ] 10. Adaptive camera settling method (bottom) — settle time: ______ ms
- [ ] 11. Backlash compensation, X axis — value: ______ mm
- [ ] 12. Backlash compensation, Y axis — value: ______ mm

> Opulo's docs list backlash under "Optional" on one page and "Fundamental" on another.
> Run it. A belt-driven gantry has real backlash and OpenPnP's directional compensation
> is well-tested.

- [ ] Homing method switched to **fiducial homing**.
- [ ] Re-home. Confirm it locates the homing fiducial reliably 3× in a row.
- [ ] `git commit -m "I&S fundamentals complete, fiducial homing enabled"`

---

## 3. Manual calibrations (not in Issues & Solutions)

### Nozzle tip runout compensation
- [ ] N045 nozzle tip calibration run and passing.
- [ ] N24 nozzle tip calibration run and passing.
- [ ] If "not enough results from vision": switch the pipeline to the **circle symmetry**
      method and raise `maxDiameter` until circles are detected.
- [ ] `git commit -m "nozzle tip runout calibration"`

### Vacuum part detection
- [ ] Baseline reading, nozzle open to air (nothing picked): ______
- [ ] Reading with nozzle sealed against a flat surface: ______
- [ ] Reading holding a 0402: ______
- [ ] Reading holding a large part (e.g. QFN or electrolytic): ______
- [ ] Thresholds set with clear separation between picked and not-picked.
      *(If 0402 and open-air readings overlap, part detection is worthless — fix the leak first.)*
- [ ] Part-off detection (blow-off) verified.
- [ ] `git commit -m "vacuum part detection thresholds"`

---

## 4. Validation

Work upward in severity. Don't skip to a real job.

### 4.1 Opulo's controlled validation
- [ ] Board validation passed.
- [ ] Feeder validation passed.
- [ ] Job validation passed.

### 4.2 Fiducial repeatability (do this — it gives you a real number)
Run fiducial locate 10×, approaching from varied directions. Record reported positions.

| # | X (mm) | Y (mm) | Approach dir |
|---|--------|--------|--------------|
| 1 |        |        |              |
| 2 |        |        |              |
| 3 |        |        |              |
| 4 |        |        |              |
| 5 |        |        |              |
| 6 |        |        |              |
| 7 |        |        |              |
| 8 |        |        |              |
| 9 |        |        |              |
| 10|        |        |              |

- [ ] Spread is in the tens of µm, not hundreds.
- [ ] No systematic bias correlated with approach direction.
      *(Directional bias = backlash compensation is wrong. Go back and redo it.)*

σx = ______ µm   σy = ______ µm

### 4.3 Dry placement scatter
No paste, scrap board, vacuum enabled.

- [ ] Place the same 0402 twenty times at one nominal location.
- [ ] Photograph and measure offsets (microscope or scanned image with a scale reference).
- [ ] σ recorded: σx = ______ µm, σy = ______ µm, σθ = ______ °
- [ ] Compare against requirement for 0.4 mm pitch. Rule of thumb: you want 3σ well under
      ¼ of the pad pitch, so under ~100 µm for 0.4 mm pitch.

### 4.4 Dry run of a real job
- [ ] Bare board, no paste, vacuum disabled.
- [ ] Full job motion watched end to end for Z crashes, feeder misfeeds, and pick failures.
- [ ] Bottom-vision alignment checked on the *smallest* and *most awkward* parts specifically
      (0402, 0.4 mm pitch QFN/QFP). These usually need per-package pipeline tuning.

### 4.5 First live board
- [ ] Paste applied.
- [ ] Job run with a hand hovering over the stop button.
- [ ] Pre-reflow inspection under magnification before it goes in the Controleo3.
- [ ] Post-reflow inspection: tombstones, skews, shorts, opens — log which parts and which packages.

---

## 5. Z characterisation & contact probing

Motivation: high-power LEDs with thermal pads. With a 0.13 mm stencil the target
penetration is ~50–70 µm and the usable window is roughly ±50 µm. Board warp (IPC-6012
allows 0.75% bow and twist — 0.75 mm across 100 mm) and FDM fixture surfaces (±0.2–0.3 mm)
both exceed that window on their own. Contact probing removes the error instead of
reducing it — but only if the machine and the sensor are good enough. Sections 5.1 and 5.2
decide that. **Do not skip to 5.4.**

Note the head geometry: this is a shared-Z dual nozzle — one nozzle rises as the other
descends, and the axis homes at midpoint. Characterise both nozzles separately.

### 5.1 Machine Z repeatability (dial indicator)

Setup: magnetic-base DTI (0.001 mm resolution preferred) on the build plate, stylus
reading against a flat on the nozzle shaft or a gauge block held by the nozzle.

**Test A — unidirectional repeatability.** From Safe Z, command to a fixed Z, record,
retract. 20 reps.

| # | N1 (mm) | N2 (mm) | | # | N1 (mm) | N2 (mm) |
|---|---------|---------|-|---|---------|---------|
| 1 |         |         | | 11|         |         |
| 2 |         |         | | 12|         |         |
| 3 |         |         | | 13|         |         |
| 4 |         |         | | 14|         |         |
| 5 |         |         | | 15|         |         |
| 6 |         |         | | 16|         |         |
| 7 |         |         | | 17|         |         |
| 8 |         |         | | 18|         |         |
| 9 |         |         | | 19|         |         |
| 10|         |         | | 20|         |         |

σ(N1) = ______ µm   σ(N2) = ______ µm

- [ ] **Test B — Z backlash.** Approach the same Z from above and from below, 5× each.
      Mean difference = Z backlash. Value: ______ µm
- [ ] **Test C — thermal/time drift.** Repeat Test A after 30 min of continuous motion.
      Shift in mean: ______ µm
- [ ] **Test D — positional dependence.** Repeat Test A at four corners and centre of the
      work area. Catches gantry sag and Z-axis non-parallelism.
      Max spread across positions: ______ µm

**Acceptance:** σ ≤ 25 µm is good; ≤ 50 µm workable; > 100 µm means fix mechanics before
attempting probing — the probe can only be as good as the axis carrying it.

- [ ] Result recorded and mechanics adequate to proceed.

### 5.2 Vacuum touch detection characterisation

Characterise the raw signal **manually, before** enabling ContactProbeNozzle. Read the
vacuum sensor via Machine Controls > Actuators, or log the raw value through the driver.

- [ ] **Step 1 — signal shape.** Bare nozzle tip. Starting 1.0 mm above a flat hard
      surface, step down in 0.05 mm increments, recording the sensor value at each step.
      Plot value vs Z.

| Z above surface (mm) | 1.00 | 0.50 | 0.30 | 0.20 | 0.15 | 0.10 | 0.05 | 0.00 |
|----------------------|------|------|------|------|------|------|------|------|
| Sensor value         |      |      |      |      |      |      |      |      |

      Looking for a sharp, unambiguous knee. Note where it triggers and how steep it is.

- [ ] **Step 2 — probing repeatability.** From a fixed start height, detect touch 20×.
      Record detected touch Z each time. σ = ______ µm
- [ ] **Step 3 — real surfaces.** Repeat Step 2 on each: bare FR4, solder mask, bare copper
      pad, and **a pad with paste on it**. Paste is compliant, so expect a softer knee.
      This is the case that actually matters.

| Surface        | Mean touch Z | σ (µm) | Knee sharpness (sharp/soft/mushy) |
|----------------|--------------|--------|-----------------------------------|
| Bare FR4       |              |        |                                   |
| Solder mask    |              |        |                                   |
| Bare copper    |              |        |                                   |
| Pad with paste |              |        |                                   |

- [ ] **Step 4 — sandwiching.** Repeat with an LED actually held on the nozzle. This is the
      mode placement probing uses, and it is the single highest-risk unknown in this whole
      plan: the pressure signature through a held part is much softer than a bare tip on a
      hard surface, and it depends on pump, restrictor sizing, and sensor resolution.
      σ with part held: ______ µm

**Acceptance:** touch-Z σ ≤ 25 µm on paste with an unambiguous transition, including with a
part held. If the transition is mushy, or σ > 50 µm, **stop** — contact probing is not the
answer on this machine. Fall back to fixture flatness, board clamping, per-board-location Z
capture, biasing part height high, and stencil aperture design.

- [ ] Go / no-go decision recorded: ______________________

### 5.3 Sniffle parameter tuning

Only if 5.1 and 5.2 both pass.

- [ ] **Sniffle Increment** — sets your Z resolution. Start 0.05 mm. Smaller is finer and
      slower. Final: ______ mm
- [ ] **Sniffle Dwell Time** — must be long enough to clear residual under-pressure from the
      previous sniffle, or you get false early triggers. Start 200 ms, raise until
      consecutive probes agree. Final: ______ ms
- [ ] **Start Offset** — high enough for a clear "Part Off" result on the first sniffle, but
      no higher; every extra millimetre is wasted sniffle steps. Final: ______ mm
- [ ] **Probe Depth** — just past worst-case expected board Z. This is your crash guard;
      set it tight. Final: ______ mm
- [ ] **Final Adjustment** — *this is the paste penetration knob.* Positive retracts,
      negative adds spring loading. Aim for a light touch. Start +0.05 mm.
      Tuned in 5.5. Final: ______ mm
- [ ] `git commit -m "sniffle parameters tuned"`

### 5.4 ContactProbeNozzle configuration

- [ ] All fundamental calibration (sections 1–4) complete. Issues & Solutions only offers
      this at the **Advanced** milestone, and configuring it earlier is explicitly not
      recommended.
- [ ] `git commit` before starting.
- [ ] Let Issues & Solutions replace the ReferenceNozzle with a ContactProbeNozzle.
      Do **not** create one manually.
- [ ] Method = **Vacuum Sense** on the LED nozzle only.
- [ ] Other nozzle Method = **None**, so passives still run at full speed.
- [ ] **Touch Location** captured against the aluminium plate — never a printed fixture.
      This becomes the reference for all other Z coordinates on the machine.
- [ ] Touch Location Z probed **once**. Do not press the probe button again, ever —
      that destroys the machine's Z reference.
- [ ] Max Part Diameter and Max Part Height set per nozzle tip (used for vision ROI and
      dynamic Safe Z).
- [ ] Auto Z Calibration trigger chosen: **MachineHome** is the sensible default for a
      shared-Z head with manually changed tips. Selected: ______________
- [ ] Part Height Probing trigger: start **Off**, then set **Each Time** on the LED nozzle.
      *(Each Time is what gives you per-placement correction — effectively bed levelling
      across a warped board. It is also the slowest setting, which is why it belongs on one
      nozzle, not both.)*
- [ ] Auto-focus part-height learning enabled for any part with bottom vision enabled —
      required even with probing available, since bottom vision needs the height before
      placement probing happens.
- [ ] `git commit -m "ContactProbeNozzle configured"`

### 5.5 Probing validation

- [ ] **Repeatability in situ.** Probe one location on a scrap board 20×. σ = ______ µm
- [ ] **Known-tilt test.** Shim one corner of a scrap board by a known 0.30 mm. Probe a 3×3
      grid. Does the reported Z map match the known tilt within your σ?
      Max deviation from expected: ______ µm
      *(This is the test that proves the correction is real and not just noise.)*
- [ ] **Squish ladder.** Place LEDs into paste on a scrap coupon at Final Adjustment values
      of +0.10, +0.05, 0.00 and −0.05 mm. Inspect each under magnification pre-reflow.

| Final Adjustment | Tacked? | Lateral paste spread | Bridging risk |
|------------------|---------|----------------------|---------------|
| +0.10 mm         |         |                      |               |
| +0.05 mm         |         |                      |               |
| 0.00 mm          |         |                      |               |
| −0.05 mm         |         |                      |               |

- [ ] Chosen Final Adjustment: ______ mm — tacks reliably with no lateral spread.
- [ ] Coupon reflowed; checked specifically for thermal-pad-to-signal-pad bridging.
- [ ] **Cycle time cost** measured: job time with probing ______ vs without ______
- [ ] `git commit -m "probing validated, final adjustment set"`
- [ ] `git tag probing-known-good-YYYY-MM-DD`

### 5.6 Guard rails

- [ ] Understood: the **Once** trigger stores a Z offset and applies it *silently, forever*.
      Prefer Each Time or AfterHoming. To clear stored probing data, set the trigger to Off
      and home the machine.
- [ ] Understood: Z calibration does **not** affect Safe Z — Safe Z is relative to the raw
      axis coordinate system. Balance nozzles at Safe Z via the axis capture buttons instead.
- [ ] Debugging note recorded: when Z behaviour looks wrong, search the TRACE-level log for
      "applies part" and "applies feeder" to see what offsets are silently in effect.
- [ ] Fallback documented: if probing degrades or the sensor drifts, set Method = None and
      revert to fixed board-location Z. Know how to get back to a working state quickly.

---

## 6. Workflow build-out (do once, benefits every job)

- [ ] OpenPnP `Part` IDs made identical to NccId; `Package` IDs derived from the database.
      *(Makes KiCad `.pos` import a zero-touch operation, permanently. Biggest single
      recurring time sink in OpenPnP eliminated.)*
- [ ] Python generator written: SQLite → `parts.xml` / `packages.xml`. One-way sync, DB is
      source of truth. Run it before each job; commit the result.
- [ ] KiCad 10 position-file export settings standardised (mm, separate front/back files,
      consistent origin). Documented in the project template.
- [ ] Board locating fixture built on the 6061 plate: two dowel pins + edge stop, so board
      origin repeats to within fiducial capture range. Setup becomes "drop in, run fiducial check."
- [ ] Fiducial placement standardised in the KiCad template — minimum two per board,
      diagonally opposed, 1 mm copper dot with 2 mm mask opening, not near board edge.
- [ ] Permanent feeder slot allocation defined for the common E12/E24 passive spread.
      *(At 1–4 boards per batch, feeder setup dominates total time, not placement.
      Only odd parts should need per-job feeder setup.)*
- [ ] Feeder slot map documented and kept with the machine.
- [ ] Nozzle assignment convention set: N045 for 0402/0603 and small SOT/SOD, N24 for larger.
- [ ] Z-speed and feed-rate profile reduced for 0402 and fine-pitch parts.

---

## 7. Known-good state

Once validation passes:

- [ ] `git tag known-good-YYYY-MM-DD`
- [ ] Config exported and backed up to the NAS (outside the git repo too — belt and braces).
- [ ] Recovery procedure written down: which commit to return to, and what to re-run after.

---

## 8. Open questions / next improvements

- Framed stencil. Once the machine places to tens of µm, hand-spread paste is the
  accuracy bottleneck — slumping and volume variation will cause the tombstones and
  shorts, not placement. Higher leverage than further paste experimentation.
- Consider a paste inspection step (even just a photo under raking light) before placement
  on fine-pitch boards.
- Revisit machine speed settings only after accuracy is proven at conservative speeds.

---

## Recurring pre-job checklist (the short one)

- [ ] Nozzles level, parked.
- [ ] Home; fiducial homing succeeded.
- [ ] Correct nozzle tips installed for this job.
- [ ] Compressor on, pressure at spec.
- [ ] Ring lights functional.
- [ ] Feeders loaded and tape leaders advanced past the splice.
- [ ] Board seated in fixture; fiducial check passed.
- [ ] Parts and packages up to date from the database.
- [ ] If probing is in use: vacuum sensor sanity-checked, and Part Height Probing trigger
      set as intended (not left on **Once** from a previous experiment).
- [ ] Dry run if the board or part mix is new.
