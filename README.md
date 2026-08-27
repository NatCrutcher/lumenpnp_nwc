# lumenpnp_nwc

Nathaniel W. Crutcher - Broomfield, Colorado, USA

This is my personal repo for my [LumenPnP](https://opulo.io/) (v4.1) pick-and-place machine, my
[OpenPnP](https://openpnp.org/) 2.6 configuration, plus field notes, tuning lessons, printable accessories, and an issue tracker for everything I want to fix, tune, or contribute upstream.

This is primarily for me, but I hope it may be of some value to others and some of it may turn into
contributions to OpenPnP and Opulo. I'm using AI to help.

> ⚠️ The XML under `config/` is **my machine's** live config. Offsets, calibration values,
> and positions are specific to my unit — treat them as examples, do not use them directly on your machine.

## Layout

| Path | What |
|---|---|
| `config/` | OpenPnP config (machine.xml, parts, packages, vision settings, scripts) |
| `docs/` | Notes and guides (see below) |
| `cad/` | 3D printable accessories (strip feeders, wire guide, adjustable legs) |
| `jobs/` | My OpenPnP job files |
| `bin/` | Helper scripts, incl. the OpenPnP fork dev-setup and PR preflight |

## Docs

- [LumenPnP Pick and Place Notes](docs/LumenPnP-Pick-and-Place-Notes.md) — install, calibration, feeders, fixes, enhancement ideas
- [LumenPnP 4.1 Setup Checklist](docs/lumenpnp-4.1-setup-checklist.md)
- [Nozzle Setup](docs/NozzleSetup.md) · [ReferenceStripFeeder](docs/ReferenceStripFeeder.md)
- [Issue Tracking](docs/Issue-Tracking.md) — how the [Issues](https://github.com/NatCrutcher/lumenpnp_nwc/issues) here are organized (they span LumenPnP hardware, my config, and OpenPnP software)
- [OpenPnP Dev Guidelines](docs/openpnp-dev/OpenPnP_Dev_Guidelines.md) — rules for my OpenPnP fork work and selective upstream PRs
- [Config Tutorial Capture](docs/Config-Tutorial-Capture.md) — method for turning the config git history into a tuning tutorial

## License

Code and scripts are under the [MIT License](LICENSE). Documentation (`docs/`) is under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — share and adapt with attribution.
