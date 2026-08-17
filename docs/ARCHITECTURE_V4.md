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
