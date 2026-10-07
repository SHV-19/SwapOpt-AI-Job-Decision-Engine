# SwapOpt — Product Case Study

## The problem

Job search looked like a search problem, but the harder problem was repeatedly making the same decisions:

- Is this role actually worth pursuing?
- Which requirements are supported by real evidence?
- What is missing versus genuinely contradicted?
- Is tailoring worth the effort?
- Which parts of a resume can be emphasized without inventing experience?
- Does networking deserve extra time?
- What happened after applying?
- What should an interview, rejection, withdrawal, or offer teach the system?
- How can prior outcomes inform future choices without pretending correlation is causation?

Most tools solve one fragment: discovery, resume generation, tracking, or autofill. SwapOpt was built as a connected system for one user's full decision loop.

## Product thesis

**Optimize decision quality, not application volume.**

SwapOpt is a local-first AI career operating system that connects verified career evidence, opportunity intelligence, application execution, lifecycle history, and outcome learning.

```text
Career Evidence
      ↓
Opportunity
      ↓
Decision
      ↓
Action
      ↓
Application
      ↓
Interview / Offer / Rejection / Withdrawal
      ↓
Outcome Evidence
      ↓
Review / Learning
      └──────────────► Better Next Decision
```

## Why a generic LLM was not enough

A general-purpose model can summarize a job description or rewrite a resume. It does not automatically provide:

- durable candidate identity;
- explicit source provenance;
- correction/revocation history;
- deterministic requirement comparison;
- application state and event history;
- exact outcome denominators;
- safe missing-data semantics;
- persistent product evidence;
- user-controlled review before identity changes.

SwapOpt therefore separates AI generation from authoritative product state.

## Core product systems

### Opportunity and role intelligence

Observed opportunities are normalized into structured evidence. Role Identity preserves explicit requirements, constraints, source sections, unknowns, and provenance.

### Candidate Identity

Candidate Identity is longitudinal and evidence-backed. Verified skills, projects, career evidence, corrections, and archival history remain traceable. Unsupported claims do not silently enter matching.

### Candidate ↔ Role comparison

Comparison is deterministic where possible. Results distinguish concepts such as:

- exact support;
- adjacent support;
- insufficient evidence;
- explicit mismatch;
- unknown.

AI can explain the result, but it does not get to manufacture evidence.

### Truthful application workflows

SwapOpt supports resume tailoring, application-ready documents, cover letters, application answers, interview preparation, and browser assistance while preserving verified facts.

### Network DNA

Exact visible professional-profile/job relationships may become bounded network evidence. Network context can support prioritization, but it does not invent hiring authority, referral intent, or willingness to help.

### Lifecycle intelligence

The final V29 lifecycle models explicit events rather than inferring them from vague status changes.

Examples include:

- recruiter screen scheduled / occurred;
- interview scheduled / occurred / canceled;
- stage entered / completed;
- offer received / revised / accepted / declined / expired;
- rejection;
- withdrawal;
- placement;
- correction;
- revocation.

A scheduled event is not treated as attendance, and offer acceptance is not treated as placement.

### Product proof and learning

V30 connects exact journey references where available:

```text
opportunity
→ decision
→ application/action
→ interview
→ outcome
→ evidence
→ review proposal
```

Sparse journeys stay sparse. Product metrics retain denominators and unknown populations. Strategy remains observational, with `causalClaim=false`.

## Human-control boundary

SwapOpt deliberately does not:

- autonomously submit applications;
- send outreach without explicit user control;
- infer protected demographic attributes;
- ingest private message bodies for hidden inference;
- convert job requirements into candidate qualifications;
- automatically rewrite Candidate Identity from a small number of outcomes.

## Engineering outcome

The private final release passed **3,244 / 3,244 automated tests** across a validated registry of **24 modules / 257 paths**, followed by browser/runtime acceptance for V29/V30.

See [Release Evidence](RELEASE_EVIDENCE.md).

## What I owned

SwapOpt was built through AI-assisted development.

My primary ownership was:

- problem definition;
- product requirements;
- workflow design;
- architecture decisions;
- evidence and truthfulness rules;
- release boundaries;
- debugging and iteration;
- acceptance criteria;
- validation and release execution.

AI accelerated implementation, but it did not decide what evidence should count, what the product was allowed to infer, or when the release was good enough.

## What the project demonstrates

SwapOpt is intended to demonstrate:

- product thinking;
- systems thinking;
- AI judgment;
- analytics and evidence design;
- ability to structure ambiguity;
- iterative debugging;
- release discipline;
- willingness to preserve uncertainty instead of manufacturing confidence.
