# Recycle on Pick Failure

Draft upstream text for the `feature/recycle-on-pick-failure` branch in my OpenPnP fork.
Nothing here has been posted — held until I'm ready to engage upstream. Tracking:
[lumenpnp_nwc#33](https://github.com/NatCrutcher/lumenpnp_nwc/issues/33).

This changes `ReferencePnpJobProcessor.Pick`, so per
[the guidelines](../OpenPnP_Dev_Guidelines.md) it needs a Google Group discussion before a
PR is opened.

## Google Group Post

> **Recycling a part to its feeder after a failed pick, instead of discarding it**
>
> When the part-on check fails after a pick, the job processor re-picks up to
> `1 + feeder.pickRetryCount` times and then discards the part before re-feeding. With a
> marginal vacuum signal on small parts that costs a good part on every false alarm.
>
> The machinery to do better already exists: `Feeder.canTakeBackPart()` /
> `takeBackPart()` is implemented by the strip, tray, rotated tray, auto, push-pull, blinds,
> loose part, heap and Photon feeders, and it is what the Recycle button in the jog controls
> calls. It just is not wired into the job.
>
> I have a branch that adds a "Failed pick recovery" setting to the ReferencePnpJobProcessor:
> Discard (today's behaviour, the default) or Recycle. With Recycle, the part is handed back
> to the feeder via `takeBackPart()` when `canTakeBackPart()` says it can, and the pick gets
> one more attempt; feeders that cannot take a part back, and take-backs that fail, fall back
> to the discard.
>
> For a strip feeder this is better than a discard in every case I can think of. If the
> sensor was wrong, the good part goes back in its pocket and is re-picked. If the pick really
> missed, the part is still in the pocket, and because `takeBackPart()` decrements the feed
> count the next feed re-presents that same pocket rather than skipping it, which today
> wastes the unpicked part. If the pick was tombstoned, it goes back, fails again and the
> retry counters bound it.
>
> The take-back is factored into a `Cycles.recycle()` that runs the
> `Feeder.BeforeTakeBack` / `Feeder.AfterTakeBack` scripts around it (with the after event in
> a `finally`, which the jog button did not do), and the jog button now uses the same cycle.
>
> Does the setting belong on the job processor next to Max Placement Attempts, where I have
> put it, or somewhere else? Happy to open a PR against `test`.

## PR Template

### Description

Adds a **Failed pick recovery** setting to the ReferencePnpJobProcessor (Machine Setup > Job
Processors), with two values:

- **Discard** (default): after the feeder's pick retries are exhausted, the part is discarded
  at the discard location, as before.
- **Recycle to feeder**: the part is put back into its feeder with `Feeder.takeBackPart()`
  when the feeder reports `canTakeBackPart()`, and the pick is attempted once more. If the
  feeder cannot take the part back, or the take-back fails, the part is discarded as before.

The take-back sequence, including the `Feeder.BeforeTakeBack` and `Feeder.AfterTakeBack`
scripting events, is factored into `Cycles.recycle(Nozzle, Feeder)`. The Recycle button in the
jog controls uses it too, so the after-event now also fires when the take-back throws.

### Justification

A failed part-on check is not proof that the part was lost. On small parts the vacuum signal
is marginal and false alarms happen; each one binned a good part. Every reference feeder
type that can present the same pocket again already implements take-back, and the GUI has
exposed it as "Recycle" since 2.5, so the job processor should be able to use it too.

For a strip feeder the recycle is at least as good as the discard in all three cases: a
false alarm returns the good part for re-picking; a real miss re-presents the pocket that
still holds the part (a discard-and-refeed skips and wastes it); a bad pick goes back,
fails again and is bounded by the existing retry counters.

### Instructions for Use

Machine Setup > Job Processors > ReferencePnpJobProcessor > **Failed pick recovery**. Leave
it at *Discard* for today's behaviour. Set it to *Recycle to feeder* to have a part whose
part-on check fails returned to its feeder instead of the discard location, when the feeder
supports it (strip, tray, auto, push-pull, blinds, loose part, heap and Photon feeders do).

The feeder's own *Pick retry count* still controls how many re-picks happen before the part
is recycled or discarded. If you use `Feeder.BeforeTakeBack` / `Feeder.AfterTakeBack`
scripts for the manual Recycle button, they now also run for the automatic recycle.

### Implementation Details

- `Cycles.recycle(Nozzle, Feeder)` mirrors `discardAlways()`: builds the `nozzle`,
  `feeder`, `part` globals, fires `Feeder.BeforeTakeBack`, calls `feeder.takeBackPart()`, and
  fires `Feeder.AfterTakeBack` in a `finally`. `JogControlsPanel.recycleAction` now calls it.
- `AbstractPnpJobProcessor.recycle(Nozzle, Feeder)` is the job-side wrapper next to
  `discard()`: returns false without throwing when there is no part, no feeder, the feeder
  serves a different part or cannot take it back, or the take-back throws (logged at WARN).
- `ReferencePnpJobProcessor.PickFailureRecovery { Discard, Recycle }`, attribute
  `pickFailureRecovery`, bound to a combo box in the job processor wizard.
- `Pick.stepImpl`: the `discard(nozzle)` after a failed `feederPickRetry()` becomes
  `recoverFailedPick(nozzle, feeder)`. When the part was recycled and no part-level pick
  retries are configured, `tryLimit` is raised to 2, the same way an empty feeder already
  gets one extra attempt. Nothing else in the loop changes.
- Tests in `ReferenceJobProcessorRetryTests`: `TestFeeder` gains take-back support and a
  failing mode, `TestNozzle` records place locations so a discard is distinguishable.
  `testPickFailureRecycle`, `testPickFailureRecycleUnsupported`,
  `testPickFailureRecycleFails`; the existing discard tests are unchanged.
