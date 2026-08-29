# OpenPnP and LumenPnP Issues

> **Migrating to [GitHub Issues](https://github.com/NatCrutcher/lumenpnp_nwc/issues)** — see
> [Issue-Tracking.md](Issue-Tracking.md). One item per session: discuss/expand it, create the
> issue with labels, then replace the bullet here with `- Migrated: #NN — title`. No bulk migration. This file retires when every item is migrated.
>
> Prompt: I would like your help making a GitHub issue (see @docs/Issue-Tracking.md) for the following:

## Links

* https://github.com/openpnp/openpnp/pull/1914 - Photon Feeder improvements to OpenPnP

## Tasks

### Bottom Vision

- Migrated: #2 — Retune BVS_OSRAM1414: add part-sized mask, re-enable MaskHsv
- Migrated: #3 — Pipeline hygiene: tighten BVS_L1210 mask (also covers deleting the disabled debug stages)
- Migrated: #4 — Resolve the R_0603_1608Metric_HD pipeline split (folded into the pipeline-family issue)
- Migrated: #3 — Delete the disabled ImageRead/AffineWarp debug stages in BVS_0603_C and BVS_OSRAM1414
- Migrated: #4 — Develop an improved default bottom vision pipeline (BVS_LumenPnP_Default)
- Migrated: #4 — Specialized small-rect pipeline (BVS_Small_Rect) to replace BVS_0402 and BVS_0603_C
- Migrated: #4 — Consider a larger-part rectilinear variant
- Migrated: #5 — Assign bottom vision deliberately for every package
- Migrated: #6 — Test bottom vision per package with overhead lights on

### General

- Help tune nozzle parameters for more efficient vision and reasonable part allowances.
- Add a discard bin so it stops dropping parts off the front of the machine. I think the best option is a shallow tray mounted just to the left of my secondary fiducial using one plate screw. Enhancement: make it a two-part magnetic design for easier removal and emptying. Configure OpenPnP to use it and make sure the nozzle won't crash into the second fiducial support, which is near the discard bin.
- Check if the N045 nozzle or the servo head one are bent from the collision. When calibrating the N045, it seems more eccentric, while the N24 on head two has no visible runout. I may want to order a spare nozzle servo with associated parts.
- Start a blog/document on LumenPnP lessons, tuning, improvements.
- Fix the LumenPnP y-axis homing. The stop is positioned so that the switch is triggered at almost exactly the same time the axis mechanically collides. Adjust the gold screw out to prevent the collision but check how much I'll need to recalibrate afterwards.
- Recheck my nozzle z-heights.
- Try to develop a z-height repeatability measurement with Claude. Ideas: use vacuum touch sniffing with the primary fiducial. Rehome the z-axis and retest the height of both nozzles many times to see how repeatable this is. I worry that the microswitch may be a limiting factor in Z precision.
- Use nozzle vacuum sniffing to probe the PCB height at 3-4 locations to make sure it is flat. This may want to lift the PCB out of the holder unless I design a better holder.
- Try to order some spare N045 nozzles. Opulo seems to want to sell these in a full set: ask if I can just buy a couple of the N045 nozzles.
- Print the adapter to assemble/disassemble the vacuum nozzle shaft through the stepper.
- Update my Python code that generates the parts.xml and packages.xml to:
  - Include the compatible nozzle tips for each package
- Install more telephoto bottom camera lens. I'm conflicted on when to do this. It would help with some of the vision issues, but it also means my system would be non-standard, so my tuning and recommendations would drift from what most people could do. I think I want to separate my improvements into those requiring little or no hardware mods, and those requiring more extensive mods.
- Migrated: #1 — Document bottom vision pipelines and per-package pipeline assignments
- Figure out a parameter or process to track the target part placement Z height relative to the PCB. It's hard to adjust if I don't have a number I can refer to and compare from run to run. For critical parts, like fine-pitch ICs and LEDs, measure some to confirm the exact thickness, since some datasheets only provide the maximum height.
- Consider if we want the Python script to make the board.xml file to exclude parts with a blank NccId.
- Check if the camera power line frequency is set correctly for 60 Hz (2 I think).
- Try Non-Squareness Compensation: [https://github.com/openpnp/openpnp/wiki/Linear-Transformed-Axes\#use-case--non-squareness-compensation](https://github.com/openpnp/openpnp/wiki/Linear-Transformed-Axes#use-case--non-squareness-compensation) *I cannot remember if I already did this.*
- Try second fiducial calibration: [https://github.com/openpnp/openpnp/wiki/Vision-Solutions\#calibration-secondary-fiducial](https://github.com/openpnp/openpnp/wiki/Vision-Solutions#calibration-secondary-fiducial) *I think this is complete.*
- Try bottom camera auto-focus for part height detection. *Wait for the new bottom camera lens.*
- Migrated: #8 — Compute, configure, and test a non-zero bottom-camera roaming radius (was: Camera Roaming Radius experiment; the roaming-radius gate question itself is #7)

## Tuning

### 9LED PCB

- Relative to my first test, slightly lower the part placements. 
- Check the 9LED PCB height at 2-3 corners


## Bugs and Problems

- Vision: figure out a way to crop the image based on the part size, so that the bottom vision does not see past the black disc on the head to the overhead lights. A true image crop is preferred because it should speed up the processing, but even masking would be acceptable. Roughly, we'd want a crop circle diameter like `d = a*p + b` where `p` is the diameter of the smallest circle that outlines a properly centered part, `a` is a multiplier, and `b` is an additive term. So for an 0402, p = 0.559; if we set a = 1.2, b = 1.0, then d = 1.67.
- Vision: Automatically adjust subsampling/supersampling based on the expected part size in pixels. The default bottom vision pipeline uses subSampling = 3px, which may be fine for larger parts or a more telephoto lens, but is bad for an 0402 with the wide-angle LumenPnP bottom camera.
- Vision Pipeline Editor: Add a textbox for a pipeline description that is saved to the XML. It is very unclear to me how to select between the stock bottom vision pipeline and the rectilinear pipeline, or others.
- Feeders Tab: add an option to show a description column, since my part IDs are not descriptive. Or at least show the description for the part in the selected feeder in the bottom pane.
- Locked up in vision pipeline editor.
- Popped up screen capture dialog from vision pipeline editor (I have not seen this lately).
- One of the LEDs I'm trying to place has a very slightly tacky surface (perhaps silicone) and stuck to the nozzle when it was supposed to be placed.
  - Increase the place dwell time to allow more time for the vacuum to dissipate
  - I think OpenPnP has detection for part off, possibly to check for exactly this. In other words, after placing (or trying to place) the part and retracting, turn the vacuum back on and check for the no part vacuum reading. If it detects a part, stop and wait. Or Claude's idea: "if you're using an absolute-threshold part-on check, switch to include the trend/differential method. A stuck part gives a vacuum signature with no proper dip-and-recover at the pick, so trend catches it where a level threshold can't. Pair it with "discard on error" so a bad pick ends the placement instead of propagating."
  - Slow the lift speed (Z retract)
  - Place lower for better paste adhesion
  - Experiment with a slight side jog or angled lift off: "**Peel, don't pull.** After the place dwell, jog 50–100 µm in X (or a small circle) *before* lifting Z. Shear breaks a tacky adhesive bond at a fraction of the force of straight tension, and paste tack easily resists that much lateral movement. Doable as a Gcode snippet in the nozzle's after-place script."
  - Try a larger nozzle that contacts the hard plastic rim of the LED rather than the slight depression in the center. The N14 might be perfect and should work well to pick the larger parts on this project.
- I was testing the pick height from a feeder and commanded the nozzle to the next pick position. After verification, I selected the next feeder and either (can't remember) commanded the camera or the nozzle to the pick location on this next feeder. The nozzle moved directly horizontally, without lifting, and crashed into the edge of the feeder. Whenever moving from one feeder to another, the head and nozzle should lift to a safe Z height.

- Why does the LumenPnP vacuum sensor have such a limited range? My guess is because it's at the far end of a 3 foot long tube and the restriction of an open N045 nozzle is not much different than a closed N045 nozzle. On the other hand, the pump noise changes quite noticeably when a part is on the tip, so maybe flow would be a better measurement than pressure. My guess is that the pump speeds up or slows down to try to maintain the vacuum, so the vacuum does not change as much as the pump RPMs and pump current. Along these lines, I wonder if any of the nicer pumps include a way to read the RPM or load current.

## Enhancements

- If I understand correctly, the vacuum pumps also have a pressurized output nozzle. Could I connect these to a positive pressure tank with one-way valves? I'd want a pressure limit valve on the pressure tank to keep the pressure low, both to avoid too much back pressure on the pumps and to avoid too much blow-off force for SMT parts. Then, tie the pressure tank to the extra port on the vacuum solenoids, so that when the solenoid switches positions, it provides a light blow-off for the part. I see some possible issues:
  - Does the 3-way solenoid vent the unused port to free air or close it off?
  - I'll probably need one pressure tank for each pump, since the positive pressure will bleed off quickly through the open nozzles.
- Vision Pipeline: Support zoom and pan from vision pipeline edit window OR show a zoomed in closeup in addition to the full view.
- Vision Pipeline: Support easier way to substitute the last snapshot for ImageCapture, perhaps a useLastSnapshot checkbox
- Vision Pipeline: Improve documentation
- Vision Pipeline: Show time per step
- Add option to recycle part after vacuum detection failure
- Add option to prompt after vacuum detection failure. The prompt should show the vacuum limit and the measured value. It should provide the following options:
  - Place the part
  - Recycle the part
  - Discard the part and stop
  - Discard the part and retry

- Update the LED light rings with RGBW LEDs for better color balance.

## Questions

- In the vision pipeline editor, how do I adjust ParameterNumeric values? Could we add sliders?
- In the vision pipeline editor, for MaskCircle, where do the propertyName values come from, like 'partmask' and 'MaskCircle'. Along these lines, can we auto-mask based on the part or package dimensions?
