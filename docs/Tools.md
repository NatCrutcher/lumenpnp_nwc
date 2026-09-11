# Repo Tools

The helper scripts in `bin/`. They fall into three groups: running OpenPnP, working on the
OpenPnP fork, and measuring what the machine sees.

| Script | Group | What it does |
|---|---|---|
| [`pnp26`](../bin/pnp26) | Run | Launches the released OpenPnP 2.6 against the live config |
| [`pnptest`](../bin/pnptest) | Run | Launches the locally built `local-test` OpenPnP against the same config |
| [`openpnp-deploy`](../bin/openpnp-deploy) | Fork | Builds the `local-test` branch and deploys it for `pnptest` |
| [`openpnp-changes`](../bin/openpnp-changes) | Fork | Lists what changed between two OpenPnP refs |
| [`openpnp-dev-setup`](../bin/openpnp-dev-setup) | Fork | One-time per-PC setup of the fork working tree |
| [`pr-preflight`](../bin/pr-preflight) | Fork | Pre-PR checks on an OpenPnP feature branch |
| [`bv-analyze`](../bin/bv-analyze) | Measure | Measures a bottom-camera capture; replays the threshold pipeline |
| [`vacuum-log`](../bin/vacuum-log) | Measure | Lists vacuum-sensor runs in an OpenPnP log; flags torn reads; exports curves |

Everything reads the live config at `~/dev/lumenpnp_nwc/config`, overridable with `NWC_DIR`.

## Running OpenPnP

`pnp26` is the everyday launcher — stock OpenPnP 2.6 from `~/openpnp/v2.6`, pointed at this
repo's `config/` rather than `~/.openpnp2`. **This is the one that writes the XML in `config/`**,
so it is also what produces the config diffs that end up in commits.

`pnptest` runs the local development build instead, from `~/openpnp/local-test`. It prints the
deployed build's `BUILD.txt` (commit and merged branches) at startup so there is never a question
of which build is on screen. It refuses to start if nothing has been deployed.

Both point at the same config directory, so a session in either one can rewrite `config/`.

## Working on the Fork

`openpnp-deploy` builds `~/dev/openpnp_local-test` and copies the result to `~/openpnp/local-test`.
It insists the worktree is on the `local-test` branch and clean, and it deploys *out of* the
worktree so later builds or branch switches cannot disturb a running instance.

`openpnp-changes` answers "what does my build add?" — the CHANGES.md bullets plus the first-parent
commits between two refs. Default is `2.6..local-test`.

`openpnp-dev-setup` is idempotent per-PC setup: it symlinks the personal `CLAUDE.md` and `notes/`
into the fork tree and adds them to `.git/info/exclude`, so they can never reach a commit or a PR.
`pr-preflight` is the matching gate before submitting: branch name, base, and cleanliness checks
against the upstream checklist. Both are described in
[OpenPnP Dev Guidelines](openpnp-dev/OpenPnP_Dev_Guidelines.md).

## Measuring Bottom Vision

`bv-analyze` exists because bottom vision values kept getting set by eye with nothing to say
whether the part actually survived the mask or the threshold. It reports what is really in a
capture — how bright the part is, how bright the nozzle tip is, where the overhead lights land —
so pipeline values come from measurement.

With no arguments it analyses the newest `bv_source_*.png`. Every alignment writes one (the
`ImageWriteDebug` stage in each pipeline), so the usual workflow is: run an alignment in OpenPnP,
then run this.

```sh
bv-analyze                                  # census of the newest capture
bv-analyze config/snapshots/Bottom_….png    # or a specific image
```

The census prints a radial H/S/V and grayscale profile, a zone summary, and a count of bright
pixels by distance from centre at several candidate thresholds — which is what answers *"what
threshold admits the part but not the nozzle tip?"*. Default zone radii suit a ~1.6 mm part on an
N045 tip; override with `--zones` and `--bands`.

`--simulate` replays `BVS_Stock`'s threshold chain (blur → `MaskCircle` → `partmask` → `MaskHsv` →
gray → `Threshold` → contours → `MinAreaRect`) for candidate values and prints the fitted
rectangle, so settings can be compared before spending bench picks:

```sh
bv-analyze --simulate --threshold 99                       # as shipped
bv-analyze --simulate --partmask 120 --threshold 60        # candidate
bv-analyze --simulate --partmask 120 --threshold 60 \
           --hsv 60,140,170,255,0,255                      # plus a saturation floor
```

Colour handling matches the pipeline exactly: `HSV_FULL` (hue 0–255), BGR order, and `MaskHsv`
bounds that are inclusive and blacken pixels *inside* the range, wrapping through 0 when
`hueMin > hueMax`.

Two limits are deliberate. `MinAreaRect` here is a plain `cv2.minAreaRect`, without OpenPnP's
`expectedAngle`/`searchAngle` and per-edge logic — sizes and centres are comparable, a wild angle
is not. And `DetectRectlinearSymmetry` is **not** simulated; it is a large algorithm and
reproducing it faithfully would be its own project, so symmetry pipelines are evaluated at the
bench instead.

Pixel values are the native unit of every pipeline stage; `--upp` (default 0.036173 mm/px, the
bottom camera's geometric mean from `machine.xml`) is what converts them to millimetres. See
[Bottom Vision Pipelines](Bottom-Vision-Pipelines.md) and
[OpenPnP Vision Concepts](OpenPnP-Vision-Concepts.md).

## Python With uv

`bv-analyze` is Python; the rest are `sh`. The system interpreter is `EXTERNALLY-MANAGED` with no
`pip`, so the script declares its own dependencies inline ([PEP 723](https://peps.python.org/pep-0723/))
and runs under [uv](https://docs.astral.sh/uv/):

```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "opencv-python"]
# ///
```

Running the script is all that is needed — uv resolves and caches the environment on first run
(the first one downloads ~70 MB of OpenCV), and there is no virtualenv to create or activate.
This is the pattern to copy for any future Python tool here. It requires `uv` on `PATH`
(`~/.local/bin/uv`).

## Measuring Vacuum

`vacuum-log` exists because OpenPnP's Part Detection graph shows one pick at a time, forgets it on
the next, and hides the part-off probe entirely when Establish Level is off. The log keeps every
sample. With no arguments it reads `config/log/OpenPnP.log` and prints one line per burst of
vacuum reads: which sensor (from the I²C multiplexer channel), the nozzle event that preceded it,
sample count and rate, first/last/extreme level, time to settle within 100 counts, and any
out-and-back spikes, classified as torn reads or pneumatic.

```sh
vacuum-log                                     # every run in the current log
vacuum-log config/log/OpenPnP.3.log            # an older log
vacuum-log --messages                          # OpenPnP's "outside PartOn range" lines
vacuum-log --csv 10:22:15.765 > stuck.csv      # one run as t_ms,value
```

It reads both the old one-byte (`bytes:1`) and current two-byte (`bytes:2`) reads. The log level
must be TRACE for the `actuatorRead` lines to be there. See [Vacuum Sensing](Vacuum-Sensing.md).

