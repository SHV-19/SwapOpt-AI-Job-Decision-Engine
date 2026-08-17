import {
  PROTECTED_PROFILE_FIELDS,
  SAFE_PROFILE_ANSWER_DEFINITIONS
} from "./career-evidence-constants.js";

import {
  cleanString,
  companyNodeId,
  isPlainObject,
  sourceRef,
  stableHash
} from "./career-evidence-utils.js";

export async function loadCareerEvidenceProfile(
  profileService
) {
  if (
    profileService ===
      null ||
    profileService ===
      undefined
  ) {
    return Object.freeze({
      loaded:
        false,

      value:
        null,

      excludedProtectedProfileFieldCount:
        0
    });
  }

  assertProfileService(
    profileService
  );

  const value =
    await profileService
      .getApplicationAnswersProfile();

  if (
    !isPlainObject(
      value
    )
  ) {
    return Object.freeze({
      loaded:
        false,

      value:
        null,

      excludedProtectedProfileFieldCount:
        0
    });
  }

  const answers =
    isPlainObject(
      value.answers
    )
      ? value.answers
      : {};

  const excludedProtectedProfileFieldCount =
    PROTECTED_PROFILE_FIELDS.filter(
      (field) =>
        Object.hasOwn(
          answers,
          field
        )
    ).length;

  return Object.freeze({
    loaded:
      true,

    value,

    excludedProtectedProfileFieldCount
  });
}

export function addCareerEvidenceProfile(
  graph,
  profileData
) {
  if (
    !profileData
      ?.loaded ||
    !profileData.value
  ) {
    return;
  }

  const value =
    profileData.value;

  const identity =
    isPlainObject(
      value.identity
    )
      ? value.identity
      : {};

  const answers =
    isPlainObject(
      value.answers
    )
      ? value.answers
      : {};

  addLocationClaim(
    graph,
    identity
  );

  addSafeAnswerClaims(
    graph,
    answers
  );

  addEmploymentEvidence(
    graph,
    value.employment
  );

  addEducationEvidence(
    graph,
    value.education
  );
}

function addLocationClaim(
  graph,
  identity
) {
  const currentLocation =
    cleanString(
      identity.currentLocation,
      300,
      true
    );

  if (
    !currentLocation
  ) {
    return;
  }

  graph.addClaimNode({
    id:
      "claim:identity.current-location",

    category:
      "identity",

    key:
      "identity.current-location",

    label:
      "Current location",

    value:
      currentLocation,

    unit:
      null,

    evidenceClass:
      "user-confirmed",

    decisionEligible:
      true,

    sensitivity:
      "private",

    sourceRefs: [
      sourceRef({
        sourceType:
          "profile",

        label:
          "profile/application_answers.json",

        fieldPath:
          "identity.currentLocation"
      })
    ]
  });
}

function addSafeAnswerClaims(
  graph,
  answers
) {
  for (
    const definition of
    SAFE_PROFILE_ANSWER_DEFINITIONS
  ) {
    if (
      !Object.hasOwn(
        answers,
        definition.field
      )
    ) {
      continue;
    }

    const value =
      normaliseGraphValue(
        answers[
          definition.field
        ]
      );

    if (
      value ===
      null
    ) {
      continue;
    }

    graph.addClaimNode({
      id:
        `claim:${definition.key}`,

      category:
        definition.category,

      key:
        definition.key,

      label:
        definition.label,

      value,

      unit:
        definition.unit,

      evidenceClass:
        "user-confirmed",

      decisionEligible:
        true,

      sensitivity:
        definition.sensitivity,

      sourceRefs: [
        sourceRef({
          sourceType:
            "profile",

          label:
            "profile/application_answers.json",

          fieldPath:
            `answers.${definition.field}`
        })
      ]
    });
  }
}

