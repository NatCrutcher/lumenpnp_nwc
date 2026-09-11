# OpenPnP and LumenPnP Issues

> **Migrating to [GitHub Issues](https://github.com/NatCrutcher/lumenpnp_nwc/issues)** — see
> [Issue-Tracking.md](Issue-Tracking.md). One item per session: discuss/expand it, create the
> issue with labels, then replace the bullet here with `- Migrated: #NN — title`. No bulk migration. This file retires when every item is migrated.
>
> Prompt: I would like your help making a GitHub issue (see @docs/Issue-Tracking.md) for the following:

## Links

* https://github.com/openpnp/openpnp/pull/1914 - Photon Feeder improvements to OpenPnP

## Tasks

### Bottom Vision

- Migrated: #1 — Document bottom vision pipelines and per-package pipeline assignments
- Migrated: #2 — Retune BVS_OSRAM1414: add part-sized mask, re-enable MaskHsv
- Migrated: #3 — Pipeline hygiene: tighten BVS_L1210 mask (also covers deleting the disabled debug stages)
- Migrated: #4 — Resolve the R_0603_1608Metric_HD pipeline split (folded into the pipeline-family issue)
- Migrated: #3 — Delete the disabled ImageRead/AffineWarp debug stages in BVS_0603_C and BVS_OSRAM1414
- Migrated: #4 — Develop an improved default bottom vision pipeline (BVS_LumenPnP_Default)
- Migrated: #4 — Specialized small-rect pipeline (BVS_Small_Rect) to replace BVS_0402 and BVS_0603_C
- Migrated: #4 — Consider a larger-part rectilinear variant
- Migrated: #5 — Assign bottom vision deliberately for every package
- Migrated: #6 — Test bottom vision per package with overhead lights on
- Migrated: #8 — Compute, configure, and test a non-zero bottom-camera roaming radius (was: Camera Roaming Radius experiment; the roaming-radius gate question itself is #7)
- Migrated: #15 — Pipeline editor: pixel-sized stage properties show no unit; support mm for lens-independent masks
- Migrated: #16 — DetectRectlinearSymmetry searchAngle ±30–45° is far wider than feeder presentation needs

### General

- Answered: when to check part-on and part-off, whether to use Establish Level, and whether a check can run while moving to bottom vision — see [Vacuum Sensing](Vacuum-Sensing.md#when-to-check) and its [Establish Level](Vacuum-Sensing.md#establish-level) section (short answers: pick side yes, place side no; not during motion in stock OpenPnP, but the after-alignment check now costs one 16 ms read).
- Turns out the missing graph is an OpenPnP display quirk. Since we're using Absolute with Establish
    Level off, the part-off graph panel gets hidden even though the data is still being recorded. - This seems like a bug to me. Let's add it as an issue.
- Now that the vacuum sensing is working better, let's tune for speed.
- Migrated #17 — Regenerate packages.xml.
- Migrated: #18 — Live camera feed jumps while the machine is idle; settle timeouts hand unsettled frames to vision silently
- Migrated: #19 — Set up nozzle-tip changing with the SandwichChanger holder
- Migrated: #25 — Nozzle tip parameters: four tips fail OpenPnP's own validation and only N045 was ever tuned (answers the dwell-inconsistency question from git history)
- Migrated: #13 — Nozzle-tip background calibration: Brightness mode silently erases dim parts (the cause turned out to be `Brightness` mode discarding saturation, not the LED colour balance)
- Migrated: #27 — Configure the discard location for the new discard bin
- Migrated: #28 — N1 runout stepped +20% at the 2026-08-20 collision; isolate tip vs. shaft (N2 is unchanged, so no spare servo indicated)
- Start a blog/document on LumenPnP lessons, tuning, improvements. *First one: [Vacuum Sensing](Vacuum-Sensing.md).*
- Migrated: #21 — Y homing: the endstop trips at the mechanical collision, with no overtravel margin
- Recheck my nozzle z-heights.
- Try to develop a z-height repeatability measurement with Claude. Ideas: use vacuum touch sniffing with the primary fiducial. Rehome the z-axis and retest the height of both nozzles many times to see how repeatable this is. I worry that the microswitch may be a limiting factor in Z precision.
- Use nozzle vacuum sniffing to probe the PCB height at 3-4 locations to make sure it is flat. This may want to lift the PCB out of the holder unless I design a better holder.
- Try to order some spare N045 nozzles. Opulo seems to want to sell these in a full set: ask if I can just buy a couple of the N045 nozzles.
- Print the adapter to assemble/disassemble the vacuum nozzle shaft through the stepper.
- Update my Python code that generates the parts.xml and packages.xml to:
  - Include the compatible nozzle tips for each package
- Migrated: #14 — Bottom camera lens swap: narrower field of view, before/after retune plan (do the LED ring swap separately, after)
- Migrated: #11 — Single placement Z offset ("paste squish") parameter; nominal part heights
- Consider if we want the Python script to make the board.xml file to exclude parts with a blank NccId.
- Migrated to #18 — Check if the camera power line frequency is set correctly for 60 Hz (2 I think). *Both cameras were 50 Hz, now changed to 60 Hz.*
- Try Non-Squareness Compensation: [https://github.com/openpnp/openpnp/wiki/Linear-Transformed-Axes\#use-case--non-squareness-compensation](https://github.com/openpnp/openpnp/wiki/Linear-Transformed-Axes#use-case--non-squareness-compensation) *I cannot remember if I already did this.*
- Try second fiducial calibration: [https://github.com/openpnp/openpnp/wiki/Vision-Solutions\#calibration-secondary-fiducial](https://github.com/openpnp/openpnp/wiki/Vision-Solutions#calibration-secondary-fiducial) *I think this is complete.*
- Try bottom camera auto-focus for part height detection. *Wait for the new bottom camera lens.*

## Tuning

### 9LED PCB

- Relative to my first test, slightly lower the part placements. 
- Check the 9LED PCB height at 2-3 corners


## Bugs and Problems

- Vision: figure out a way to crop the image based on the part size, so that the bottom vision does not see past the black disc on the head to the overhead lights. A true image crop is preferred because it should speed up the processing, but even masking would be acceptable. Roughly, we'd want a crop circle diameter like `d = a*p + b` where `p` is the diameter of the smallest circle that outlines a properly centered part, `a` is a multiplier, and `b` is an additive term. So for an 0402, p = 0.559; if we set a = 1.2, b = 1.0, then d = 1.67.
- Vision: Automatically adjust subsampling/supersampling based on the expected part size in pixels. The default bottom vision pipeline uses subSampling = 3px, which may be fine for larger parts or a more telephoto lens, but is bad for an 0402 with the wide-angle LumenPnP bottom camera.
- Migrated: #26 — Vision pipeline editor: add a saved description field so pipelines explain themselves
- Feeders Tab: add an option to show a description column, since my part IDs are not descriptive. Or at least show the description for the part in the selected feeder in the bottom pane.
- OpenPnP locked up in the vision pipeline editor.
- Kubuntu popped up a screen capture dialog from vision pipeline editor when I used Alt-Tab to switch windows (I have not seen this lately).
- Migrated: #24 — OSLON Pure 1414 sticks to the N045 nozzle instead of releasing onto paste (place dwell, peel jog, N14 swap; "place lower" is #11)
- Migrated: #23 — Part-off detection is disabled on every nozzle tip, so a stuck part goes unnoticed
- Migrated: #29 — Home does not retract Z first: homing from pick depth sweeps the nozzle through the feeders (the logs show the feeder-to-feeder moves did lift; Home was the trigger)

- Migrated: #22 — Vacuum sensing reads one byte of a 16-bit sensor: 6 counts of signal on an 0402 (the read command truncates the sensor, not the pneumatics)

## Enhancements

- If I understand correctly, the vacuum pumps also have a pressurized output nozzle. Could I connect these to a positive pressure tank with one-way valves? I'd want a pressure limit valve on the pressure tank to keep the pressure low, both to avoid too much back pressure on the pumps and to avoid too much blow-off force for SMT parts. Then, tie the pressure tank to the extra port on the vacuum solenoids, so that when the solenoid switches positions, it provides a light blow-off for the part. I see some possible issues:
  - Does the 3-way solenoid vent the unused port to free air or close it off?
  - I'll probably need one pressure tank for each pump, since the positive pressure will bleed off quickly through the open nozzles.
- Migrated: #10 — Vision pipeline editor: zoom/pan or closeup view of stage results
- Migrated: #30 — Pipeline editor re-captures from the camera on every property edit; add a reuse-last-image option
- Migrated: #32 — A third of CvPipeline stages ship with no description; stage documentation is the biggest barrier to pipeline work
- Migrated: #31 — Pipeline editor shows stage timing one stage at a time; add a timing column to the stages table
- Migrated: #33 — Recycle the part to its feeder instead of discarding it after a failed part-on check
- Migrated: #34 — Vacuum failure gives an OK-only dialog with no numbers; prompt with the measured value, the limits, and a choice of actions

- Migrated: #35 — Update the LED light rings with RGBW LEDs for better colour balance

## Questions

- Migrated: #12 — ParameterNumeric tuning: editor workflow and possible sliders
- In the vision pipeline editor, for MaskCircle, where do the propertyName values come from, like 'partmask' and 'MaskCircle'. Along these lines, can we auto-mask based on the part or package dimensions? *This is substantially answered by OpenPnP-Vision-Concepts.md and issues #7 and #8.*
