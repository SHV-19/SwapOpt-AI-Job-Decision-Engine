import {
  CLAIM_CATEGORIES,
  CLAIM_EVIDENCE_CLASSES,
  CLAIM_SENSITIVITY_LEVELS,
  MAX_CLAIM_ARRAY_ITEMS,
  MAX_CLAIM_KEY_LENGTH,
  MAX_CLAIM_LABEL_LENGTH,
  MAX_CLAIM_NOTES_LENGTH,
  MAX_CLAIM_SOURCE_LABEL_LENGTH,
  MAX_CLAIM_STRING_LENGTH
} from "./career-evidence-constants.js";

import {
  cleanRequiredString,
  cleanString,
  isPlainObject,
  normaliseBoolean,
  normaliseOptionalQueryBoolean,
  normaliseOptionalUrl,
  normaliseQueryBoolean
} from "./career-evidence-utils.js";

import {
  AppError
} from "../utils/app-error.js";

const PROTECTED_CLAIM_PATTERN =
  /\b(race|racial|ethnic|ethnicity|gender|sex|sexual orientation|religion|religious|disability|disabled|veteran|military status|marital|pregnan|date of birth|birth date|age)\b/iu;

const CLAIM_FIELDS = new Set([
  "category",
  "key",
  "label",
  "value",
  "unit",
  "evidenceClass",
  "decisionEligible",
  "sensitivity",
  "sourceLabel",
  "sourceUrl",
  "notes"
]);

const CLAIM_QUERY_FIELDS = new Set([
  "category",
  "key",
  "includeArchived",
  "decisionEligible"
]);

export function normaliseClaimInput(input, {
  immutableCategory = null,
  immutableKey = null
} = {}) {
  if (!isPlainObject(input)) {
    throw new TypeError(
      "Career Evidence claim must be a plain object."
    );
  }

  const unsupported = Reflect.ownKeys(input)
    .filter(
      (key) =>
        typeof key !== "string" ||
        !CLAIM_FIELDS.has(key)
    );

  if (unsupported.length > 0) {
    throw new RangeError(
      `Career Evidence claim contains unsupported fields: ${unsupported.map(String).join(", ")}.`
    );
  }

  const category = normaliseClaimCategory(
    input.category ?? immutableCategory
  );

  const key = normaliseClaimKey(
    input.key ?? immutableKey
  );

  if (
    immutableCategory !== null &&
    category !== immutableCategory
  ) {
    throw new RangeError(
      "Career Evidence claim category cannot be changed."
    );
  }

  if (
    immutableKey !== null &&
    key !== immutableKey
  ) {
    throw new RangeError(
      "Career Evidence claim key cannot be changed."
    );
  }

  const label = cleanRequiredString(
    input.label,
    MAX_CLAIM_LABEL_LENGTH,
    "Career Evidence claim label"
  );

  assertNotProtectedClaim(
    `${key} ${label}`
  );

  return Object.freeze({
    category,
    key,
    label,
    value:
      normaliseClaimValue(
        input.value
      ),
    unit:
      cleanString(
        input.unit,
        120,
        true
      ),
    evidenceClass:
      normaliseClaimEvidenceClass(
        input.evidenceClass
      ),
    decisionEligible:
      input.decisionEligible ===
        undefined
        ? true
        : normaliseBoolean(
            input.decisionEligible,
            "Career Evidence decisionEligible"
          ),
    sensitivity:
      normaliseClaimSensitivity(
        input.sensitivity
      ),
    sourceLabel:
      cleanString(
        input.sourceLabel,
        MAX_CLAIM_SOURCE_LABEL_LENGTH,
        true
      ),
    sourceUrl:
      normaliseOptionalUrl(
        input.sourceUrl
      ),
    notes:
      cleanString(
        input.notes,
        MAX_CLAIM_NOTES_LENGTH,
        true
      )
  });
}

export function normaliseClaimQuery(query) {
  if (!isPlainObject(query)) {
    throw new TypeError(
      "Career Evidence claim query must be an object."
    );
  }

  const unsupported = Reflect.ownKeys(query)
    .filter(
      (key) =>
        typeof key !== "string" ||
        !CLAIM_QUERY_FIELDS.has(key)
    );

  if (unsupported.length > 0) {
    throw new RangeError(
      `Career Evidence claim query contains unsupported fields: ${unsupported.map(String).join(", ")}.`
    );
  }

  return Object.freeze({
    category:
      query.category === undefined ||
      query.category === null ||
      query.category === ""
        ? null
        : normaliseClaimCategory(
            query.category
          ),
    key:
      query.key === undefined ||
      query.key === null ||
      query.key === ""
        ? null
        : normaliseClaimKey(
            query.key
          ),
    includeArchived:
      normaliseOptionalQueryBoolean(
        query.includeArchived,
        false,
        "includeArchived"
      ),
    decisionEligible:
      query.decisionEligible ===
        undefined ||
      query.decisionEligible ===
        null ||
      query.decisionEligible ===
        ""
        ? null
        : normaliseQueryBoolean(
            query.decisionEligible,
            "decisionEligible"
          )
  });
}

