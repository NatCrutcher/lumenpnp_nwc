# OpenPnP Development Guidelines

Rules for any work in `~/dev/openpnp_src` (my fork of
[openpnp/openpnp](https://github.com/openpnp/openpnp)). Part one summarizes the upstream
maintainers' expectations; part two is my own discipline layered on top. Follow both for
every change intended for a pull request.

Upstream sources (authoritative — reread before submitting anything):
- `openpnp_src/CONTRIBUTING.md`
- `openpnp_src/PULL_REQUEST_TEMPLATE.md` (mandatory PR structure)
- [Wiki: Developers Guide](https://github.com/openpnp/openpnp/wiki/Developers-Guide)
- [Wiki: Your First Pull Request](https://github.com/openpnp/openpnp/wiki/Your-First-Pull-Request)
- [Google Java Style](https://google.github.io/styleguide/javaguide.html)

## Part 1 — Upstream expectations

### Branch and PR mechanics
- **Base and target every PR on the `test` branch**, not `main`. (The PR template still
  mentions `develop`; that branch no longer exists — `test` is authoritative per the wiki.)
- Fork-and-pull: work in the fork (`origin` = NatCrutcher/openpnp), PR to
  `upstream` = openpnp/openpnp.
- **One small feature or one bug fix per PR.** Reference the related issue number.
- Fill the mandatory PR template completely: **Description**, **Justification**,
  **Instructions for Use** (this text becomes wiki documentation — write it for end users),
  **Implementation Details**.
- Add an entry to `CHANGES.md` (the repo's `git-hooks/pre-commit` enforces this; install it).

### What gets accepted
- **No machine-specific or highly individual code.** Changes must be generally useful.
  LumenPnP-motivated changes must be framed and implemented generically.
- Prefer adding new subclasses of `Reference*` classes over modifying core behavior.
- Changes to `org.openpnp.spi` or `org.openpnp.model` need extra justification — these define
  OpenPnP's contracts.
- **Discuss first**: anything touching core or reference functionality should be raised on the
  [Google Group](https://groups.google.com/group/openpnp) before writing code.
- **Tests are required.** "Untested code will not be accepted." JUnit 5 tests live in
  `src/test/java`; fixtures under `src/test/resources/config` and `.../samples`.
- Licensing is GPL; contributions must be license-compatible.

### Coding style
- Google Java Style, applied with `openpnp_src/OpenPnP_Eclipse_Formatter.xml`.
- **Always use braces**, even for single-statement if/for bodies.
- Follow the existing naming conventions for variables and classes.
- **Never reformat unrelated code** — format only lines you actually change, so diffs stay
  reviewable. Nonconforming code will be reformatted or rejected by maintainers.
- LF line endings (enforced by `.gitattributes`).

### Build and test
```bash
mvn test                 # full test suite — must pass before any PR
mvn package              # build the distributable jar
```
- CI runs `mvn -q -B test` across a Java version matrix. The wiki recommends JDK 8+; I build
  with JDK 17/21 (installed per LumenPnP-Pick-and-Place-Notes.md).
- Manual testing against a clean config: run with `-DoverrideUserConfig=true` and the sample
  `pnp-test.job.xml` rather than my live machine config.
- My live machine config lives in `~/dev/lumenpnp_nwc/config` — never point a development
  build at it unless deliberately testing against real hardware.

## Part 2 — My discipline

### Feature branches (strict)
- **Every change lives on its own branch**, named `feature/<topic>` or `fix/<topic>`,
  **cut from `upstream/test`**:
  ```bash
  git fetch upstream
  git checkout -b fix/short-topic upstream/test
  ```
- **Never commit to local `main` or `test`.** They exist only to track upstream.
- One PR-sized concern per branch. If work grows, split the branch.
- Rebase onto `upstream/test` before submitting; keep history clean (squash fixups).
- To run several of my changes together on the machine, merge feature branches into a
  throwaway `local-integration` branch. That branch is never pushed and never becomes a PR.
- Note: the tag `2.6` (`5bd404c`) matches my installed jar and is what I read when studying
  behavior of the running machine; **development happens against `test`**, which may differ.

### Personal-content firewall
These must never appear in a feature branch or PR:
- `CLAUDE.md`, `.claude/`, `notes/`, `*.plan.md`, or any personal notes/plans
- Anything referencing my machine specifics, paths, or config

Protection is layered:
1. *Structural*: those files are untracked and listed in `openpnp_src/.git/info/exclude`
   (set up by `lumenpnp_nwc/bin/openpnp-dev-setup`), so they can't be committed without a
   deliberate `git add -f`. Their canonical home is `lumenpnp_nwc/docs/openpnp-dev/`,
   which is synced to GitHub — nothing important lives only on one PC.
2. *Verified*: run `lumenpnp_nwc/bin/pr-preflight` from the feature branch before opening a
   PR. It fails if the diff against `upstream/test` contains any firewalled path, and warns
   if `CHANGES.md` is untouched.

### Pre-PR checklist
- [ ] Branch cut from and rebased onto current `upstream/test`
- [ ] One concern only; issue referenced
- [ ] Core/`spi`/`model` changes pre-discussed on the Google Group
- [ ] `mvn test` passes
- [ ] JUnit tests added for the change
- [ ] `CHANGES.md` entry added
- [ ] Formatter applied to touched code only; braces everywhere; no unrelated reformatting
- [ ] `bin/pr-preflight` passes
- [ ] PR template filled: Description, Justification, Instructions for Use, Implementation Details
- [ ] Cross-link my tracking issue in `lumenpnp_nwc`
