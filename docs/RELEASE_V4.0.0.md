# SwapOpt V4.0.0 - Public Engineering Snapshot

SwapOpt V4 reframes the project from a collection of job-application helpers into a connected career decision and outcome intelligence system.

## Public V4 slice

This release publishes a **curated, sanitized engineering snapshot** rather than the private runtime environment.

The public implementation demonstrates:

- provenance-aware Career Evidence Graph services;
- Career Outcome Engine logic;
- recommendation and decision-learning audits;
- Personal Learning services;
- Market Intelligence normalization, aggregation, and strategy;
- application behavior intelligence;
- repository and ownership boundaries;
- deterministic validation and privacy checks.

## Quality gate

The public V4 showcase includes a GitHub Actions workflow that runs:

- public repository/privacy verification;
- JavaScript syntax checks for the curated backend slice;
- 24 representative V4 tests covering outcome intelligence, learning-loop behavior, market intelligence, personal market strategy, repository ownership, and bounded/causality-safe analytics.

## Product principles represented here

- Truthfulness is a hard constraint.
- Historical outcomes are observational evidence, not causal proof.
- Explicit current blockers remain authoritative.
- The Chrome Extension is a client; business intelligence belongs in backend services.
- Deterministic logic is preferred where additional model calls are unnecessary.
- Job submission remains explicitly user-controlled.

## Public/private boundary

Not included in this release:

- personal candidate profiles;
- resumes;
- demographic or EEO answers;
- application-history records;
- private outcome history;
- OAuth tokens or API secrets;
- local databases/runtime state;
- recovery backups;
- internal batch payloads.

The public repository is intended to demonstrate product architecture, engineering discipline, and selected V4 implementation concepts without publishing user-owned career data.

## Historical documentation

The original V1 design report remains in the repository as historical documentation and is explicitly separated from the current V4 architecture.
