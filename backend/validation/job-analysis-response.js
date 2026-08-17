import { AppError } from "../utils/app-error.js";

const REQUIRED_FIELDS = Object.freeze([
  "job_title",
  "company",
  "location",
  "current_match_percent",
  "tailored_match_percent",
  "hiring_logic_score",
  "technical_match_score",
  "responsibility_match_score",
  "experience_level_score",
  "domain_transfer_score",
  "sponsorship_risk_score",
  "target_level",
  "decision",
  "time_priority",
  "h1b_risk",
  "next_action",
  "score_explanation",
  "why_they_might_hire",
  "why_they_might_pass",
  "keywords_to_emphasize",
  "missing_keywords",
  "recommended_projects",
  "best_resume_angle",
  "risk_or_overclaim_warning"
]);

const ALLOWED_FIELDS = new Set(
  REQUIRED_FIELDS
);

const TARGET_LEVELS = new Set([
  "Strong Target",
  "Possible Target",
  "Weak Target",
  "Not Worth Time"
]);

const DECISIONS = new Set([
  "Apply",
  "Tailor",
  "Save",
  "Skip"
]);

const TIME_PRIORITIES = new Set([
  "High",
  "Medium",
  "Low"
]);

const H1B_RISK_LEVELS = new Set([
  "Low",
  "Medium",
  "High",
  "Unknown"
]);

export function validateJobAnalysisResponse(
  value
) {
  validateResponseObject(value);
  validateRequiredFields(value);
  validateAdditionalFields(value);

  const result = {
    job_title: validateString(
      value.job_title,
      {
        field: "job_title",
        minimumLength: 1,
        maximumLength: 200
      }
    ),

    company: validateString(
      value.company,
      {
        field: "company",
        minimumLength: 1,
        maximumLength: 200
      }
    ),

    location: validateString(
      value.location,
      {
        field: "location",
        minimumLength: 1,
        maximumLength: 200
      }
    ),

    current_match_percent:
      validateInteger(
        value.current_match_percent,
        {
          field:
            "current_match_percent",
          minimum: 0,
          maximum: 100
        }
      ),

    tailored_match_percent:
      validateInteger(
        value.tailored_match_percent,
        {
          field:
            "tailored_match_percent",
          minimum: 0,
          maximum: 100
        }
      ),

    hiring_logic_score:
      validateScore(
        value.hiring_logic_score,
        "hiring_logic_score"
      ),

    technical_match_score:
      validateScore(
        value.technical_match_score,
        "technical_match_score"
      ),

    responsibility_match_score:
      validateScore(
        value.responsibility_match_score,
        "responsibility_match_score"
      ),

    experience_level_score:
      validateScore(
        value.experience_level_score,
        "experience_level_score"
      ),

    domain_transfer_score:
      validateScore(
        value.domain_transfer_score,
        "domain_transfer_score"
      ),

    sponsorship_risk_score:
      validateScore(
        value.sponsorship_risk_score,
        "sponsorship_risk_score"
      ),

    target_level: validateEnum(
      value.target_level,
      {
        field: "target_level",
        allowedValues: TARGET_LEVELS
      }
    ),

    decision: validateEnum(
      value.decision,
      {
        field: "decision",
        allowedValues: DECISIONS
      }
    ),

    time_priority: validateEnum(
      value.time_priority,
      {
        field: "time_priority",
        allowedValues:
          TIME_PRIORITIES
      }
    ),

    h1b_risk: validateEnum(
      value.h1b_risk,
      {
        field: "h1b_risk",
        allowedValues:
          H1B_RISK_LEVELS
      }
    ),

    next_action: validateString(
      value.next_action,
      {
        field: "next_action",
        minimumLength: 1,
        maximumLength: 300
      }
    ),

    score_explanation:
      validateString(
        value.score_explanation,
        {
          field:
            "score_explanation",
          minimumLength: 1,
          maximumLength: 1_500
        }
      ),

    why_they_might_hire:
      validateStringArray(
        value.why_they_might_hire,
        {
          field:
            "why_they_might_hire",
          maximumItems: 6,
          maximumItemLength: 300
        }
      ),

    why_they_might_pass:
      validateStringArray(
        value.why_they_might_pass,
        {
          field:
            "why_they_might_pass",
          maximumItems: 6,
          maximumItemLength: 300
        }
      ),

    keywords_to_emphasize:
      validateStringArray(
        value.keywords_to_emphasize,
        {
          field:
            "keywords_to_emphasize",
          maximumItems: 15,
          maximumItemLength: 100
        }
      ),

    missing_keywords:
      validateStringArray(
        value.missing_keywords,
        {
          field:
            "missing_keywords",
          maximumItems: 15,
          maximumItemLength: 100
        }
      ),

    recommended_projects:
      validateStringArray(
        value.recommended_projects,
        {
          field:
            "recommended_projects",
          maximumItems: 2,
          maximumItemLength: 200
        }
      ),

    best_resume_angle:
      validateString(
        value.best_resume_angle,
        {
          field:
            "best_resume_angle",
          minimumLength: 1,
          maximumLength: 600
        }
      ),

    risk_or_overclaim_warning:
      validateString(
        value.risk_or_overclaim_warning,
        {
          field:
            "risk_or_overclaim_warning",
          minimumLength: 1,
          maximumLength: 600
        }
      )
  };

  validateCrossFieldRules(result);

  return deepFreeze(result);
}

function validateResponseObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw invalidResponse(
      "The job analysis response must be a JSON object.",
      {
        expectedType: "object"
      }
    );
  }
}

function validateRequiredFields(value) {
  const missingFields =
    REQUIRED_FIELDS.filter(
      (field) =>
        !Object.prototype.hasOwnProperty.call(
          value,
          field
        )
    );

  if (missingFields.length > 0) {
    throw invalidResponse(
      "The job analysis response is missing required fields.",
      {
        missingFields
      }
    );
  }
}

function validateAdditionalFields(value) {
  const additionalFields =
    Object.keys(value).filter(
      (field) =>
        !ALLOWED_FIELDS.has(field)
    );

  if (additionalFields.length > 0) {
    throw invalidResponse(
      "The job analysis response contains unsupported fields.",
      {
        additionalFields
      }
    );
  }
}

function validateString(
  value,
  {
    field,
    minimumLength,
    maximumLength
  }
) {
  if (typeof value !== "string") {
    throw invalidField(
      field,
      "must be a string."
    );
  }

  const normalizedValue =
    normalizeString(value);

  if (
    normalizedValue.length <
    minimumLength
  ) {
    throw invalidField(
      field,
      `must contain at least ${minimumLength} character.`
    );
  }

  if (
    normalizedValue.length >
    maximumLength
  ) {
    throw invalidField(
      field,
      `must not exceed ${maximumLength} characters.`
    );
  }

  return normalizedValue;
}

function validateInteger(
  value,
  {
    field,
    minimum,
    maximum
  }
) {
  if (!Number.isInteger(value)) {
    throw invalidField(
      field,
      "must be an integer."
    );
  }

  if (
    value < minimum ||
    value > maximum
  ) {
    throw invalidField(
      field,
      `must be between ${minimum} and ${maximum}.`
    );
  }

  return value;
}

function validateScore(
  value,
  field
) {
  return validateInteger(value, {
    field,
    minimum: 0,
    maximum: 10
  });
}

function validateEnum(
  value,
  {
    field,
    allowedValues
  }
) {
  const normalizedValue =
    validateString(value, {
      field,
      minimumLength: 1,
      maximumLength: 100
    });

  if (
    !allowedValues.has(
      normalizedValue
    )
  ) {
    throw invalidField(
      field,
      `must be one of: ${[
        ...allowedValues
      ].join(", ")}.`
    );
  }

  return normalizedValue;
}

