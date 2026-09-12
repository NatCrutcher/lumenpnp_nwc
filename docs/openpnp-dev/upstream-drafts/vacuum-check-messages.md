# Vacuum Check Messages

Draft upstream text for the `fix/vacuum-check-messages` branch in my OpenPnP fork. Nothing
here has been posted — held until I'm ready to engage upstream. Tracking:
[lumenpnp_nwc#34](https://github.com/NatCrutcher/lumenpnp_nwc/issues/34).

This is the small, independently useful half of #34. It is the natural first reply to
[openpnp#1822](https://github.com/openpnp/openpnp/issues/1822), and small enough to go
straight to a PR without a Google Group thread.

## Comment for openpnp#1822

> Same experience here, and I think there are two separate problems in it.
>
> The first is that the dialog gives you nothing to decide with. When the check fails,
> `ReferenceNozzle.isPartOn()` knows the nozzle tip, the measured level and the configured
> range, but it only logs them at DEBUG and the job processor throws a bare
> "No part vacuum-detected after alignment. Part may have been lost in transit." So the one
> question the operator has — real miss, or a marginal reading? — is unanswerable from the
> box. I have a small PR that puts the numbers into the message at all five check sites and
> logs them at WARN:
>
> `No part vacuum-detected after pick. Nozzle tip N045 absolute vacuum level -5700.0 outside Part On range -7900.0 .. -5800.0.`
>
> The second is the confirmation you ask for. I have that working too, as a follow-up on top
> of the first: with Alert error handling the job processor asks "place the part / recycle it to
> the feeder and retry / discard and retry / discard and pause / pause", at the pick check as
> well as after alignment and before place, and continues according to the choice. Deferred
> error handling and headless operation are unchanged. I'll open that separately once the
> message PR is in, since it touches the job processor's control flow and deserves its own
> discussion.

## PR Template

### Description

When a part-on or part-off vacuum check fails, the `JobProcessorException` message now
carries the nozzle tip name, the measurement method, the measured level and the configured
range, e.g.

```
No part vacuum-detected after pick. Nozzle tip N045 absolute vacuum level -5700.0 outside Part On range -7900.0 .. -5800.0.
```

The same report is logged at WARN instead of DEBUG. Applies to all five job-processor check
sites (before pick, after pick, after alignment, before place, after place) and to both
checks of the Feeders panel's test pick. The range is named as the GUI names it, "Part On"
and "Part Off", rather than the PartOn/PartOff of the old debug line.

### Justification

The numbers decide what the operator should do next, and today they are only visible with
DEBUG logging on, or several screens away in the nozzle tip's Part Detection wizard after
the fact. Related: #1822, where the same false-positive experience is reported.

### Instructions for Use

Nothing to configure. The job error box and the log now state what was measured and
against which range. Vacuum levels are in the units the vacuum sense actuator reports.

### Implementation Details

- `ReferenceNozzle` keeps `vacuumCheckReport`, set at every failing branch of `isPartOn()`
  and `isPartOff()` (absolute, baseline and difference) with the same text as the log line,
  and cleared on a passing check. `getVacuumCheckReport()` exposes it.
- `ReferenceNozzle.describeVacuumCheck(Nozzle, String)` appends the report to a message when
  the nozzle is a `ReferenceNozzle` and the last check failed. `ReferencePnpJobProcessor`
  uses it at the five throw sites; `FeedersPanel.pickFeeder()` at its two checks.
- The failure log lines move from `Logger.debug` to `Logger.warn`, with "Part On" / "Part Off"
  spelled as in the GUI.
- `ReferenceJobProcessorRetryTests.testVacuumCheckFailureMessage` forces a failing reading
  through the test vacuum actuator and asserts the tip name, reading and range in the message.
