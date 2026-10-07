# SwapOpt — Final Release Evidence

## Release status

The private production runtime reached **FULL_RELEASE_2 — V29 + V30 — FINAL CONSOLIDATED PRODUCT RELEASE** on 2026-10-06.

Authoritative private release commit:

```text
aec44add07f2bae018e52aa49da8f780a2661a28
feat(v30): release interview lifecycle and product proof
```

This public repository is a sanitized showcase. It does **not** claim that every private runtime file or every private test is mirrored here.

## Automated release gate

The exact private release tree passed:

- **3,244 / 3,244 automated tests**
- **0 failures**
- **0 skipped**
- **0 cancelled**
- module registry validation: **24 modules / 257 validated paths**
- `git -c core.whitespace=cr-at-eol diff --check`: PASS

The final release was staged as an exact 14-path scope. Unrelated and protected working-tree changes remained outside the release commit.

## Manual acceptance

Manual isolated acceptance used temporary data and did not modify live personal data.

Verified V29 behavior:

- scheduled lifecycle events remain scheduled;
- canceled interviews do not become occurred interviews;
- direct offers are representable without inventing an interview;
- revised offers remain explicit;
- accepted offer does **not** imply placement;
- lifecycle history returns successfully in the real HTTP/browser path.

Verified V30 behavior:

- complete journeys remain complete;
- sparse journeys remain sparse;
- product-proof metrics expose denominators and unknowns;
- `causalClaim` remains `false`;
- candidate-evidence review proposals require an explicit decision;
- explicit rejection returned `acceptedClaimRef: null`.

## Release semantics

SwapOpt's final release preserves several non-negotiable rules:

```text
missing evidence        != failed requirement
scheduled interview     != occurred interview
accepted offer          != placement
job requirement         != candidate capability
observed association    != causal proof
network connection      != referral willingness
AI suggestion           != authoritative user fact
```

## Public showcase validation

The public repository has its own smaller CI boundary. It verifies the curated public source slice, not the full private runtime.

See:

- [Public Source Map](PUBLIC_SOURCE_MAP.md)
- [Architecture](ARCHITECTURE_V4.md)
- [Technical Blueprint](TECHNICAL_BLUEPRINT.md)
