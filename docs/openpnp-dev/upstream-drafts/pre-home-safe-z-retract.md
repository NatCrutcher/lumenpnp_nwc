# Safe Z Before Homing

Draft upstream text for the `fix/safe-z-before-homing` branch in my OpenPnP fork. Nothing
here has been posted — held until I'm ready to engage upstream. Tracking:
[lumenpnp_nwc#29](https://github.com/NatCrutcher/lumenpnp_nwc/issues/29).

This touches core `ReferenceMachine.home()`, so per
[the guidelines](../OpenPnP_Dev_Guidelines.md) it needs a Google Group discussion before a
PR is opened.

## Google Group Post

> **Homing sweeps the head at whatever Z it was left at**
>
> `ReferenceMachine.home()` sends the driver's homing commands with the tools wherever
> they happen to be. Controllers commonly home X and Y first, so homing with a nozzle
> still at pick depth drags it the length of the machine at that Z. That is what happened
> to me: a nozzle left at Z 4.2 was driven through a row of feeders on the way to the X/Y
> limit switches, bending the shaft. Marlin has no stall detection during normal motion,
> so it simply stalled and buzzed until I cut the power.
>
> Homing Z first is not the answer, at least not generally — on a machine where the Z
> endstop is at the *bottom* of travel, homing Z first plunges the nozzle into whatever is
> underneath it. That is exactly why controllers home X and Y first.
>
> What OpenPnP can do is retract before it hands over. When the machine is already homed
> the machine coordinates are known, so `home()` can move all the tools to Safe Z and wait
> for still-stand before the homing commands go out. That is a no-op on a machine already
> at Safe Z, and it uses the existing Safe Z Zone abstraction, including the shared/negated
> Z handling that `AbstractHeadMountable.moveToSafeZ()` already has for rocker heads.
>
> On the first homing of a session the Z position is unknown and no move is safe, so
> nothing can be done automatically there. For that case I've added an optional
> confirmation dialog, off by default.
>
> Does this seem like the right layer for it? Happy to open a PR against `test`.

## PR Template

### Description

Two changes:

1. `ReferenceMachine.home()` retracts all the tools to Safe Z before the driver's homing
   commands are sent, when the machine is already homed, i.e. when the machine coordinates
   are known. The retract precedes `unhome()`, because the motion planner refuses non-jog
   motion once the machine is unhomed, and it is followed by an explicit
   `waitForCompletion(WaitForStillstand)`, because the motion planner only plans the motion
   and `AbstractMotionPlanner.home()` does not flush the queue. A retract that fails aborts
   the home rather than performing an unsafe sweep.
2. A new machine option, "Confirm homing when unhomed?" (Machine Setup > General, off by
   default), asks the user to confirm that the head is clear when the machine has not been
   homed yet in this session. Skipped when there is no `MainFrame`, so headless and
   scripted operation never blocks.

### Justification

Controllers commonly home X and Y before Z, which sweeps the head across the whole machine
at whatever Z it was last left at. Homing with a nozzle at pick depth therefore drags it
through the feeders or the board. On my machine this bent a nozzle shaft; stock Marlin has
no stall detection during normal motion, so nothing stops it.

Retracting first is the general fix, and it is only possible when the machine coordinates
are known. When they are not, no move is safe, hence the optional confirmation.

### Instructions for Use

Nothing to configure for the retract — re-homing an already homed machine now moves the
tools to Safe Z first. If a tool cannot be retracted (for example a nozzle carrying a part
too tall for the Safe Z Zone), homing is refused with an error explaining what to clear.

"Confirm homing when unhomed?" in Machine Setup > General is off by default. Switch it on
to be asked to confirm that the head is clear each time you home a machine that has not
been homed yet in the current session. It has no effect when running without a GUI.

### Implementation Details

- `ReferenceMachine.retractToSafeZBeforeHoming()` loops the heads calling
  `head.moveToSafeZ()`, then `waitForCompletion(null, CompletionType.WaitForStillstand)`.
  On failure it flushes the queue (so OpenPnP re-syncs its position) and rethrows.
- `AbstractHeadMountable.moveToSafeZ()` already moves a tool only when its underside Z is
  below the Safe Z Zone, and explicitly ignores the "above the zone" case that arises with
  a shared Z axis and a negating transform. On such a head exactly one Z move results, and
  it places both tools inside the zone.
- The confirmation is raised through `SwingUtilities.invokeAndWait`, because homing runs on
  the machine task thread, and is skipped when `MainFrame.get()` is null. Declining throws
  before anything in `home()` has been mutated.
- `PreHomeSafeZRetractTest` covers all three behaviours against a `TestDriver` machine with
  two nozzles sharing one Z axis through a negating transform.
