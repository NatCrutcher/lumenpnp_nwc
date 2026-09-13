# Stuck Part Recovery

Draft upstream text for two branches in my OpenPnP fork, `fix/retain-stuck-part` and
`feature/stuck-part-recovery`. Nothing here has been posted — held until I'm ready to engage
upstream. Tracking: [lumenpnp_nwc#44](https://github.com/NatCrutcher/lumenpnp_nwc/issues/44).
No upstream anchor: a search of openpnp/openpnp issues and PRs found nothing on what happens
after a failed part-off check. [openpnp#102](https://github.com/openpnp/openpnp/issues/102) asked
for the detection itself.

The branches are stacked on [part-detection-dialog](part-detection-dialog.md). The fix changes
`ReferenceNozzle` and the job's place step, so per [the guidelines](../OpenPnP_Dev_Guidelines.md)
it gets a Google Group post first. The feature blocks the machine thread on a dialog like the
part-detection dialog does, and is the same conversation.

## Google Group Post

> **A part still on the nozzle after place is forgotten before it is detected**
>
> `ReferenceNozzle.place()` ends with `setPart(null)` and `setPartsFeeder(null)`. The job
> processor's part-off check runs after that, at safe Z. So when the check fails, OpenPnP already
> believes the nozzle is empty: `Cycles.discard()` returns early, so the stuck part is never sent
> to the discard location at the end of the cycle or in the next job's pre-flight; and the Defer
> error handling looks up the feeder through `nozzle.getPartsFeeder()`, finds nothing, and marks
> the placement errored instead of retrying it. Max Placement Attempts has no effect on this
> failure. `ReferenceFeeder.putPartBack()` has the same shape: it places, checks, and throws with
> the part on the tip and nothing knowing.
>
> The same `setPart(null)`-before-the-event ordering has a third effect: `Nozzle.AfterPlace`
> scripts see the head rotation rather than the part rotation, because `setPart(null)` clears the
> rotation mode offset. I mention it because it is one line with three consequences.
>
> I have a branch that keeps `place()` as it is and adds `ReferenceNozzle.retainPart(part,
> feeder)`, called by the job's place step and by `putPartBack()` when the part-off check fails.
> With that, stock behaviour becomes what it was meant to be: Alert pauses with the part known and
> the end-of-cycle discard disposes of it; Defer retries within Max Placement Attempts. A stuck
> part is not counted as a feeder fault. The failure is a `PartOffException`, so a motion fault is
> not mistaken for a stuck part.
>
> A second branch then gives the after-place site its own setting, next to "Part detection
> failure": *Prompt with dialog* (default), *Retry the placement* (the same part again, no re-pick,
> each attempt a configurable step lower to press it into the paste), *Place by hand* (the nozzle
> parks at the placement with the vacuum off and asks you to take the part), *Discard and retry*,
> *Discard and skip*, *Pause*, plus a deferred variant. It deliberately has no recycle: the part
> has touched the paste. Discards after a stuck part are checked, since a part that did not come
> off on the board may not come off in free air either.
>
> Is `retainPart()` the right shape, or would you rather `place()` stopped clearing the part and
> the callers cleared it after their own check? The latter is purer but every caller of `place()`
> would have to do it. Happy to open PRs against `test`.

## PR Template: Fix

### Description

When the part-off vacuum check after a place finds the part still on the nozzle, the nozzle now
keeps the part and its feeder. `ReferenceNozzle.retainPart(Part, Feeder)` is called by the job
processor's place step and by `ReferenceFeeder.putPartBack()` when their check fails. The
job's failure is a `PartOffException`, and the Defer error handling does not record it as a
feeder fault.

### Justification

`ReferenceNozzle.place()` clears the part before the check runs, so a detected stuck part was
never discarded (`Cycles.discard()` returns on an empty nozzle) and never retried (the Defer
branch finds no feeder). The stuck part rode along to the next pick. This is the case the part-off
check and the discard location exist for.

### Instructions for Use

Nothing to configure. With the part-off check after place enabled on a nozzle tip, a part that
stays on the nozzle is discarded at the end of the cycle, and with deferred error handling the
placement is retried within Max Placement Attempts.

### Implementation Details

- `ReferenceNozzle.retainPart()` re-attaches the part and feeder (the setters are protected in
  `AbstractNozzle`) and logs at WARN.
- `ReferencePnpJobProcessor.Place.checkPartOff()` takes the feeder captured before `place()`,
  retains on failure and throws `PartOffException`; `PlannedPlacementStep.step()` skips
  `recordJobFault` for it.
- `ReferenceFeeder.putPartBack()` captures part and feeder before `place()` and retains on
  failure.
- Tests in `ReferenceJobProcessorRetryTests`: `MachineBuilder.partOffCheck()` enables the check
  with a zero-length probe; one test for Alert (pause with the part known), one for Defer (retry,
  one discard, feeder still enabled).

## PR Template: Feature

### Description

Adds a **Stuck part after place** setting to the ReferencePnpJobProcessor, taken when the
part-off check after a place fails:

- **Prompt with dialog** (default): with Alert error handling and a GUI, ask which of the other
  actions to take. The dialog shows the failure with the measured level and range, plus part,
  placement, nozzle and feeder. Closing it is Pause.
- **Retry the placement**: place the same part again at the same location, up to **Place retry
  attempts** times, each attempt **Place retry Z step** lower. No re-pick, no re-align. Out of
  attempts, the dialog asks again; unattended, the part is discarded and the placement marked
  errored.
- **Place by hand**: park the part at the placement with the vacuum off and ask the user to take
  it off the nozzle, then check part-off again.
- **Discard and retry**: discard, then plan the placement again with a new part within Max
  Placement Attempts.
- **Discard and skip**: discard and mark the placement errored, the job goes on.
- **Pause**: pause with the part on the nozzle; the next Start's pre-flight discards it.

**Stuck part after place (deferred)** applies with deferred error handling or without a GUI,
offers everything but the prompt and the hand placement, and defaults to *Discard and retry*.

Every discard here is checked with the part-off probe; a part still on the nozzle afterwards
pauses the job with "remove it by hand". `Job.Placement.BeforeRetry` fires before each retry
with `placement`, `placementLocationBase`, `placementLocation` and `attempt`.

### Justification

The number one goal is to get the part placed. A part that did not release usually failed for a
reason a fresh part will meet again: too little paste, a release height that left the part not
quite in the paste, or a tacky part. Re-placing the same part a little lower addresses the second;
hand placement the third; skipping the first. Recycling is wrong here because the part carries
paste. A discard into free air can fail the same way as the place did, so it is verified.

### Instructions for Use

Machine Setup > Job Processors > ReferencePnpJobProcessor. Leave **Stuck part after place** at
*Prompt with dialog* to be asked. Set **Place retry Z step** to how much lower each retry should
press, e.g. 0.05 mm, and **Place retry attempts** to how many times. **Stuck part after place
(deferred)** is what happens with Defer error handling or headless.

A `Job.Placement.BeforeRetry` script receives `nozzle`, `part`, `placement`, `boardLocation`,
`placementLocationBase`, `placementLocation`, `attempt` and `attempts`.

### Implementation Details

- `PartOffFailureAction` enum, the two action attributes (the deferred setter refuses Prompt and
  PlaceByHand), `placeRetryAttempts` and `placeRetryZStep` (a `Length` element), bound in the
  job processor wizard.
- `Place.handlePartOffFailure()` loops on `resolvePartOffFailure()`: `retryPlace()` re-runs
  `place()` and `checkPartOff()` per attempt; `placeByHand()` moves to the placement, prompts,
  retracts, calls `ReferenceNozzle.partRemoved()` and checks; `discardChecked()` discards and
  probes. *Discard and retry* sets the placement to Pending itself within Max Placement Attempts,
  rather than rethrowing to the Defer branch, which could not find the feeder after the discard.
- `promptPartOffFailure()` and `promptPlaceByHand()` use `UiUtils.askOnMachineThread` and are
  protected so tests script them. The dialog says how many retries there are and how much lower
  each one places.
- Nine tests in `ReferenceJobProcessorRetryTests`, one per action plus exhaustion under Defer,
  the declined hand placement, a part stuck after the discard, and the deferred setter.

## Notes to Self

- `JobProcessorException(Object source, Object secondarySource, String message)` in
  `spi/JobProcessor.java` assigns `this.secondarySource = source`. A secondary source is never
  stored through that constructor. One-line upstream fix, separate PR; the feature branch works
  around it.
- `handlePartOnFailure()` (#33 branch) had the same Defer problem: it discarded and then
  rethrew, and `getFeederFromException()` reads the feeder from the nozzle, which the discard
  had cleared. Fixed on that branch on 2026-09-13 (`retryPlacement()` decides for Defer too),
  stack rebased.
- **Probe timing depends on pump spin-down.** Bench 2026-09-13: a part-off probe 1.5–1.8 s
  after the pump stopped read −4670 / −4856 on an open N045 tip; the next probe of the same
  open tip, 12–15 s after the pump last ran, read −3884 and passed. Every reading in the #23
  characterisation was of the first kind. The retry and discard checks are of the second kind,
  so a stuck part on a cold pump may read above −5150 and pass. Not a code problem; needs a
  bench characterisation of probe level against pump-off time, and probably a longer probe or
  `vacuum-pump-control=KeepRunning` during jobs.
