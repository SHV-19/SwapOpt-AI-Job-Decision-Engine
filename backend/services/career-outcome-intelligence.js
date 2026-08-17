import {
  deriveJobStrategyGuidance
} from "./market-intelligence/application-behavior-intelligence.js";

export const CAREER_OUTCOME_ENGINE_CALCULATION_VERSION = "2026-08-14.1";

const READINESS_STAGES =
  Object.freeze({
    COLLECTING:
      "collecting",
    EMERGING:
      "emerging",
    ACTIONABLE:
      "actionable",
    ESTABLISHED:
      "established"
  });

export function createCareerOutcomeProfile({
  learningProfile,
  decisionContext,
  learningLoopSummary = null,
  generatedAt
}) {
  const strategy =
    isRecord(
      learningProfile
        ?.strategyFeedback
    )
      ? learningProfile
          .strategyFeedback
      : {};

  const sampleSize =
    nonNegativeInteger(
      strategy.sampleSize
    );

  const closedOutcomes =
    nonNegativeInteger(
      strategy.closedOutcomes
    );

  const confidence =
    normaliseConfidence(
      strategy.confidence
    );

  const readiness =
    createReadiness({
      sampleSize,
      closedOutcomes,
      confidence
    });

  const decisionSummary =
    isRecord(
      decisionContext
        ?.summary
    )
      ? decisionContext
          .summary
      : {};

  return deepFreeze({
    schemaVersion:
      1,

    calculationVersion:
      CAREER_OUTCOME_ENGINE_CALCULATION_VERSION,

    generatedAt,

    mode:
      "deterministic-observational-outcome-intelligence",

    readiness,

    outcomeHistory: {
      applications:
        sampleSize,

      closedOutcomes,

      interviewConversionRate:
        finitePercentage(
          strategy
            .interviewConversionRate
        ),

      offerConversionRate:
        finitePercentage(
          strategy
            .offerConversionRate
        ),

      rejectionRate:
        finitePercentage(
          strategy
            .rejectionRate
        ),

      confidence
    },

    verifiedCareerEvidence: {
      decisionEligibleNodes:
        nonNegativeInteger(
          decisionSummary.nodes
        ),

      decisionEligibleEdges:
        nonNegativeInteger(
          decisionSummary.edges
        ),

      userConfirmedNodes:
        nonNegativeInteger(
          decisionSummary
            .userConfirmedNodes
        ),

      verifiedSourceNodes:
        nonNegativeInteger(
          decisionSummary
            .verifiedSourceNodes
        )
    },

    feedbackLoop:
      normaliseLearningLoopSummary(
        learningLoopSummary
      ),

    strongestSignals: {
      prioritize:
        normaliseStrategySignals(
          strategy.prioritize
        )
          .slice(
            0,
            5
          ),

      deprioritize:
        normaliseStrategySignals(
          strategy.deprioritize
        )
          .slice(
            0,
            5
          ),

      observe:
        normaliseStrategySignals(
          strategy.observe
        )
          .slice(
            0,
            5
          )
    },

    actions:
      normaliseStringList(
        strategy.actions,
        4,
        500
      ),

    guardrails: [
      "Current job-posting evidence and hard eligibility constraints remain authoritative over historical patterns.",
      "Historical outcomes are observational associations and are never presented as proof that a workflow action caused an interview, offer, or rejection.",
      "Small or incomplete samples remain advisory and cannot materially change a recommendation.",
      "Only decision-eligible candidate evidence from the Career Evidence Graph is counted; protected demographics and unverified candidate claims are excluded.",
      "The engine makes no additional OpenAI request."
    ]
  });
}

