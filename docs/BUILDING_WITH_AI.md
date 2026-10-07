# Building SwapOpt With AI-Assisted Development

## The accurate version

SwapOpt was built with heavy AI assistance.

That does **not** mean the product was created by typing one prompt and accepting whatever came back.

My primary role was product and systems ownership:

- defining the real problem;
- deciding what the system should and should not infer;
- writing requirements;
- structuring workflows;
- choosing evidence boundaries;
- reviewing architecture;
- reproducing failures;
- validating behavior;
- deciding what counted as release-ready;
- iterating until the system matched the intended product logic.

AI accelerated implementation and code generation.

## Why this matters

The most difficult decisions were rarely syntax questions.

Examples:

- Should a missing requirement be treated as failure?  
  **No — preserve UNKNOWN.**

- Does a scheduled interview mean the interview happened?  
  **No.**

- Does an accepted offer mean placement?  
  **No.**

- Can a job requirement become a candidate skill because it appears often?  
  **No.**

- Can a few outcomes automatically rewrite Candidate Identity?  
  **No — require explicit review.**

- Can historical conversion patterns be described as causal improvement?  
  **No.**

Those are product and reasoning decisions before they are coding decisions.

## Working method

The build process became an iterative loop:

```text
Problem
  ↓
Requirement
  ↓
Architecture / owner module
  ↓
Implementation
  ↓
Focused tests
  ↓
Observed failure
  ↓
Root-cause analysis
  ↓
Repair
  ↓
Broader regression tests
  ↓
Manual acceptance
  ↓
Release evidence
```

## What AI was good at

AI was especially useful for:

- generating implementation candidates;
- reading large code surfaces;
- suggesting test cases;
- producing migration/patch helpers;
- identifying integration seams;
- drafting structured documentation;
- accelerating refactors.

## What still required ownership

AI could not replace:

- deciding product truth;
- knowing when behavior was misleading;
- choosing conservative semantics;
- protecting private working-tree state;
- validating real browser behavior;
- deciding whether a release claim was justified.

## The release lesson

One of the most important lessons was that passing tests is not the same as proving the product works.

During the final V29/V30 release:

1. focused tests passed;
2. the full repository suite exposed a stale integration fixture;
3. that was repaired;
4. the full suite passed;
5. manual browser acceptance then exposed a real pagination bug;
6. that production defect was repaired;
7. the full suite was rerun;
8. manual acceptance was rerun;
9. only then was the release committed and pushed.

That process is a better representation of engineering than pretending the first generated implementation was correct.

## What I would tell an interviewer

I would not present myself as someone who manually wrote every line from memory.

I would say:

> I used AI-assisted development extensively, but I owned the product problem, requirements, system behavior, validation, debugging and release decisions. The project taught me how to structure technical work, reason about evidence and uncertainty, and turn an ambiguous personal problem into a working system.

That is the honest story of SwapOpt.
