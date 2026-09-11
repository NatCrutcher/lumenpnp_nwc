#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["matplotlib"]
# ///
"""Regenerate the figures in docs/Vacuum-Sensing.md from the CSVs in data/.

The CSVs are single vacuum-sample runs exported from OpenPnP logs with
`bin/vacuum-log LOG --csv HH:MM:SS` (the logs themselves are gitignored).
Sources are listed in data/SOURCES.md.
"""

import csv
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")

# Reference palette (dataviz skill), light mode: categorical slots 1-3 validate all-pairs.
SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK_2 = "#52514e"
GRID = "#e4e3df"
BAND = "#f0efec"
OPEN = "#2a78d6"     # slot 1, blue
SMALL = "#eb6834"    # slot 2, orange
LARGER = "#1baf7a"   # slot 3, aqua

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 9.5,
    "axes.edgecolor": GRID, "axes.labelcolor": INK_2, "axes.titlecolor": INK,
    "axes.titlesize": 11, "axes.titleweight": "bold", "axes.titlelocation": "left",
    "xtick.color": INK_2, "ytick.color": INK_2, "axes.grid": True, "grid.color": GRID,
    "grid.linewidth": 0.8, "figure.facecolor": SURFACE, "axes.facecolor": SURFACE,
    "legend.frameon": False, "lines.linewidth": 2, "lines.solid_capstyle": "round",
})


def load(name):
    with open(os.path.join(DATA, name + ".csv")) as f:
        rows = list(csv.DictReader(f))
    return [float(r["t_ms"]) for r in rows], [int(r["value"]) for r in rows]


def clean(ax):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.tick_params(length=0)


def end_label(ax, x, y, text, color):
    """Direct label at a line's end, in text ink with a colored key mark."""
    ax.plot([x + 25], [y], marker="s", markersize=6, color=color, clip_on=False)
    ax.text(x + 55, y, text, va="center", ha="left", color=INK, fontsize=9)


def before_after():
    fig, (old, new) = plt.subplots(1, 2, figsize=(11, 4.3), gridspec_kw={"width_ratios": [1, 1.5]})

    # --- Before: what OpenPnP saw with the one-byte read ---------------------
    old.axhspan(215, 232, color=BAND, zorder=0)
    old.text(12, 223.5, "PartOn range\n215 … 232", color=INK_2, fontsize=8.5, va="center")
    for name in "abcde":
        t, v = load("old_n045_pick_" + name)
        # Leading zeros are atmosphere read through a wrapping byte (0 -> 255), so the
        # line starts at the first non-zero reading; the caption says so.
        first = next(i for i, x in enumerate(v) if x)
        old.plot(t[first:], v[first:], color=OPEN, alpha=0.85, drawstyle="steps-post")
    old.axvline(400, color=INK_2, linestyle=(0, (3, 3)), linewidth=1)
    old.text(395, 253.5, "pick dwell ends:\nstill falling", ha="right", va="top", color=INK_2, fontsize=8.5)
    old.set_ylim(205, 257)
    old.set_xlim(0, 500)
    old.set_title("Before: one byte")
    old.set_xlabel("ms after valve on")
    old.set_ylabel("reading as OpenPnP saw it")
    old.text(0, -0.2, "N045, five picks, Aug–Sep 2026. Each read 0\nuntil the pump started, then jumped to 255:\nthe byte wraps at atmosphere (not drawn).",
             transform=old.transAxes, color=INK_2, fontsize=8, va="top")
    clean(old)

    # --- After: the same tip with the two-byte read --------------------------
    new.axhspan(-7900, -6050, color=BAND, zorder=0)
    new.text(1990, -6120, "PartOn range −7900 … −6050", color=INK_2, fontsize=8.5, ha="right", va="top")
    new.axhline(-7390, color=INK_2, linestyle=(0, (3, 3)), linewidth=1)
    new.text(1990, -7450, "finger over the tip: −7390", color=INK_2, fontsize=8.5, ha="right", va="top")
    series = [("n045_open", "no part", OPEN), ("n045_0402", "0402", SMALL), ("n045_0603", "0603", LARGER)]
    for name, label, color in series:
        t, v = load(name)
        new.plot(t, v, color=color, label=label)
        tail = sum(v[-20:]) / 20
        end_label(new, 2000, tail, "%s  %d" % (label, round(tail, -1)), color)
    new.set_xlim(0, 2000)
    new.set_ylim(-8100, 600)
    new.set_title("After: two bytes")
    new.set_xlabel("ms after valve on")
    new.set_ylabel("counts (more vacuum = more negative)")
    new.legend(loc="upper right", ncols=3, handlelength=1.5, fontsize=8.5, labelcolor=INK)
    new.text(0, -0.2, "N045 on N1, 2 s dwell, 2026-09-10. The small blips are torn reads,\n"
             "since fixed by triggering each conversion (see Torn Reads).",
             transform=new.transAxes, color=INK_2, fontsize=8, va="top")
    clean(new)

    fig.subplots_adjust(left=0.07, right=0.86, top=0.9, bottom=0.27, wspace=0.3)
    fig.savefig(os.path.join(HERE, "vacuum-before-after.png"), dpi=160)


