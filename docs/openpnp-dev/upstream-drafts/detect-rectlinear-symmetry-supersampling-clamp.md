# DetectRectlinearSymmetry: the superSampling Clamp

Draft upstream text for the `superSampling` clamp finding. Nothing here has been posted —
held until I'm ready to engage upstream. Tracking:
[lumenpnp_nwc#9](https://github.com/NatCrutcher/lumenpnp_nwc/issues/9), with the bench data in
[lumenpnp_nwc#2](https://github.com/NatCrutcher/lumenpnp_nwc/issues/2).

Venue: the [OpenPnP Google Group](https://groups.google.com/group/openpnp) first, per
[OpenPnP_Dev_Guidelines.md](../OpenPnP_Dev_Guidelines.md) — this is core `Reference*` vision
behaviour, not a small clear fix, so it wants discussion before a PR.

## Post

**Subject:** DetectRectlinearSymmetry — the superSampling clamp costs angular precision too, and
small parts oscillate

> I've been characterising `DetectRectlinearSymmetry` on a stock LumenPnP (wide-angle bottom
> camera, 0.0362 mm/px) and ran into behaviour I think is worth raising before I propose anything.
>
> Two lines set the stage's final precision. First the clamp
> (`DetectRectlinearSymmetry.java:542`):
>
> ```java
> final int superSamplingEff = (subSamplingEff == 1 ? Math.max(1, Math.min(maxDiagonal/100, superSampling)) : 1);
> ```
>
> The integer division makes a hard cliff at a 200 px window diagonal: below it, the configured
> `superSampling` is silently ignored — no diagnostic and no opt-out. That much is already known.
> What I had not appreciated is that it also drives the **angular** step (`:582`):
>
> ```java
> double angleStep = Math.max(0.0001, Math.min(Math.toRadians(searchAngle)/4, subSamplingEff/maxSpan/superSamplingEff));
> ```
>
> so below the cliff the angular resolution is halved along with the positional one. Note
> `maxSpan` is the *search window*, not the detected subject.
>
> ### Measurement
>
> A 1.6 × 1.6 mm LED, `subSampling` pinned to 1, run at two window sizes either side of the cliff.
> Predicted `angleStep` against the grid the reported rotations actually landed on:
>
> | window | maxDiagonal | superSamplingEff | predicted angleStep | observed grid |
> |---|---|---|---|---|
> | 2.3 mm | 90 px | 1 (clamped) | 0.901113° | **0.901105°** |
> | 5.2 mm | 204 px | 2 | 0.199285° | **0.199282°** |
>
> Every reported correction across twelve alignments lies on the corresponding lattice, anchored at
> `expectedAngle − searchAngle`. The agreement is close enough to recover the units-per-pixel used
> for the mm→px conversion.
>
> ### Why it matters in practice
>
> At the clamped setting the stage returned only two distinct answers, 3.60442° apart — exactly
> 4.000 angle steps. Because bottom-vision applies each correction to the nozzle, the next
> measurement is taken at the corrected angle and demands the opposite correction. The part angle
> oscillated indefinitely instead of converging, with no `min-symmetry` rejection and no exception:
> the stage was confidently wrong rather than failing. Widening the window to release the clamp
> shrank the swing 1.81× but did not stop it — it still returned identical corrections for two
> different presented angles.
>
> So finer bins alone are not the answer. The subject here is near-square, and a square's angular
> symmetry score is flat near the optimum, so an argmax over a discrete grid has nothing to hold
> onto. (Elongated parts — an 0402, a SOT-23 — behave fine, which is consistent with this.)
>
> ### Two suggestions
>
> **Interpolate the peak.** The score search is a plain argmax over integer bins with no
> interpolation (`findCrossSectionSymmetry`, `:1086–1092`). Parabolic (3-point quadratic)
> interpolation of the peak would give sub-bin precision at any window size, in angle and in
> position, with no finer-than-pixel binning and therefore none of the aliasing exposure the clamp
> exists to avoid. I suspect it would make `superSampling` and its clamp unnecessary altogether.
>
> **At minimum, surface the clamp.** Silently ignoring a configured value is hard to debug; the
> stage already knows when it is clamping and could say so in its diagnostics.
>
> One structural note while I'm here: the only way to *improve* angular resolution today is to
> enlarge the search window, which runs directly against sizing the window to the part so that
> stray light never enters it. That tension is what makes the clamp bite hardest exactly where
> precision matters most — small parts on a wide-angle camera.
>
> Happy to prototype the interpolation against `test` if there's interest, and to share the
> capture set and the analysis script.

## Notes to self

- Do **not** lead with the LumenPnP specifics; the mechanism is camera-independent and the
  numbers are only there as evidence.
- Have ready if asked: the twelve `bv_source_*.png` captures, `bin/bv-analyze`, and the
  per-alignment log lines showing the nozzle angle failing to converge.
- The `angleError` model already in the code (`:764`,
  `angleStep · maxSpan / max(wBest, hBest)`) is an acknowledgement that a subject smaller than
  the window degrades the angle. Worth citing as prior awareness rather than presenting the
  finding as new.
- If the interpolation PR happens, it belongs on a `feature/` branch off `upstream/test` and
  should run `pr-preflight` first.
