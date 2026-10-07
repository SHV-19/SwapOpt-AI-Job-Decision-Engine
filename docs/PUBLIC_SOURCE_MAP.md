# Public V4 Source Map

This repository publishes a deliberately limited V4 implementation slice.

It is **not** a mirror of the private SwapOpt runtime.

## Included V4 intelligence

The Phase 2 public slice contains 30 production source files and 5 representative test files taken from the sanitized V4 candidate generated on 2026-08-17.

The included dependency-complete slice covers:

- Career Evidence foundations, provenance, claim policy, graph construction, and query boundaries
- Career Outcome Engine and outcome intelligence
- Decision Learning Loop intelligence and service orchestration
- Personal Learning
- Personal Market Intelligence normalization and strategy
- application behavior intelligence
- adaptive job-analysis policy
- the repository, identity, validation, and utility boundaries required by those services

The selected modules retain their V4 paths under `backend/` so the public code reflects the production architecture instead of being rewritten as standalone examples.

## Intentionally excluded

The following remain outside the public implementation:

- candidate profile and resume data
- application history and private outcome records
- provider credentials, OAuth state, and API secrets
- browser runtime state
- batch/fix backups and installer artifacts
- internal Brain documents
- provider-specific ATS answer policy that can encode sensitive candidate preferences
- private application-answer data
- full Chrome automation runtime
- full provider integration/runtime configuration

## Why ATS implementation is not in this slice

The V4 candidate contains ATS logic that can mix reusable provider behavior with candidate-specific answer policy. Publishing that layer without a deeper separation would risk exposing sensitive application preferences.

The public README can describe ATS Intelligence as a product capability, but this source snapshot deliberately withholds the provider-specific answer catalog until the reusable platform behavior is cleanly separable from private candidate policy.

## Representative validation

The public CI executes five V4 test files:

```text
tests/unit/services/application-behavior-intelligence.test.js
tests/unit/services/career-learning-loop-intelligence.test.js
tests/unit/services/career-outcome-engine-service.test.js
tests/unit/services/market-intelligence-service.test.js
tests/unit/services/personal-market-strategy.test.js
```

At Phase 2 review time these tests passed **24/24** under Node.js 22.16.0.

The public boundary verifier also blocks known private source paths, owner-specific private source markers, hard-coded EEO answers, candidate-specific race-order policy, and common credential/token formats.

## Source provenance

Candidate metadata recorded:

```text
Source repository HEAD:
12a21711dab375ad4b4ebf108263380237222643

Public showcase HEAD before Phase 2:
2156a8fe135de06efc6e14bb214f97f8943aaead
```

The source candidate explicitly recorded that the private V4 working tree contained local changes. This public slice therefore represents the reviewed filesystem state of that candidate, not a claim that every included file existed in the source repository's HEAD commit.


## Final release relationship

The public implementation slice documented above remains a reviewed, sanitized snapshot and should not be confused with the complete private runtime.

The private production runtime continued evolving after the 2026-08-17 public-source candidate and reached its consolidated final V29 + V30 release on 2026-10-06.

Private final release checkpoint:

```text
aec44add07f2bae018e52aa49da8f780a2661a28
feat(v30): release interview lifecycle and product proof
```

Private final release validation:

```text
3,244 / 3,244 automated tests passed
0 failures
0 skipped
0 cancelled
24 modules / 257 validated registry paths
manual browser/runtime acceptance passed
```

These numbers are **release evidence for the private runtime**, not the test count of this public source snapshot.

The public repository intentionally describes additional final capabilities — including Opportunity Discovery, Role Identity, longitudinal Candidate Identity, Network DNA, explicit interview/offer lifecycle, and V30 Product Proof — without publishing private personal data or claiming that every corresponding production source file is public.

See [Release Evidence](RELEASE_EVIDENCE.md) for the exact distinction.