export function createCareerOutcomeEvaluation({
  baselineAnalysis,
  adaptive,
  profile
}) {
  const adaptiveMetadata =
    isRecord(
      adaptive.metadata
    )
      ? adaptive.metadata
      : {};

  const signals =
    Array.isArray(
      adaptiveMetadata.signals
    )
      ? adaptiveMetadata
          .signals
          .slice(
            0,
            8
          )
          .map(
            normaliseAdaptiveSignal
          )
      : [];

  const strategy =
    deriveJobStrategyGuidance(
      adaptive.analysis
    );

  const changed =
    baselineAnalysis.decision !==
      adaptive.analysis.decision ||
    baselineAnalysis.time_priority !==
      adaptive.analysis.time_priority;

  return deepFreeze({
    schemaVersion:
      1,

    calculationVersion:
      CAREER_OUTCOME_ENGINE_CALCULATION_VERSION,

    generatedAt:
      profile.generatedAt,

    mode:
      "decision-audit",

    readiness:
      profile.readiness,

    verifiedCareerEvidence:
      profile
        .verifiedCareerEvidence,

    feedbackLoop:
      profile
        .feedbackLoop,

    baseline: {
      decision:
        baselineAnalysis.decision,

      timePriority:
        baselineAnalysis
          .time_priority,

      currentMatchPercent:
        baselineAnalysis
          .current_match_percent,

      tailoredMatchPercent:
        baselineAnalysis
          .tailored_match_percent,

      h1bRisk:
        baselineAnalysis
          .h1b_risk
    },

    recommendation: {
      decision:
        adaptive.analysis
          .decision,

      timePriority:
        adaptive.analysis
          .time_priority,

      resumeAction:
        strategy
          .resumeAction,

      effortLevel:
        strategy
          .effortLevel,

      nextAction:
        adaptive.analysis
          .next_action
    },

    changed,

    recommendationChanged:
      baselineAnalysis.decision !==
      adaptive.analysis.decision,

    timePriorityChanged:
      baselineAnalysis
        .time_priority !==
      adaptive.analysis
        .time_priority,

    matchedHistoricalSignals:
      signals,

    historicalEvidence:
      normaliseHistoricalEvidence(
        adaptiveMetadata
          .historicalEvidence
      ),

    strongestPortfolioSignals:
      profile.strongestSignals,

    explanation:
      normaliseString(
        adaptiveMetadata
          .explanation,
        changed
          ? "Historical outcome intelligence conservatively adjusted the current recommendation while current-job evidence remained authoritative."
          : "Historical outcome intelligence was evaluated without changing the current recommendation.",
        700
      ),

    limitations: [
      "This is decision support, not a hiring-probability guarantee.",
      "The engine does not infer causality from observational outcomes.",
      "A negative historical pattern is not an employer blacklist.",
      "Current explicit sponsorship, eligibility, and mandatory-requirement evidence overrides historical associations."
    ]
  });
}

function normaliseLearningLoopSummary(
  value
) {
  if (
    !isRecord(
      value
    )
  ) {
    return Object.freeze({
      stage:
        "collecting",
      auditedDecisions:
        0,
      submittedApplications:
        0,
      closedOutcomes:
        0,
      learningInfluencedDecisions:
        0,
      longitudinalAdvantage:
        "collecting",
      driftStatus:
        "insufficient-data",
      driftDirection:
        "unknown",
      driftAffectsRecommendation:
        false
    });
  }

  return Object.freeze({
    stage:
      normaliseString(
        value.readiness
          ?.stage,
        "collecting",
        40
      ),

    auditedDecisions:
      nonNegativeInteger(
        value.summary
          ?.auditedDecisions
      ),

    submittedApplications:
      nonNegativeInteger(
        value.summary
          ?.submittedApplications
      ),

    closedOutcomes:
      nonNegativeInteger(
        value.summary
          ?.closedOutcomes
      ),

    learningInfluencedDecisions:
      nonNegativeInteger(
        value.summary
          ?.learningInfluencedDecisions
      ),

    longitudinalAdvantage:
      normaliseString(
        value.maturity
          ?.longitudinalAdvantage,
        "collecting",
        40
      ),

    driftStatus:
      normaliseString(
        value.drift
          ?.status,
        "insufficient-data",
        40
      ),

    driftDirection:
      normaliseString(
        value.drift
          ?.direction,
        "unknown",
        40
      ),

    driftAffectsRecommendation:
      value.drift
        ?.affectsRecommendation ===
      true
  });
}

function createReadiness({
  sampleSize,
  closedOutcomes,
  confidence
}) {
  let stage =
    READINESS_STAGES
      .COLLECTING;

  if (
    sampleSize >=
      15 &&
    closedOutcomes >=
      8 &&
    confidence ===
      "high"
  ) {
    stage =
      READINESS_STAGES
        .ESTABLISHED;
  } else if (
    sampleSize >=
      5 &&
    closedOutcomes >=
      2 &&
    (
      confidence ===
        "medium" ||
      confidence ===
        "high"
    )
  ) {
    stage =
      READINESS_STAGES
        .ACTIONABLE;
  } else if (
    sampleSize >=
      5
  ) {
    stage =
      READINESS_STAGES
        .EMERGING;
  }

  return Object.freeze({
    stage,
    sampleSize,
    closedOutcomes,
    confidence,

    canInfluenceRecommendation:
      stage ===
        READINESS_STAGES
          .ACTIONABLE ||
      stage ===
        READINESS_STAGES
          .ESTABLISHED,

    nextThreshold:
      createNextThreshold({
        stage,
        sampleSize,
        closedOutcomes
      })
  });
}

function createNextThreshold({
  stage,
  sampleSize,
  closedOutcomes
}) {
  switch (
    stage
  ) {
    case READINESS_STAGES
      .COLLECTING:
      return Object.freeze({
        applicationsNeeded:
          Math.max(
            0,
            5 -
              sampleSize
          ),
        closedOutcomesNeeded:
          Math.max(
            0,
            2 -
              closedOutcomes
          ),
        target:
          "actionable"
      });

    case READINESS_STAGES
      .EMERGING:
      return Object.freeze({
        applicationsNeeded:
          0,
        closedOutcomesNeeded:
          Math.max(
            0,
            2 -
              closedOutcomes
          ),
        target:
          "actionable"
      });

    case READINESS_STAGES
      .ACTIONABLE:
      return Object.freeze({
        applicationsNeeded:
          Math.max(
            0,
            15 -
              sampleSize
          ),
        closedOutcomesNeeded:
          Math.max(
            0,
            8 -
              closedOutcomes
          ),
        target:
          "established"
      });

    default:
      return Object.freeze({
        applicationsNeeded:
          0,
        closedOutcomesNeeded:
          0,
        target:
          "established"
      });
  }
}

