# Part Detection Dialog

Draft upstream text for the `feature/part-detection-dialog` branch in my OpenPnP fork.
Nothing here has been posted — held until I'm ready to engage upstream. Tracking:
[lumenpnp_nwc#34](https://github.com/NatCrutcher/lumenpnp_nwc/issues/34). Upstream anchor:
[openpnp#1822](https://github.com/openpnp/openpnp/issues/1822), which asks for exactly the
"no, the part is still there" choice.

The branch stacks on [vacuum-check-messages](vacuum-check-messages.md) and
[recycle-on-pick-failure](recycle-on-pick-failure.md); both are merged into it. It changes the
job processor's control flow at three sites, so per
[the guidelines](../OpenPnP_Dev_Guidelines.md) it needs a Google Group discussion first.

## Google Group Post

> **A choice dialog when the part-on check fails during a job**
>
> Following up #1822 and the vacuum-check-messages PR. Today a failed part-on check pauses
> the job with an OK-only error box, after the job processor has already re-picked up to
> `1 + pickRetryCount` times and discarded the part. The operator learns about it after the
> fact and has one option: press Start again.
>
> I have a branch that asks first. With Alert error handling and a GUI present, the job
> processor blocks on an option dialog at the point of failure. It shows the failure message
> with the measured level and the range, plus the part, placement, nozzle and feeder, and
> offers: *Use the part*, *Recycle and retry* (only if the feeder can take the part back),
> *Discard and retry*, *Discard and pause*, *Pause*. The job continues according to the
> choice, no Start press needed. Closing the dialog counts as Pause.
>
> Three sites: after pick (after the feeder's own pick retries, before the discard), after
> alignment, and before place. At the pick site a retry re-enters the feed/pick loop; at
> the other two it resets the placement to Pending so the planner schedules it again, which
> is what Defer mode already does on an error. The after-place part-off check is not
> included, because `place()` has already cleared the nozzle's part by then and a "discard the
> stuck part" choice would be a no-op; that is a separate ordering problem.
>
> Deferred error handling and headless/scripted operation never see the dialog and behave
> exactly as before. The dialog is raised with `SwingUtilities.invokeAndWait` from the
> machine task thread, which is what the manual nozzle tip change avoids by throwing an
> `ExceptionWithContinuation` instead. I went with blocking because it keeps the machine
> thread parked at the failure with the feeder and retry counters in scope, and the
> continuation form only gives two buttons. One consequence: while the dialog is open,
> Pause/Stop presses queue on the machine executor and run once it closes.
>
> Does that approach sit right with how the job processor is meant to interact with the
> GUI? Happy to open a PR against `test`.

## PR Template

### Description

When a part-on vacuum check fails during a job and the placement's effective error handling
is Alert, the job processor now shows an option dialog instead of throwing straight away:

```
No part vacuum-detected after pick. Nozzle tip N045 absolute vacuum level -5700.0 outside PartOn range -7900.0 .. -5800.0.

Part R0402-1k for placement R1 on nozzle N1 from feeder F1.

[Use the part] [Recycle and retry] [Discard and retry] [Discard and pause] [Pause]
```

- **Use the part**: continue as if the check had passed.
- **Recycle and retry**: put the part back in its feeder (offered only when the feeder can
  take it back) and attempt the placement again.
- **Discard and retry**: discard the part and attempt the placement again.
- **Discard and pause**: discard the part, then pause the job with the error.
- **Pause** (also on closing the dialog): pause the job with the error, part left on the nozzle.

The job resumes according to the choice without pressing Start. Applies after pick (after
the feeder's pick retries, before any discard), after alignment and before place. Deferred
error handling and headless operation never prompt and behave as before.

### Justification

#1822 asks for the "no, the part is still there" confirmation. On small parts the vacuum
signal is marginal, so a failed check is frequently a false alarm; today it costs the part
and a manual restart, and the operator is only told after the discard has happened. With the
numbers in the message the operator can make the call, and with the choices the machine can
act on it.

### Instructions for Use

Nothing to configure. With the job's error handling set to *Alert* (the default toolbar
state), a failed part-on check opens the dialog. With *Defer*, the job processor handles the
failure automatically as before, including the *Failed pick recovery* setting. The feeder's
*Pick retry count* still controls how many silent re-picks happen before you are asked.

### Implementation Details

- `UiUtils.askOnMachineThread(title, message, options, defaultOption)` shows a
  `JOptionPane.showOptionDialog` on the EDT, via `invokeAndWait` when called from another
  thread, and returns the chosen index, or -1 when there is no `MainFrame` or the dialog was
  closed.
- `ReferencePnpJobProcessor.PartOnException extends JobProcessorException` marks the three
  part-on failures so that other pick exceptions (motion faults, feeder errors) never prompt.
- `PartDetectionChoice` enum; `promptPartOnFailure(...)` (protected, so tests can script
  it) returns null unless the placement's effective error handling is Alert and a GUI is
  present. It logs the choice at INFO.
- `Pick.stepImpl`: on a `PartOnException` out of `feederPickRetry()`, the choice is applied
  in the existing loop: *Use* returns, *retry* variants raise `tryLimit` so the loop runs
  once more, *pause* variants rethrow. With no choice the configured *Failed pick recovery*
  applies, as before.
- `Align` and `Place`: `handlePartOnFailure(...)` applies the choice; the retry variants
  set the `JobPlacement` back to `Pending` and return, which is the same path the Defer
  handling already uses.
- Tests in `ReferenceJobProcessorRetryTests`: a `TestJobProcessor` overriding the prompt
  with a scripted choice list, installed through a `TestMachine`. One test per choice at
  the pick site, one for a retry at the before-place site, one asserting Defer never prompts.
  The pre-existing tests exercise the headless path.