def part_off_probe():
    fig, ax = plt.subplots(figsize=(8.5, 4.2))
    ax.axhspan(-5600, 600, color=BAND, zorder=0)
    ax.text(530, -300, "PartOff range −5600 … 500: pass", color=INK_2, fontsize=8.5, ha="right", va="center")
    ax.axhline(-5600, color=INK_2, linewidth=1)

    runs = [("n045_partoff_open_a", OPEN, None), ("n045_partoff_open_b", OPEN, "no part (two probes)"),
            ("n045_partoff_stuck_0402", SMALL, "0402 stuck on the tip")]
    for name, color, label in runs:
        t, v = load(name)
        # The final row is the one read OpenPnP takes after closing the valve;
        # the decision is the last valve-open sample before it.
        ax.plot(t[:-1], v[:-1], color=color, label=label)
        ax.plot([t[-2]], [v[-2]], marker="o", markersize=8, color=color,
                markeredgecolor=SURFACE, markeredgewidth=2, zorder=5)
    ax.annotate("decision: −6094\n→ “Part vacuum-detected\n    on nozzle after place”",
                xy=(507, -6094), xytext=(330, -7350), color=INK, fontsize=8.5,
                arrowprops=dict(arrowstyle="-", color=INK_2, linewidth=1))
    ax.annotate("decision: −5095, −5080\n→ pass", xy=(505, -5090), xytext=(345, -4350),
                color=INK, fontsize=8.5, arrowprops=dict(arrowstyle="-", color=INK_2, linewidth=1))
    ax.annotate("sealed tip: vacuum\nwithin ~20 ms", xy=(25, -400), xytext=(40, -5300),
                color=INK_2, fontsize=8.5, arrowprops=dict(arrowstyle="-", color=INK_2, linewidth=1))
    ax.annotate("open tip: ~85 ms", xy=(88, -150), xytext=(120, -700),
                color=INK_2, fontsize=8.5, arrowprops=dict(arrowstyle="-", color=INK_2, linewidth=1))
    ax.set_xlim(0, 540)
    ax.set_ylim(-7800, 600)
    ax.set_title("The Part-Off Probe")
    ax.set_xlabel("ms after the valve reopens (nozzle at safe Z after a place)")
    ax.set_ylabel("counts")
    ax.legend(loc="lower left", fontsize=8.5, labelcolor=INK)
    clean(ax)
    fig.subplots_adjust(left=0.1, right=0.97, top=0.9, bottom=0.14)
    fig.savefig(os.path.join(HERE, "vacuum-part-off-probe.png"), dpi=160)


if __name__ == "__main__":
    before_after()
    part_off_probe()
    print("wrote vacuum-before-after.png, vacuum-part-off-probe.png")
