# SwapOpt V4 — Public Architecture Overview

This document is a sanitized architecture overview intended for the public showcase repository.

## Architectural Goal

SwapOpt is designed as a browser-first career operating system with backend-owned intelligence.

The main engineering objectives are:

- keep the Chrome Extension lightweight;
- centralize business rules and AI orchestration in backend services;
- preserve structured application and outcome history;
- reuse existing modules instead of duplicating intelligence;
- maintain clear boundaries between deterministic logic and AI-generated output;
- keep sensitive candidate data out of public source control.

## High-Level Topology

```text
Chrome Extension
      │
      │ HTTPS / JSON APIs
      ▼
Backend API
      │
      ├─ request validation
      ├─ controllers
      ├─ authorization / ownership boundaries
      └─ response formatting
      │
      ▼
Business Services
      │
      ├─ Job Intelligence
      ├─ Career Evidence
      ├─ Career Outcome Engine
      ├─ ATS Intelligence
      ├─ Application Assistance
      ├─ Application Lifecycle
      ├─ Market Intelligence
      ├─ Personal Learning
      └─ Career Learning Loop
      │
      ▼
Persistence + External Providers
```

## Core Boundaries

### Chrome Extension

Responsible for:

- capturing user actions;
- extracting visible job/application context;
- rendering structured backend results;
- presenting progress, success, and errors;
- browser-specific interaction.

It should not own:

- OpenAI credentials;
- prompt construction;
- complex recommendation rules;
- durable application intelligence;
- sensitive backend-only logic.

### Backend

Responsible for:

- validation;
- business rules;
- AI orchestration;
- persistence;
- application lifecycle logic;
- ATS intelligence;
- career evidence;
- outcome learning;
- market intelligence;
- integrations.

## Decision Flow

```text
Observed Job
    ↓
Current Verified Evidence
    ↓
Job Requirement Analysis
    ↓
Historical Outcome Context
    ↓
Recommendation
    ↓
Apply / Tailor / Save / Skip
```

Historical data is used conservatively. Current explicit evidence always takes precedence over weak historical patterns.

## Evidence Flow

The Career Evidence layer distinguishes:

- user-confirmed evidence;
- verified-source evidence;
- observed market evidence;
- derived evidence.

Observed job requirements never become candidate skills simply because a job description mentioned them.

## Application Flow

```text
Decision
   ↓
Application Preparation
   ↓
ATS Assistance
   ↓
Explicit User Submission
   ↓
Application Lifecycle
   ↓
Interview / Offer / Rejection / Withdrawal
```

SwapOpt does not autonomously submit job applications.

## Learning Flow

```text
Recommendation
      ↓
User Behavior
      ↓
Application Outcome
      ↓
Audit
      ↓
Personal Learning
      ↓
Future Decision Context
```

The system treats conversion patterns as associations rather than causal proof.

## Cost Discipline

Deterministic logic is preferred when the answer can be calculated from stored evidence.

AI calls are reserved for tasks that benefit from language understanding, reasoning, or generation.

## Public / Private Boundary

The public repository must not include:

- personal resumes;
- candidate master profiles;
- application answers;
- demographic information;
- secrets or tokens;
- private application history;
- private outcome history;
- local database files;
- recovery backups.

The public showcase demonstrates architecture and product engineering without exposing user-owned career data.


## Final Private Runtime — V29/V30 Additions

The private final runtime extends the public architecture shown above with additional evidence and lifecycle systems that are described here but are not fully mirrored into this sanitized repository.

### Opportunity Discovery and Role Identity

Public job observations flow through explicit source contracts and canonicalization before becoming role evidence.

```text
Public Source
   ↓
Observation
   ↓
Canonical Opportunity
   ↓
Role Identity
   ↓
Candidate ↔ Role Comparison
   ↓
Opportunity Intelligence / Queue
```

Role Identity preserves source provenance, explicit requirements, grouped alternatives, unknowns, and revision history rather than reducing a role to one opaque score.

### Longitudinal Candidate Identity

Candidate Identity composes verified career evidence and correction history into a revisioned view suitable for downstream comparison.

Only decision-eligible evidence enters matching. Archived or unsupported claims may remain visible in history without becoming active capability evidence.

### Network DNA

Exact visible professional-profile/job references can become owner-scoped network evidence and bounded network context.

Network evidence is secondary to factual role fit and must not imply:

- referral willingness;
- hiring authority;
- relationship strength beyond evidence;
- autonomous outreach.

### Explicit Interview / Offer Lifecycle

The final V29 lifecycle introduces typed lifecycle events with scheduled, occurred, and outcome timestamps.

Key semantics:

```text
scheduled != occurred
canceled != occurred
accepted offer != placement
direct offer does not require an invented interview
correction/revocation remain visible
```

### V30 Product Proof

V30 connects exact references across the journey where evidence exists:

```text
Opportunity
  → Decision
  → Application / Action
  → Interview
  → Outcome
  → Evidence
  → Review Proposal
```

Sparse journeys remain sparse.

Metrics preserve denominators and unknown populations. Outcome associations remain observational and use `causalClaim=false`.

See [Technical Blueprint](TECHNICAL_BLUEPRINT.md), [Function Map](FUNCTION_MAP.md), and [Release Evidence](RELEASE_EVIDENCE.md).