export function publicClaim(record) {
  return Object.freeze({
    id:
      record.id,
    schemaVersion:
      record.schemaVersion,
    category:
      record.category,
    key:
      record.key,
    label:
      record.label,
    value:
      structuredClone(
        record.value
      ),
    unit:
      record.unit ??
      null,
    evidenceClass:
      record.evidenceClass,
    decisionEligible:
      record.decisionEligible ===
      true,
    sensitivity:
      record.sensitivity ??
      "standard",
    sourceLabel:
      record.sourceLabel ??
      null,
    sourceUrl:
      record.sourceUrl ??
      null,
    notes:
      record.notes ??
      null,
    archivedAt:
      record.archivedAt ??
      null,
    createdAt:
      record.createdAt ??
      null,
    updatedAt:
      record.updatedAt ??
      null,
    version:
      record.version ??
      null,
    revisionHistory:
      Array.isArray(
        record.revisionHistory
      )
        ? structuredClone(
            record.revisionHistory
          )
        : []
  });
}

export function createClaimRevision({
  action,
  at,
  value
}) {
  return Object.freeze({
    action,
    at,
    snapshot:
      Object.freeze({
        category:
          value.category ??
          null,
        key:
          value.key ??
          null,
        label:
          value.label ??
          null,
        value:
          value.value ===
            undefined
            ? null
            : structuredClone(
                value.value
              ),
        unit:
          value.unit ??
          null,
        evidenceClass:
          value.evidenceClass ??
          null,
        decisionEligible:
          value.decisionEligible ===
          true,
        sensitivity:
          value.sensitivity ??
          null
      })
  });
}

export function sameClaimValue(
  left,
  right
) {
  return JSON.stringify({
    category:
      left.category,
    key:
      left.key,
    label:
      left.label,
    value:
      left.value,
    unit:
      left.unit ??
      null,
    evidenceClass:
      left.evidenceClass,
    decisionEligible:
      left.decisionEligible ===
      true,
    sensitivity:
      left.sensitivity ??
      "standard",
    sourceLabel:
      left.sourceLabel ??
      null,
    sourceUrl:
      left.sourceUrl ??
      null,
    notes:
      left.notes ??
      null
  }) ===
    JSON.stringify(
      right
    );
}

function normaliseClaimCategory(
  value
) {
  const category =
    cleanRequiredString(
      value,
      80,
      "Career Evidence claim category"
    ).toLowerCase();

  if (
    !CLAIM_CATEGORIES.includes(
      category
    )
  ) {
    throw new RangeError(
      `Unsupported Career Evidence claim category: ${category}.`
    );
  }

  return category;
}

function normaliseClaimKey(
  value
) {
  const key =
    cleanRequiredString(
      value,
      MAX_CLAIM_KEY_LENGTH,
      "Career Evidence claim key"
    )
      .normalize(
        "NFKC"
      )
      .toLowerCase();

  if (
    !/^[a-z0-9][a-z0-9._-]{1,159}$/u
      .test(
        key
      )
  ) {
    throw new RangeError(
      "Career Evidence claim key must use lowercase letters, numbers, periods, underscores, or hyphens."
    );
  }

  return key;
}

function normaliseClaimEvidenceClass(
  value
) {
  const evidenceClass =
    cleanString(
      value,
      80,
      true
    ) ??
    "user-confirmed";

  if (
    !CLAIM_EVIDENCE_CLASSES.includes(
      evidenceClass
    )
  ) {
    throw new RangeError(
      `Unsupported Career Evidence claim evidence class: ${evidenceClass}.`
    );
  }

  return evidenceClass;
}

function normaliseClaimSensitivity(
  value
) {
  const sensitivity =
    cleanString(
      value,
      80,
      true
    ) ??
    "standard";

  if (
    !CLAIM_SENSITIVITY_LEVELS.includes(
      sensitivity
    )
  ) {
    throw new RangeError(
      `Unsupported Career Evidence claim sensitivity: ${sensitivity}.`
    );
  }

  return sensitivity;
}

function normaliseClaimValue(
  value
) {
  if (
    typeof value ===
      "boolean" ||
    (
      typeof value ===
        "number" &&
      Number.isFinite(
        value
      )
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    return cleanRequiredString(
      value,
      MAX_CLAIM_STRING_LENGTH,
      "Career Evidence claim value"
    );
  }

  if (
    Array.isArray(
      value
    )
  ) {
    if (
      value.length === 0 ||
      value.length >
        MAX_CLAIM_ARRAY_ITEMS
    ) {
      throw new RangeError(
        `Career Evidence claim arrays must contain 1-${MAX_CLAIM_ARRAY_ITEMS} items.`
      );
    }

    return Object.freeze(
      value.map(
        normaliseClaimArrayValue
      )
    );
  }

  throw new TypeError(
    "Career Evidence claim value must be a string, finite number, boolean, or simple array."
  );
}

function normaliseClaimArrayValue(
  value
) {
  if (
    typeof value ===
      "boolean" ||
    (
      typeof value ===
        "number" &&
      Number.isFinite(
        value
      )
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    return cleanRequiredString(
      value,
      MAX_CLAIM_STRING_LENGTH,
      "Career Evidence claim array value"
    );
  }

  throw new TypeError(
    "Career Evidence claim arrays may contain only strings, finite numbers, or booleans."
  );
}

function assertNotProtectedClaim(
  value
) {
  if (
    PROTECTED_CLAIM_PATTERN.test(
      String(
        value
      )
    )
  ) {
    throw AppError.validation(
      "Protected demographic self-identification data must remain outside the Career Evidence decision graph.",
      {
        code:
          "CAREER_EVIDENCE_PROTECTED_CLAIM"
      }
    );
  }
}
