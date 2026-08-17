import {
  DEFAULT_OBSERVED_JOB_LIMIT,
  MAX_OBSERVED_JOB_LIMIT
} from "./career-evidence-constants.js";

import {
  isPlainObject,
  normaliseOptionalQueryBoolean
} from "./career-evidence-utils.js";

const GRAPH_OPTION_FIELDS =
  new Set([
    "includeObserved",
    "includeUnverified",
    "includeArchivedClaims",
    "observedJobLimit"
  ]);

export function normaliseCareerEvidenceGraphOptions(
  options
) {
  if (
    !isPlainObject(
      options
    )
  ) {
    throw new TypeError(
      "Career Evidence graph options must be an object."
    );
  }

  const unsupported =
    Reflect.ownKeys(
      options
    )
      .filter(
        (key) =>
          typeof key !==
            "string" ||
          !GRAPH_OPTION_FIELDS.has(
            key
          )
      );

  if (
    unsupported.length >
    0
  ) {
    throw new RangeError(
      `Career Evidence graph options contain unsupported fields: ${unsupported.map(String).join(", ")}.`
    );
  }

  const observedJobLimit =
    options.observedJobLimit ===
      undefined ||
    options.observedJobLimit ===
      null ||
    options.observedJobLimit ===
      ""
      ? DEFAULT_OBSERVED_JOB_LIMIT
      : Number(
          options.observedJobLimit
        );

  if (
    !Number.isSafeInteger(
      observedJobLimit
    ) ||
    observedJobLimit <
      1 ||
    observedJobLimit >
      MAX_OBSERVED_JOB_LIMIT
  ) {
    throw new RangeError(
      `Career Evidence observedJobLimit must be an integer between 1 and ${MAX_OBSERVED_JOB_LIMIT}.`
    );
  }

  return Object.freeze({
    includeObserved:
      normaliseOptionalQueryBoolean(
        options.includeObserved,
        true,
        "includeObserved"
      ),

    includeUnverified:
      normaliseOptionalQueryBoolean(
        options.includeUnverified,
        false,
        "includeUnverified"
      ),

    includeArchivedClaims:
      normaliseOptionalQueryBoolean(
        options.includeArchivedClaims,
        false,
        "includeArchivedClaims"
      ),

    observedJobLimit
  });
}
