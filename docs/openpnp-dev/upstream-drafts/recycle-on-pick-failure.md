# Part Detection Failure Setting

Draft upstream text for the `feature/recycle-on-pick-failure` branch in my OpenPnP fork.
Nothing here has been posted — held until I'm ready to engage upstream. Tracking:
[lumenpnp_nwc#33](https://github.com/NatCrutcher/lumenpnp_nwc/issues/33). The branch is
stacked on [vacuum-check-messages](vacuum-check-messages.md).

This changes `ReferencePnpJobProcessor`'s handling of a failed part-on check at all three
sites, so per [the guidelines](../OpenPnP_Dev_Guidelines.md) it needs a Google Group
discussion before a PR is opened.

## Google Group Post

> **A "Part detection failure" setting: recycle to the feeder, place anyway, or pause**
>
> When the part-on check fails after a pick, the job processor re-picks up to
> `1 + feeder.pickRetryCount` times, discards the part, and retries within Max Placement
> Attempts. With a marginal vacuum signal on small parts that costs a good part on every
> false alarm, and there is no way to say "don't discard, put it back" or "just stop".
>
> The machinery to put it back already exists: `Feeder.canTakeBackPart()` /
> `takeBackPart()` is implemented by the strip, tray, rotated tray, auto, push-pull, blinds,
> loose part, heap and Photon feeders, and it is what the Recycle button in the jog controls
> calls. It just is not wired into the job.
>
> I have a branch that makes the reaction a setting on the ReferencePnpJobProcessor, next to
> Max Placement Attempts: *Discard and retry* (today's behaviour, the default), *Recycle and
> retry*, *Place the part*, *Discard and pause*, *Pause*. Recycle hands the part back with
> `takeBackPart()` when `canTakeBackPart()` says it can, and the pick gets one more attempt;
> feeders that cannot take a part back, and take-backs that fail, fall back to the discard.
> The pause actions interrupt even deferred error handling.
>
> For a strip feeder the recycle is better than a discard in every case I can think of. If
> the sensor was wrong, the good part goes back in its pocket and is re-picked. If the pick
> really missed, the part is still in the pocket, and because `takeBackPart()` decrements the
> feed count the next feed re-presents that pocket rather than skipping it, which today wastes
> the unpicked part. If the pick was tombstoned, it goes back, fails again and the retry
> counters bound it.
>
> The take-back is factored into a `Cycles.recycle()` that runs the
> `Feeder.BeforeTakeBack` / `Feeder.AfterTakeBack` scripts around it (with the after event in
> a `finally`, which the jog button did not do), and the jog button now uses the same cycle.
>
> Does the setting belong on the job processor, where I have put it? Happy to open a PR
> against `test`.

## PR Template

### Description

Adds a **Part detection failure** setting to the ReferencePnpJobProcessor (Machine Setup > Job
Processors), taken when a part-on vacuum check fails after the feeder's pick retries:

- **Discard and retry** (default): discard the part and retry within the configured pick
  retries and Max Placement Attempts, as before.
- **Recycle and retry**: put the part back into its feeder with `Feeder.takeBackPart()` when
  the feeder reports `canTakeBackPart()`, and attempt the pick once more. If the feeder
  cannot take the part back, or the take-back fails, the part is discarded as before.
- **Place the part**: go on as if the check had passed.
- **Discard and pause** / **Pause**: pause the job with the failure, with the part discarded or
  left on the nozzle. These pause even with deferred error handling.

The setting applies at all three part-on checks. After alignment and before place, the
retry actions reset the placement to Pending within Max Placement Attempts; with deferred
error handling the failure is rethrown so the regular error handling re-plans it and records
the feeder fault, exactly as before.

The take-back sequence, including the `Feeder.BeforeTakeBack` and `Feeder.AfterTakeBack`
scripting events, is factored into `Cycles.recycle(Nozzle, Feeder)`. The Recycle button in the
jog controls uses it too, so the after-event now also fires when the take-back throws.

### Justification

A failed part-on check is not proof that the part was lost. On small parts the vacuum signal
is marginal and false alarms happen; each one binned a good part, and the only alternative
was to disable the check. Every reference feeder type that can present the same pocket again
already implements take-back, and the GUI has exposed it as "Recycle" since 2.5, so the job
processor should be able to use it too.

For a strip feeder the recycle is at least as good as the discard in all three cases: a
false alarm returns the good part for re-picking; a real miss re-presents the pocket that
still holds the part (a discard-and-refeed skips and wastes it); a bad pick goes back,
fails again and is bounded by the existing retry counters.

### Instructions for Use

Machine Setup > Job Processors > ReferencePnpJobProcessor > **Part detection failure**. Leave
it at *Discard and retry* for today's behaviour. *Recycle and retry* returns an undetected
part to its feeder instead of the discard location, when the feeder supports it (strip,
tray, auto, push-pull, blinds, loose part, heap and Photon feeders do). *Place the part*
trusts the pick over the sensor. *Discard and pause* and *Pause* stop the job for you to look.

The feeder's own *Pick retry count* still controls how many re-picks happen before the
action is taken. If you use `Feeder.BeforeTakeBack` / `Feeder.AfterTakeBack` scripts for the
manual Recycle button, they now also run for the automatic recycle.

### Implementation Details

- `Cycles.recycle(Nozzle, Feeder)` mirrors `discardAlways()`: builds the `nozzle`,
  `feeder`, `part` globals, fires `Feeder.BeforeTakeBack`, calls `feeder.takeBackPart()`, and
  fires `Feeder.AfterTakeBack` in a `finally`. `JogControlsPanel.recycleAction` now calls it.
- `AbstractPnpJobProcessor.recycle(Nozzle, Feeder)` is the job-side wrapper next to
  `discard()`: returns false without throwing when there is no part, no feeder, the feeder
  serves a different part or cannot take it back, or the take-back throws (logged at WARN).
- `ReferencePnpJobProcessor.PartOnException` marks the three part-on failures, so a motion
  fault or feeder error during the pick is still handled as before (discard, retry).
- `PartDetectionFailureAction` enum and the `partDetectionFailureAction` attribute, bound
  to a combo box in the job processor wizard. `resolvePartDetectionFailure()` returns it and
  is the hook the dialog branch overrides.
- `Pick.stepImpl`: the `discard(nozzle)` after a failed `feederPickRetry()` becomes a switch
  on the action. A recycle with no part-level pick retries raises `tryLimit` to 2, the same
  way an empty feeder already gets one extra attempt.
- `Align` and `Place`: `handlePartOnFailure()` applies the action; `retryPlacement()` sets
  the placement back to Pending within Max Placement Attempts, or rethrows.
- Tests in `ReferenceJobProcessorRetryTests`: `TestFeeder` gains take-back support and a
  failing mode, `TestNozzle` records place locations so a discard is distinguishable, and
  `TestActuator` can queue readings. One test per action plus the recycle fallbacks; the
  existing discard tests are unchanged.
