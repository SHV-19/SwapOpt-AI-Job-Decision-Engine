import {
  assertRepositoryContext
} from "../database/repository.js";

import {
  AppError
} from "../utils/app-error.js";

import {
  CAREER_EVIDENCE_CLAIM_SCHEMA_VERSION,
  MAX_REVISION_HISTORY
} from "./career-evidence-constants.js";

import {
  createClaimRevision,
  normaliseClaimInput,
  normaliseClaimQuery,
  publicClaim,
  sameClaimValue
} from "./career-evidence-claim-policy.js";

import {
  compareTimestamp,
  deepFreeze,
  isPlainObject,
  nowIso
} from "./career-evidence-utils.js";

export function createCareerEvidenceClaimStore({
  repository,
  clock =
    () =>
      new Date()
} = {}) {
  assertClaimRepository(
    repository
  );

  async function listClaims(
    context,
    query =
      {}
  ) {
    const ctx =
      assertRepositoryContext(
        context
      );

    const filters =
      normaliseClaimQuery(
        query
      );

    const records =
      await repository.list(
        ctx
      );

    return deepFreeze(
      records
        .filter(
          (record) =>
            filters.includeArchived ||
            !record.archivedAt
        )
        .filter(
          (record) =>
            !filters.category ||
            record.category ===
              filters.category
        )
        .filter(
          (record) =>
            !filters.key ||
            record.key ===
              filters.key
        )
        .filter(
          (record) =>
            filters.decisionEligible ===
              null ||
            record.decisionEligible ===
              filters.decisionEligible
        )
        .sort(
          (
            left,
            right
          ) =>
            compareTimestamp(
              right.updatedAt,
              left.updatedAt
            ) ||
            String(
              left.key
            ).localeCompare(
              String(
                right.key
              )
            )
        )
        .map(
          publicClaim
        )
    );
  }

  async function createClaim(
    context,
    input
  ) {
    const ctx =
      assertRepositoryContext(
        context
      );

    const value =
      normaliseClaimInput(
        input
      );

    const existing =
      (
        await repository.list(
          ctx
        )
      )
        .find(
          (record) =>
            !record.archivedAt &&
            record.category ===
              value.category &&
            record.key ===
              value.key
        );

    if (
      existing
    ) {
      throw AppError.conflict(
        `An active Career Evidence claim already exists for ${value.key}.`,
        {
          code:
            "CAREER_EVIDENCE_DUPLICATE_CLAIM",

          details: {
            claimId:
              existing.id
          }
        }
      );
    }

    const timestamp =
      nowIso(
        clock
      );

    const record =
      await repository.create(
        ctx,
        {
          schemaVersion:
            CAREER_EVIDENCE_CLAIM_SCHEMA_VERSION,

          ...value,

          archivedAt:
            null,

          revisionHistory: [
            createClaimRevision({
              action:
                "created",

              at:
                timestamp,

              value
            })
          ]
        }
      );

    return deepFreeze(
      publicClaim(
        record
      )
    );
  }

  async function updateClaim(
    context,
    claimId,
    changes
  ) {
    const ctx =
      assertRepositoryContext(
        context
      );

    const current =
      await requireClaim(
        repository,
        ctx,
        claimId
      );

    if (
      current.archivedAt
    ) {
      throw AppError.conflict(
        "Archived Career Evidence claims cannot be edited.",
        {
          code:
            "CAREER_EVIDENCE_CLAIM_ARCHIVED"
        }
      );
    }

    if (
      !isPlainObject(
        changes
      ) ||
      Reflect.ownKeys(
        changes
      ).length ===
        0
    ) {
      throw new RangeError(
        "Career Evidence claim update must contain at least one field."
      );
    }

    const value =
      normaliseClaimInput(
        {
          category:
            current.category,

          key:
            current.key,

          label:
            current.label,

          value:
            current.value,

          unit:
            current.unit,

          evidenceClass:
            current.evidenceClass,

          decisionEligible:
            current.decisionEligible,

          sensitivity:
            current.sensitivity,

          sourceLabel:
            current.sourceLabel,

          sourceUrl:
            current.sourceUrl,

          notes:
            current.notes,

          ...changes
        },
        {
          immutableCategory:
            current.category,

          immutableKey:
            current.key
        }
      );

    if (
      sameClaimValue(
        current,
        value
      )
    ) {
      return deepFreeze(
        publicClaim(
          current
        )
      );
    }

    const timestamp =
      nowIso(
        clock
      );

    const revisionHistory =
      appendRevision(
        current,
        createClaimRevision({
          action:
            "updated",

          at:
            timestamp,

          value
        })
      );

    const updated =
      await repository.update(
        ctx,
        current.id,
        {
          ...value,
          revisionHistory
        }
      );

    return deepFreeze(
      publicClaim(
        updated
      )
    );
  }

  async function archiveClaim(
    context,
    claimId
  ) {
    const ctx =
      assertRepositoryContext(
        context
      );

    const current =
      await requireClaim(
        repository,
        ctx,
        claimId
      );

    if (
      current.archivedAt
    ) {
      return deepFreeze(
        publicClaim(
          current
        )
      );
    }

    const timestamp =
      nowIso(
        clock
      );

    const revisionHistory =
      appendRevision(
        current,
        createClaimRevision({
          action:
            "archived",

          at:
            timestamp,

          value:
            current
        })
      );

    const updated =
      await repository.update(
        ctx,
        current.id,
        {
          archivedAt:
            timestamp,

          revisionHistory
        }
      );

    return deepFreeze(
      publicClaim(
        updated
      )
    );
  }

  return Object.freeze({
    listClaims,
    createClaim,
    updateClaim,
    archiveClaim
  });
}

function appendRevision(
  current,
  revision
) {
  return [
    ...(
      Array.isArray(
        current.revisionHistory
      )
        ? current.revisionHistory
        : []
    ),

    revision
  ]
    .slice(
      -MAX_REVISION_HISTORY
    );
}

async function requireClaim(
  repository,
  context,
  claimId
) {
  if (
    typeof claimId !==
      "string" ||
    claimId.trim() ===
      ""
  ) {
    throw new TypeError(
      "Career Evidence claim ID is required."
    );
  }

  const record =
    await repository.findById(
      context,
      claimId.trim()
    );

  if (
    !record
  ) {
    throw AppError.notFound(
      "Career Evidence claim was not found.",
      {
        code:
          "CAREER_EVIDENCE_CLAIM_NOT_FOUND"
      }
    );
  }

  return record;
}

function assertClaimRepository(
  repository
) {
  for (
    const method of
    [
      "list",
      "create",
      "update",
      "findById"
    ]
  ) {
    if (
      typeof repository?.[
        method
      ] !==
      "function"
    ) {
      throw new TypeError(
        "Career Evidence claim store requires a valid repository."
      );
    }
  }
}
