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
  `upstream` = openpnp/openpnp. I have no write access upstream, and as a hard guard the
  `upstream` remote's push URL is set to the invalid value `DISABLED` (2026-08-30), with
  `remote.pushDefault = origin` — so any `git push`, bare or explicit, can only ever reach
  the fork. (Config is shared by the local-test worktree.) Restore with
  `git remote set-url --push upstream https://github.com/openpnp/openpnp` if ever needed.
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
mvn package              # build the distributable jar (target/openpnp-gui-*.jar + target/lib/)
```
- No system Maven: use `~/opt/maven/bin/mvn` (Maven 3.9.16, symlink → `~/opt/apache-maven-3.9.16`).
- CI runs `mvn -q -B test` across a Java version matrix. The wiki recommends JDK 8+; I build
  with the system JDK 21 (installed per LumenPnP-Pick-and-Place-Notes.md).
- Running a built jar directly needs the stock launcher's module flags on JDK 9+, or startup
  fails in `Main.monkeyPatchBeansBinding` with `InaccessibleObjectException`:
  `--add-opens=java.base/java.lang=ALL-UNNAMED --add-opens=java.desktop/java.awt=ALL-UNNAMED
  --add-opens=java.desktop/java.awt.color=ALL-UNNAMED` (`bin/pnptest` supplies them).
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
- **Back up finished feature branches to the fork** so they survive a dead PC:
  ```bash
  git push origin feature/short-topic
  ```
  Pushing a branch to the fork does *not* open a PR or notify upstream — it just stores
  it on NatCrutcher/openpnp (ignore the "Create a pull request" hint GitHub prints).
  After a rebase, re-push with `git push --force-with-lease origin feature/short-topic`.
  `local-test` stays local-only; run `bin/pr-preflight` before the first push of a branch
  so nothing firewalled leaves the machine.
- To run my changes on the machine, merge feature branches into `local-test` (see below).
  That branch is never pushed and never becomes a PR.
- Note: the tag `2.6` (`5bd404c`) matches the stock v2.6 install and is what I read when
  studying 2.6 runtime behavior; **development happens against `test`**, which may differ.

### Local test install

My daily-driver OpenPnP is a self-built version: a reviewed `upstream/test` base plus my
feature branches. Set up 2026-08-30 after bench-verifying the zoom/pan build.

- **Branch `local-test`** — pinned to a reviewed `upstream/test` commit, with feature
  branches merged in via `git merge --no-ff feature/<topic>`. Never pushed, never a PR.
  Like `main`/`test`, never commit work directly to it — only merges land there.
- **Worktree `~/dev/openpnp_local-test`** — permanent checkout of `local-test`
  (`git worktree add`), so `~/dev/openpnp_src` stays free for feature-branch work without
  ever touching what the machine runs.
- **Deployed install `~/openpnp/local-test/`** — jar + `lib/` + `BUILD.txt` copied out of
  the worktree by `bin/openpnp-deploy` (refuses a dirty or wrong-branch worktree, runs the
  full `mvn package` with tests). Rebuilds in either checkout can't disturb it; it changes
  only on deliberate redeploy.
- **Launchers** (both use the live config `~/dev/lumenpnp_nwc/config`):
  - `bin/pnptest` — the deployed local-test build (prints `BUILD.txt` on start; passes the
    `--add-opens` flags the stock launcher uses, required on JDK 9+).
  - `bin/pnp26` — the stock v2.6 install at `~/openpnp/v2.6`, kept as fallback.
- **Advancing the upstream base** is deliberate, never automatic:
  ```bash
  git fetch upstream
  bin/openpnp-changes 2.6 upstream/test   # review what would come in
  cd ~/dev/openpnp_local-test && git merge upstream/test && openpnp-deploy
  ```
- **`bin/openpnp-changes [FROM] [TO]`** (default `2.6..local-test`) — concise review list:
  the CHANGES.md bullets added between the refs, then the `--first-parent` one-line commit
  list (one line per merged PR).
- Rollback is `pnp26`; a bad deploy is fixed by `git -C ~/dev/openpnp_local-test reset
  --hard <good-merge>` and redeploying.

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