function addEmploymentEvidence(
  graph,
  records
) {
  const employment =
    Array.isArray(
      records
    )
      ? records
      : [];

  employment.forEach(
    (
      entry,
      index
    ) => {
      if (
        !isPlainObject(
          entry
        )
      ) {
        return;
      }

      const company =
        cleanString(
          entry.company,
          300,
          true
        );

      const title =
        cleanString(
          entry.title,
          300,
          true
        );

      if (
        !company &&
        !title
      ) {
        return;
      }

      const employmentId =
        `employment:${stableHash([
          company,
          title,
          entry.startDate,
          entry.endDate,
          index
        ])}`;

      const ref =
        sourceRef({
          sourceType:
            "profile",

          label:
            "profile/application_answers.json",

          fieldPath:
            `employment[${index}]`
        });

      graph.addNode({
        id:
          employmentId,

        type:
          "employment",

        label:
          [
            title,
            company
          ]
            .filter(
              Boolean
            )
            .join(
              " — "
            ),

        evidenceClass:
          "user-confirmed",

        decisionEligible:
          true,

        sourceRefs: [
          ref
        ],

        metadata: {
          company,

          title,

          startDate:
            cleanString(
              entry.startDate,
              80,
              true
            ),

          endDate:
            cleanString(
              entry.endDate,
              80,
              true
            ),

          location:
            cleanString(
              entry.location,
              300,
              true
            ),

          division:
            cleanString(
              entry.division,
              200,
              true
            )
        }
      });

      graph.addEdge({
        from:
          "candidate:self",

        to:
          employmentId,

        type:
          "has-employment",

        evidenceClass:
          "user-confirmed",

        decisionEligible:
          true,

        sourceRefs: [
          ref
        ]
      });

      if (
        company
      ) {
        addEmploymentCompany(
          graph,
          employmentId,
          company,
          index
        );
      }
    }
  );
}

function addEmploymentCompany(
  graph,
  employmentId,
  company,
  index
) {
  const companyId =
    companyNodeId(
      company
    );

  const ref =
    sourceRef({
      sourceType:
        "profile",

      label:
        "profile/application_answers.json",

      fieldPath:
        `employment[${index}].company`
    });

  graph.addNode({
    id:
      companyId,

    type:
      "company",

    label:
      company,

    evidenceClass:
      "user-confirmed",

    decisionEligible:
      true,

    sourceRefs: [
      ref
    ],

    metadata:
      {}
  });

  graph.addEdge({
    from:
      employmentId,

    to:
      companyId,

    type:
      "employment-at-company",

    evidenceClass:
      "user-confirmed",

    decisionEligible:
      true,

    sourceRefs: [
      ref
    ]
  });
}

function addEducationEvidence(
  graph,
  records
) {
  const education =
    Array.isArray(
      records
    )
      ? records
      : [];

  education.forEach(
    (
      entry,
      index
    ) => {
      if (
        !isPlainObject(
          entry
        )
      ) {
        return;
      }

      const school =
        cleanString(
          entry.school,
          300,
          true
        );

      const degree =
        cleanString(
          entry.degreeType ??
            entry.degree,
          300,
          true
        );

      if (
        !school &&
        !degree
      ) {
        return;
      }

      const educationId =
        `education:${stableHash([
          school,
          degree,
          entry.fieldOfStudy,
          entry.startDate,
          entry.endDate,
          index
        ])}`;

      const ref =
        sourceRef({
          sourceType:
            "profile",

          label:
            "profile/application_answers.json",

          fieldPath:
            `education[${index}]`
        });

      graph.addNode({
        id:
          educationId,

        type:
          "education",

        label:
          [
            degree,
            cleanString(
              entry.fieldOfStudy,
              300,
              true
            ),
            school
          ]
            .filter(
              Boolean
            )
            .join(
              " — "
            ),

        evidenceClass:
          "user-confirmed",

        decisionEligible:
          true,

        sourceRefs: [
          ref
        ],

        metadata: {
          school,

          degree,

          fieldOfStudy:
            cleanString(
              entry.fieldOfStudy,
              300,
              true
            ),

          startDate:
            cleanString(
              entry.startDate,
              80,
              true
            ),

          endDate:
            cleanString(
              entry.endDate,
              80,
              true
            )
        }
      });

      graph.addEdge({
        from:
          "candidate:self",

        to:
          educationId,

        type:
          "has-education",

        evidenceClass:
          "user-confirmed",

        decisionEligible:
          true,

        sourceRefs: [
          ref
        ]
      });
    }
  );
}

function normaliseGraphValue(
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
    return cleanString(
      value,
      2_000,
      true
    );
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value
      .slice(
        0,
        50
      )
      .map(
        normaliseGraphValue
      )
      .filter(
        (item) =>
          item !==
          null
      );
  }

  return null;
}

function assertProfileService(
  service
) {
  if (
    !service ||
    typeof service !==
      "object" ||
    typeof service.getApplicationAnswersProfile !==
      "function"
  ) {
    throw new TypeError(
      "Career evidence service requires a valid profile service when configured."
    );
  }

  return service;
}