function validateStringArray(
  value,
  {
    field,
    maximumItems,
    maximumItemLength
  }
) {
  if (!Array.isArray(value)) {
    throw invalidField(
      field,
      "must be an array."
    );
  }

  if (
    value.length >
    maximumItems
  ) {
    throw invalidField(
      field,
      `must not contain more than ${maximumItems} items.`
    );
  }

  const normalizedItems =
    value.map((item, index) =>
      validateString(item, {
        field: `${field}[${index}]`,
        minimumLength: 1,
        maximumLength:
          maximumItemLength
      })
    );

  return removeDuplicateStrings(
    normalizedItems
  );
}

function validateCrossFieldRules(result) {
  if (
    result.tailored_match_percent <
    result.current_match_percent
  ) {
    throw invalidResponse(
      "The tailored match percentage cannot be lower than the current match percentage.",
      {
        currentMatchPercent:
          result.current_match_percent,
        tailoredMatchPercent:
          result.tailored_match_percent
      }
    );
  }

  const allowedDecisionsByTarget =
    {
      "Strong Target": new Set([
        "Apply",
        "Tailor"
      ]),
      "Possible Target": new Set([
        "Apply",
        "Tailor",
        "Save"
      ]),
      "Weak Target": new Set([
        "Save",
        "Skip"
      ]),
      "Not Worth Time": new Set([
        "Skip"
      ])
    };

  const allowedDecisions =
    allowedDecisionsByTarget[
      result.target_level
    ];

  if (
    !allowedDecisions.has(
      result.decision
    )
  ) {
    throw invalidResponse(
      "The decision is inconsistent with the target level.",
      {
        targetLevel:
          result.target_level,
        decision:
          result.decision,
        allowedDecisions: [
          ...allowedDecisions
        ]
      }
    );
  }

  if (
    result.target_level ===
      "Strong Target" &&
    result.time_priority === "Low"
  ) {
    throw invalidResponse(
      "A Strong Target cannot have Low time priority.",
      {
        targetLevel:
          result.target_level,
        timePriority:
          result.time_priority
      }
    );
  }

  if (
    result.target_level ===
      "Not Worth Time" &&
    result.time_priority !== "Low"
  ) {
    throw invalidResponse(
      "A Not Worth Time result must have Low time priority.",
      {
        targetLevel:
          result.target_level,
        timePriority:
          result.time_priority
      }
    );
  }

  if (
    result.h1b_risk === "High" &&
    result.sponsorship_risk_score < 7
  ) {
    throw invalidResponse(
      "High H-1B risk requires a sponsorship risk score of at least 7.",
      {
        h1bRisk:
          result.h1b_risk,
        sponsorshipRiskScore:
          result.sponsorship_risk_score
      }
    );
  }

  if (
    result.h1b_risk === "Low" &&
    result.sponsorship_risk_score > 4
  ) {
    throw invalidResponse(
      "Low H-1B risk cannot have a sponsorship risk score above 4.",
      {
        h1bRisk:
          result.h1b_risk,
        sponsorshipRiskScore:
          result.sponsorship_risk_score
      }
    );
  }
}

function removeDuplicateStrings(
  values
) {
  const seenValues = new Set();
  const uniqueValues = [];

  for (const value of values) {
    const comparisonValue =
      value.toLocaleLowerCase("en-US");

    if (
      seenValues.has(
        comparisonValue
      )
    ) {
      continue;
    }

    seenValues.add(
      comparisonValue
    );

    uniqueValues.push(value);
  }

  return uniqueValues;
}

function normalizeString(value) {
  return value
    .replaceAll("\u0000", "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function invalidField(
  field,
  message
) {
  return invalidResponse(
    `The ${field} field ${message}`,
    {
      field
    }
  );
}

function invalidResponse(
  message,
  details = null
) {
  return AppError.upstream(
    message,
    {
      code:
        "INVALID_JOB_ANALYSIS_RESPONSE",
      details,
      expose: false
    }
  );
}

function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  for (
    const nestedValue of
    Object.values(value)
  ) {
    deepFreeze(nestedValue);
  }

  return value;
}