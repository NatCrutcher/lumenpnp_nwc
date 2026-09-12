# Part Detection Dialog

Draft upstream text for the `feature/part-detection-dialog` branch in my OpenPnP fork.
Nothing here has been posted — held until I'm ready to engage upstream. Tracking:
[lumenpnp_nwc#34](https://github.com/NatCrutcher/lumenpnp_nwc/issues/34). Upstream anchor:
[openpnp#1822](https://github.com/openpnp/openpnp/issues/1822), which asks for exactly the
"no, the part is still there" choice.

The branch is stacked on [vacuum-check-messages](vacuum-check-messages.md) and
[recycle-on-pick-failure](recycle-on-pick-failure.md). It blocks the machine thread on a
dialog from inside the job processor, so per
[the guidelines](../OpenPnP_Dev_Guidelines.md) it needs a Google Group discussion first.

## Google Group Post

> **A choice dialog when the part-on check fails during a job**
>
> Following up #1822 and the part-detection-failure setting. Today a failed part-on check
> pauses the job with an OK-only error box, after the job processor has already re-picked
> and discarded the part. The operator learns about it after the fact and has one option:
> press Start again.
>
> I have a branch that asks first. *Prompt with dialog* becomes the default of the
> "Part detection failure" setting. With Alert error handling and a GUI present, the job
> processor blocks on an option dialog at the point of failure. It shows the failure message
> with the measured level and the range, plus the part, placement, nozzle and feeder, and
> offers the other actions of the setting as buttons: *Place the part*, *Recycle and retry*
> (only if the feeder can take the part back), *Discard and retry*, *Discard and pause*,
> *Pause*. The job continues according to the choice, no Start press needed. Closing the
> dialog counts as Pause. A second setting, "Part detection failure (deferred)", says what to
> do when nobody can be asked: with deferred error handling, or headless. It defaults to
> *Discard and retry*, so unattended behaviour is unchanged.
>
> Three sites: after pick (after the feeder's own pick retries, before the discard), after
> alignment, and before place. A retry chosen in the dialog always gets another attempt,
> regardless of the counters. The after-place part-off check is not included, because
> `place()` has already cleared the nozzle's part by then and a "discard the stuck part"
> choice would be a no-op; that is a separate ordering problem. The Feeders panel's test pick
> gets a smaller version: keep, recycle or discard the undetected part.
>
> The dialog is raised with `SwingUtilities.invokeAndWait` from the machine task thread,
> which is what the manual nozzle tip change avoids by throwing an
> `ExceptionWithContinuation` instead. I went with blocking because it keeps the machine
> thread parked at the failure with the feeder and retry counters in scope, and the
> continuation form only gives two buttons. One consequence: while the dialog is open,
> Pause/Stop presses queue on the machine executor and run once it closes.
>
> Does that approach sit right with how the job processor is meant to interact with the
> GUI? Happy to open a PR against `test`.

## PR Template

### Description

Adds *Prompt with dialog* to the **Part detection failure** setting and makes it the default.
When a part-on vacuum check fails during a job with Alert error handling and a GUI, the job
processor shows an option dialog instead of acting on its own:

```
No part vacuum-detected after pick. Nozzle tip N045 absolute vacuum level -5700.0 outside Part On range -7900.0 .. -5800.0.

Part R0402-1k for placement R1 on nozzle N1 from feeder F1.

[Place the part] [Recycle and retry] [Discard and retry] [Discard and pause] [Pause]
```

The buttons are the other values of the setting and do the same things; *Recycle and retry*
is offered only when the feeder can take the part back, and a retry chosen here always gets
another attempt. Closing the dialog is *Pause*. The job resumes according to the choice
without pressing Start. Applies after pick (after the feeder's pick retries, before any
discard), after alignment and before place.

A second setting, **Part detection failure (deferred)**, gives the action taken when nobody
can be asked: with deferred error handling, or without a GUI. It offers the same actions
minus the prompt and defaults to *Discard and retry*, so unattended behaviour is unchanged.

The Feeders panel's feed-and-pick test shows the same numbers and asks whether to keep,
recycle or discard the undetected part.

### Justification

#1822 asks for the "no, the part is still there" confirmation. On small parts the vacuum
signal is marginal, so a failed check is frequently a false alarm; today it costs the part
and a manual restart, and the operator is only told after the discard has happened. With the
numbers in the message the operator can make the call, and with the choices the machine can
act on it. The deferred setting keeps unattended runs deterministic.

### Instructions for Use

Nothing to configure for the dialog: with the job's error handling set to *Alert* (the
default toolbar state), a failed part-on check opens it. To act without asking, pick one of
the other actions of **Part detection failure**. **Part detection failure (deferred)** is
what happens with *Defer* error handling or without a GUI. The feeder's *Pick retry count*
still controls how many silent re-picks happen before you are asked.

### Implementation Details

- `UiUtils.askOnMachineThread(title, message, options, defaultOption)` shows a
  `JOptionPane.showOptionDialog` on the EDT, via `invokeAndWait` when called from another
  thread, and returns the chosen index, or -1 when there is no `MainFrame` or the dialog was
  closed.
- `PartDetectionFailureAction.Prompt` and the `partDetectionFailureActionDeferred` attribute
  (its setter refuses Prompt); the wizard's second combo box lists every value but Prompt.
- `resolvePartDetectionFailure()` picks the deferred action when the placement's effective
  error handling is Defer or `canPrompt()` is false, the configured action when it is not
  Prompt, and otherwise `promptPartOnFailure()`. Both are protected, so tests script the
  choice through a subclass.
- `Pick.stepImpl` raises `tryLimit` for a retry chosen in the dialog; `retryPlacement()`
  sets the placement back to Pending for it without consulting Max Placement Attempts.
- `FeedersPanel.pickFeeder()` handles its after-pick failure with the same helper and three
  options; headless it throws as before.
- Tests in `ReferenceJobProcessorRetryTests`: a `TestJobProcessor` that reports a GUI and
  answers prompts from a scripted list, installed through a `TestMachine`. One test per
  choice at the pick site, one for a retry chosen before place, one that Defer never prompts,
  one that a configured action never prompts. The earlier tests run headless and cover the
  deferred setting.