function normaliseStrategySignals(
  values
) {
  return (
    Array.isArray(
      values
    )
      ? values
      : []
  )
    .slice(
      0,
      20
    )
    .map(
      (value) =>
        Object.freeze({
          dimension:
            normaliseString(
              value
                ?.dimension,
              "unknown",
              100
            ),

          key:
            normaliseString(
              value?.key,
              "unknown",
              250
            ),

          direction:
            normaliseString(
              value
                ?.direction,
              "observe",
              30
            ),

          applications:
            nonNegativeInteger(
              value
                ?.applications
            ),

          interviews:
            nonNegativeInteger(
              value
                ?.interviews
            ),

          offers:
            nonNegativeInteger(
              value
                ?.offers
            ),

          rejections:
            nonNegativeInteger(
              value
                ?.rejections
            ),

          closedOutcomes:
            nonNegativeInteger(
              value
                ?.closedOutcomes
            ),

          interviewConversionRate:
            finitePercentage(
              value
                ?.interviewConversionRate
            ),

          offerConversionRate:
            finitePercentage(
              value
                ?.offerConversionRate
            ),

          confidence:
            normaliseConfidence(
              value
                ?.confidence
            ),

          rationale:
            normaliseString(
              value
                ?.rationale,
              "",
              500
            )
        })
    );
}

function normaliseAdaptiveSignal(
  value
) {
  return Object.freeze({
    type:
      normaliseString(
        value?.type,
        "unknown",
        100
      ),

    direction:
      normaliseString(
        value?.direction,
        "advisory",
        50
      ),

    severity:
      normaliseString(
        value?.severity,
        "low",
        50
      ),

    confidence:
      normaliseConfidence(
        value?.confidence
      ),

    reason:
      normaliseString(
        value?.reason,
        "",
        500
      )
  });
}

function normaliseHistoricalEvidence(
  value
) {
  if (
    !isRecord(
      value
    )
  ) {
    return null;
  }

  return Object.freeze({
    companySponsorshipMatched:
      value
        .companySponsorshipMatched ===
      true,

    companySponsorshipObservations:
      nonNegativeInteger(
        value
          .companySponsorshipObservations
      ),

    companySponsorshipStatus:
      normaliseNullableString(
        value
          .companySponsorshipStatus,
        80
      ),

    companySponsorshipConfidence:
      normaliseConfidence(
        value
          .companySponsorshipConfidence
      ),

    companySponsorshipLastObservedAt:
      normaliseNullableString(
        value
          .companySponsorshipLastObservedAt,
        100
      ),

    roleOutcomeApplications:
      nonNegativeInteger(
        value
          .roleOutcomeApplications
      ),

    regionOutcomeApplications:
      nonNegativeInteger(
        value
          .regionOutcomeApplications
      ),

    experienceOutcomeApplications:
      nonNegativeInteger(
        value
          .experienceOutcomeApplications
      )
  });
}

function normaliseStringList(
  value,
  maximumItems,
  maximumLength
) {
  return Object.freeze(
    (
      Array.isArray(
        value
      )
        ? value
        : []
    )
      .slice(
        0,
        maximumItems
      )
      .map(
        (item) =>
          normaliseString(
            item,
            "",
            maximumLength
          )
      )
      .filter(
        Boolean
      )
  );
}

function normaliseConfidence(
  value
) {
  const text =
    String(
      value ??
      ""
    )
      .trim()
      .toLowerCase();

  return [
    "low",
    "medium",
    "high"
  ].includes(
    text
  )
    ? text
    : "low";
}

function finitePercentage(
  value
) {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        number *
          10
      ) /
        10
    )
  );
}

function nonNegativeInteger(
  value
) {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    ) ||
    number <
      0
  ) {
    return 0;
  }

  return Math.floor(
    number
  );
}

function normaliseNullableString(
  value,
  maximumLength
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return normaliseString(
    value,
    "",
    maximumLength
  ) || null;
}

function normaliseString(
  value,
  fallback,
  maximumLength
) {
  const text =
    String(
      value ??
      ""
    )
      .trim();

  if (
    text ===
      ""
  ) {
    return fallback;
  }

  return text.slice(
    0,
    maximumLength
  );
}

function isRecord(
  value
) {
  return (
    value !==
      null &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  );
}

function deepFreeze(
  value
) {
  if (
    value &&
    typeof value ===
      "object" &&
    !Object.isFrozen(
      value
    )
  ) {
    Object.freeze(
      value
    );

    for (
      const nested of
      Object.values(
        value
      )
    ) {
      deepFreeze(
        nested
      );
    }
  }

  return value;
}
