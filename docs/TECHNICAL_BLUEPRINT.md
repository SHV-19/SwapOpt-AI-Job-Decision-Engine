# SwapOpt — Technical Blueprint

## High-level architecture

```text
Public Job / Professional Web
            │
            ▼
      Chrome MV3 Extension
  extraction • interaction • UI
            │
         HTTP / JSON
            ▼
        Express API Layer
 validation • routing • context
            │
            ▼
 Business / Intelligence Services
            │
 ┌──────────┼───────────────────────────────────────────┐
 │          │                                           │
 ▼          ▼                                           ▼
Job & Role  Candidate / Evidence                 Application Systems
Intel       Identity                             Documents
Discovery   Matching                             Answers
Queue       Market Intel                         Assistance
Network     Learning                             Tracker/Lifecycle
                                                  Interviews
            │
            ▼
 Persistence / Provenance / Revision History
            │
    ┌───────┴────────┐
    ▼                ▼
 OpenAI          Google / Hunter
```

The public repository exposes a curated source slice. The private runtime contains the complete implementation.

## Architectural boundaries

### Extension

The Chrome extension owns:

- visible-page extraction;
- browser interaction;
- user-triggered actions;
- rendering structured results;
- temporary presentation state.

It does not own:

- provider credentials;
- prompt authority;
- persistent career truth;
- business rules;
- outcome interpretation.

### API layer

The Express API owns:

- route contracts;
- validation;
- repository context;
- response envelopes;
- safe errors;
- service composition.

### Business services

The private final runtime registers 24 modules. Major product domains include:

- opportunity discovery;
- job intelligence;
- profile;
- resume/documents;
- application answers;
- application assistant;
- tracker/lifecycle;
- Gmail OAuth/intelligence;
- calendar;
- network evidence;
- network intelligence;
- networking CRM;
- career development;
- career planning;
- branding;
- interviews;
- market intelligence;
- learning evidence;
- portability;
- extension;
- privacy/security;
- runtime API;
- storage;
- release engineering.

## Evidence-first design

Authoritative state is separated from generated language.

Important invariants:

```text
Requirement evidence -> comparison result -> explanation
                    not
Requirement text -> assumed candidate skill
```

Candidate evidence retains provenance and revisions. Corrections and archival history remain visible rather than being overwritten.

## Deterministic vs AI responsibilities

Deterministic logic is preferred for:

- identity;
- ownership;
- dedupe;
- exact requirement comparison;
- lifecycle semantics;
- denominators;
- revisioning;
- status/event interpretation;
- access control;
- public response contracts.

AI is used when language understanding or generation is valuable:

- job interpretation;
- resume wording;
- cover letters;
- interview preparation;
- structured strategy;
- explanatory synthesis.

Provider output is treated as untrusted until validated.

## Final V29 lifecycle contract

The final lifecycle adds explicit event recording on top of the existing tracker.

Representative event types include:

```text
application-submitted
recruiter-screen-scheduled
recruiter-screen-occurred
interview-scheduled
interview-occurred
interview-canceled
stage-entered
stage-completed
offer-received
offer-revised
offer-accepted
offer-declined
offer-expired
rejection-received
withdrawn
placement
correction
revocation
```

Events preserve:

- application identity;
- revision;
- explicit event type;
- scheduled / occurred / outcome timestamps;
- stage label/order;
- source/evidence references;
- confirmation;
- supersession/revocation;
- bounded offer terms.

## Final V30 product-proof contract

V30 exposes exact observational journeys when evidence exists.

```text
Opportunity
   ↓
Decision
   ↓
Application / Action
   ↓
Interview
   ↓
Outcome
   ↓
Evidence
   ↓
Review Proposal
```

No missing node is silently invented.

Metrics include:

- source freshness;
- source coverage;
- duplicate reduction;
- funnel counts;
- time metrics;
- costs;
- denominators;
- unknown populations.

All remain observational: `causalClaim=false`.

## Security and privacy

The active runtime is local-first and must not expose private candidate data publicly.

Public showcase exclusions include:

- private profile;
- resumes;
- application history;
- OAuth state;
- API secrets;
- demographic/EEO data;
- private outcome history;
- local persistence;
- recovery artifacts.

See [Privacy](PRIVACY.md) and [Public Source Map](PUBLIC_SOURCE_MAP.md).
