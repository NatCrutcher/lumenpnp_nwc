# Figure Data Sources

Each CSV is one burst of vacuum reads, exported from a (gitignored) OpenPnP log with
`bin/vacuum-log <log> --csv HH:MM:SS`. `t_ms` is relative to the first read of the run.
Log file numbers are as of 2026-09-11; OpenPnP renumbers them as it rotates.

| CSV | Log date | Start | Read | What |
|---|---|---|---|---|
| `old_n045_pick_a` | 2026-09-03 | 17:52:18.525 | one byte | N045 pick, 400 ms dwell |
| `old_n045_pick_b` | 2026-08-24 | 21:27:52.322 | one byte | N045 pick, 400 ms dwell |
| `old_n045_pick_c` | 2026-08-24 | 21:28:06.735 | one byte | N045 pick, 400 ms dwell |
| `old_n045_pick_d` | 2026-08-24 | 21:47:27.132 | one byte | N045 pick, 400 ms dwell |
| `old_n045_pick_e` | 2026-08-23 | 14:59:39.916 | one byte | N045 pick, 400 ms dwell |
| `n045_open` | 2026-09-10 | 17:54:10.150 | two bytes, free-running | N045/N1 pick, no part, 2 s |
| `n045_0402` | 2026-09-10 | 17:58:35.015 | two bytes, free-running | N045/N1 pick, 0402, 2 s |
| `n045_0603` | 2026-09-10 | 18:02:18.939 | two bytes, free-running | N045/N1 pick, 0603, 2 s |
| `n24_open` | 2026-09-10 | 18:10:43.065 | two bytes, free-running | N24/N2 pick, no part, 2 s |
| `n24_k05` | 2026-09-10 | 18:05:53.186 | two bytes, free-running | N24/N2 pick, k05 (VQFN-24), 2 s |
| `n045_partoff_stuck_0402` | 2026-09-11 | 10:22:15.765 | two bytes, triggered | N045 part-off probe, 0402 stuck |
| `n045_partoff_open_a` | 2026-09-11 | 10:25:18.399 | two bytes, triggered | N045 part-off probe, no part |
| `n045_partoff_open_b` | 2026-09-11 | 10:33:10.104 | two bytes, triggered | N045 part-off probe, no part |

"Free-running" runs predate the triggered read and contain a few torn reads (256-count blips).
The last row of each part-off CSV is the one read OpenPnP takes after closing the valve.
