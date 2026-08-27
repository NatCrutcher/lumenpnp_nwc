# OpenPnP fork working tree

This is my fork of openpnp/openpnp. `origin` = NatCrutcher/openpnp, `upstream` = openpnp/openpnp.

RULES — read ~/dev/lumenpnp_nwc/docs/openpnp-dev/OpenPnP_Dev_Guidelines.md before changing code:

- Every change on a `feature/<topic>` or `fix/<topic>` branch cut from `upstream/test`.
  Never commit to local `main` or `test`.
- PRs target upstream `test`. One concern per PR. `mvn test` must pass; JUnit tests required;
  add a `CHANGES.md` entry; fill the PR template (PULL_REQUEST_TEMPLATE.md) completely.
- Google Java Style via OpenPnP_Eclipse_Formatter.xml; always use braces; never reformat
  unrelated code.
- No machine-specific code upstream; prefer new `Reference*` subclasses; `org.openpnp.spi`
  and `org.openpnp.model` changes need pre-discussion on the OpenPnP Google Group.
- Firewall: CLAUDE.md, .claude/, notes/, *.plan.md are untracked (via .git/info/exclude) and
  must never enter a commit or PR. Canonical copies live in lumenpnp_nwc/docs/openpnp-dev/.
- Before any PR: run ~/dev/lumenpnp_nwc/bin/pr-preflight from the feature branch.
- Tag 2.6 (5bd404c) matches my installed jar — read it for runtime behavior; develop against
  `upstream/test`.
