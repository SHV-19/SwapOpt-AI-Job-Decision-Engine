import {
  createMarketSnapshotInput,
  normaliseEntityKey
} from "./market-intelligence/normalization.js";

import {
  validateJobAnalysisResponse
} from "../validation/job-analysis-response.js";

export const ADAPTIVE_JOB_ANALYSIS_POLICY_VERSION =
  "2026-08-12.1";

export const ADAPTIVE_JOB_ANALYSIS_METADATA_SCHEMA_VERSION =
  1;

const NEGATIVE_SPONSORSHIP_STATUSES =
  new Set([
    "restricted",
    "citizenship-required"
  ]);

const DECISION_RANK =
  Object.freeze({
    Apply: 0,
    Tailor: 1,
    Save: 2,
    Skip: 3
  });

const TIME_PRIORITY_RANK =
  Object.freeze({
    High: 0,
    Medium: 1,
    Low: 2
  });

const MAX_SIGNALS =
  8;

export function applyAdaptiveJobAnalysis({
  payload,
  analysis,
  personalLearningProfile
} = {}) {
  const validatedAnalysis =
    validateJobAnalysisResponse(
      analysis
    );

  const profile =
    isRecord(
      personalLearningProfile
    )
      ? personalLearningProfile
      : {};

  const currentSnapshot =
    createMarketSnapshotInput({
      job: {
        pageText:
          typeof payload?.pageText ===
          "string"
            ? payload.pageText
            : "",
        url:
          payload?.url ?? null,
        title:
          validatedAnalysis.job_title,
        company:
          validatedAnalysis.company,
        location:
          validatedAnalysis.location
      },
      jobAnalysis: {
        analysis:
          validatedAnalysis
      }
    });

  const evidence =
    collectAdaptiveEvidence({
      profile,
      snapshot:
        currentSnapshot
    });

  const adapted =
    profile
      .affectsJobRecommendation ===
      true
      ? createAdaptedAnalysis({
          analysis:
            validatedAnalysis,
          snapshot:
            currentSnapshot,
          evidence
        })
      : {
          analysis:
            validatedAnalysis,
          adjustments:
            []
        };

  const finalAnalysis =
    validateJobAnalysisResponse(
      adapted.analysis
    );

  return deepFreeze({
    analysis:
      finalAnalysis,
    metadata:
      createAdaptiveMetadata({
        originalAnalysis:
          validatedAnalysis,
        finalAnalysis,
        snapshot:
          currentSnapshot,
        evidence,
        adjustments:
          adapted.adjustments,
        profile
      })
  });
}

function collectAdaptiveEvidence({
  profile,
  snapshot
}) {
  const companySignal =
    findByNormalizedKey(
      profile
        .companySponsorshipSignals,
      "companyKey",
      snapshot.company
        .normalizedKey
    );

  const companyOutcome =
    findByNormalizedKey(
      profile.companyOutcomeSignals,
      "company",
      snapshot.company
        .canonicalName
    );

  const roleOutcome =
    findByNormalizedKey(
      profile.roleOutcomeSignals,
      "roleFamily",
      snapshot.role
        .canonicalName
    );

  const regionOutcome =
    findByNormalizedKey(
      profile
        .locationOutcomeSignals,
      "region",
      snapshot.region
    );

  const experienceBand =
    createExperienceBand(
      snapshot
        .experienceRequirements
    );

  const experienceOutcome =
    findByNormalizedKey(
      profile
        .experienceOutcomeSignals,
      "experienceBand",
      experienceBand
    );

  const skillOutcomes =
    (Array.isArray(
      snapshot.skills
    )
      ? snapshot.skills
      : [])
      .map((skill) =>
        findByNormalizedKey(
          profile
            .skillOutcomeSignals,
          "skill",
          skill?.name
        )
      )
      .filter(Boolean)
      .sort(compareOutcomeSignals)
      .slice(0, 5);

  const roleScope =
    findScope(
      companySignal
        ?.roleFamilyScopes,
      snapshot.role
        .canonicalName
    );

  const regionScope =
    findScope(
      companySignal
        ?.regionScopes,
      snapshot.region
    );

  return {
    currentSponsorship:
      snapshot.sponsorship,
    companySignal,
    companyOutcome,
    roleScope,
    regionScope,
    roleOutcome,
    regionOutcome,
    experienceBand,
    experienceOutcome,
    skillOutcomes
  };
}

function createAdaptedAnalysis({
  analysis,
  snapshot,
  evidence
}) {
  const next =
    structuredClone(
      analysis
    );

  const adjustments =
    [];

  const currentSponsorship =
    evidence
      .currentSponsorship;

  const explicitCurrentRestriction =
    currentSponsorship
      ?.explicit ===
      true &&
    NEGATIVE_SPONSORSHIP_STATUSES
      .has(
        currentSponsorship
          .status
      );

  const explicitCurrentAvailability =
    currentSponsorship
      ?.explicit ===
      true &&
    currentSponsorship
      .status ===
      "available";

  if (
    explicitCurrentRestriction
  ) {
    applyCurrentPostingRestriction({
      next,
      currentSponsorship,
      adjustments
    });
  } else if (
    explicitCurrentAvailability
  ) {
    applyCurrentPostingAvailability({
      next,
      evidence,
      adjustments
    });
  } else {
    applyHistoricalSponsorship({
      next,
      snapshot,
      evidence,
      adjustments
    });
  }

  applyOutcomeLearning({
    next,
    evidence,
    hasStrongNegativeEligibility:
      adjustments.some(
        (item) =>
          item.severity ===
            "hard" ||
          item.type ===
            "historical-sponsorship-restriction"
      ),
    adjustments
  });

  appendAdaptiveExplanation({
    next,
    evidence,
    adjustments
  });

  return {
    analysis:
      next,
    adjustments
  };
}

function applyCurrentPostingRestriction({
  next,
  currentSponsorship,
  adjustments
}) {
  const statusLabel =
    currentSponsorship
      .status ===
      "citizenship-required"
        ? "a citizenship requirement"
        : "an explicit sponsorship restriction";

  next.decision =
    "Skip";
  next.time_priority =
    "Low";
  next.h1b_risk =
    "High";
  next.sponsorship_risk_score =
    10;
  next.target_level =
    "Not Worth Time";
  next.next_action =
    limitText(
      `Skip unless the employer confirms an exception: this posting contains ${statusLabel}.`,
      300
    );

  adjustments.push({
    type:
      "current-posting-sponsorship-blocker",
    direction:
      "negative",
    severity:
      "hard",
    confidence:
      "high",
    reason:
      currentSponsorship
        .evidence ??
      "The current posting explicitly restricts sponsorship."
  });
}

function applyCurrentPostingAvailability({
  next,
  evidence,
  adjustments
}) {
  next.h1b_risk =
    "Low";

  next.sponsorship_risk_score =
    Math.min(
      finiteInteger(
        next
          .sponsorship_risk_score,
        10
      ),
      3
    );

  const historicalNegative =
    isStrongHistoricalRestriction(
      evidence
        .companySignal
    );

  adjustments.push({
    type:
      historicalNegative
        ? "current-posting-overrides-history"
        : "current-posting-sponsorship-available",
    direction:
      "positive",
    severity:
      "strong",
    confidence:
      "high",
    reason:
      historicalNegative
        ? "The current posting explicitly offers sponsorship, so older company restrictions do not downgrade this recommendation."
        : "The current posting explicitly indicates sponsorship availability."
  });
}

function applyHistoricalSponsorship({
  next,
  snapshot,
  evidence,
  adjustments
}) {
  const companySignal =
    evidence.companySignal;

  if (
    !companySignal
  ) {
    return;
  }

  if (
    companySignal
      .dominantStatus ===
      "mixed"
  ) {
    adjustments.push({
      type:
        "historical-sponsorship-mixed",
      direction:
        "neutral",
      severity:
        "advisory",
      confidence:
        companySignal
          .confidence ??
        "low",
      reason:
        `${companySignal.explicitObservationCount ?? 0} prior explicit sponsorship observations for ${companySignal.company ?? snapshot.company.canonicalName} are mixed, so no recommendation change is made.`
    });
    return;
  }

  if (
    companySignal
      .dominantStatus ===
      "available" &&
    isStrongHistoricalAvailability(
      companySignal
    )
  ) {
    if (
      next.h1b_risk ===
        "High" ||
      next.h1b_risk ===
        "Unknown"
    ) {
      next.h1b_risk =
        "Medium";
    }

    next.sponsorship_risk_score =
      Math.min(
        finiteInteger(
          next
            .sponsorship_risk_score,
          10
        ),
        5
      );

    adjustments.push({
      type:
        "historical-sponsorship-available",
      direction:
        "positive",
      severity:
        "advisory",
      confidence:
        companySignal
          .confidence,
      reason:
        `${companySignal.explicitObservationCount} recent explicit company observations consistently indicated sponsorship availability. Current-posting evidence still takes priority.`
    });
    return;
  }

  if (
    !isStrongHistoricalRestriction(
      companySignal
    )
  ) {
    if (
      NEGATIVE_SPONSORSHIP_STATUSES
        .has(
          companySignal
            .dominantStatus
        )
    ) {
      adjustments.push({
        type:
          "historical-sponsorship-caution",
        direction:
          "negative",
        severity:
          "advisory",
        confidence:
          companySignal
            .confidence ??
          "low",
        reason:
          `${companySignal.explicitObservationCount ?? 0} prior company sponsorship observation(s) indicate possible restriction, but the evidence is not strong enough to change the recommendation.`
      });
    }
    return;
  }

  const roleSupport =
    isScopedRestrictionSupport(
      evidence.roleScope,
      companySignal
        .dominantStatus
    );

  const regionSupport =
    isScopedRestrictionSupport(
      evidence.regionScope,
      companySignal
        .dominantStatus
    );

  const hardHistoricalPattern =
    roleSupport.strong ||
    regionSupport.strong ||
    (
      roleSupport.supported &&
      regionSupport.supported
    );

  if (
    hardHistoricalPattern
  ) {
    next.decision =
      moreConservativeDecision(
        next.decision,
        "Skip"
      );
    next.target_level =
      "Not Worth Time";
  } else {
    next.decision =
      moreConservativeDecision(
        next.decision,
        "Save"
      );
    if (
      next.target_level ===
        "Strong Target" ||
      next.target_level ===
        "Possible Target"
    ) {
      next.target_level =
        "Weak Target";
    }
  }

  next.time_priority =
    "Low";
  next.h1b_risk =
    "High";
  next.sponsorship_risk_score =
    Math.max(
      finiteInteger(
        next
          .sponsorship_risk_score,
        0
      ),
      hardHistoricalPattern
        ? 9
        : 8
    );

  const scopeText =
    createScopeText({
      roleSupport,
      regionSupport
    });

  next.next_action =
    limitText(
      hardHistoricalPattern
        ? `Skip unless this posting or a recruiter confirms sponsorship. SwapOpt has ${companySignal.explicitObservationCount} recent explicit company observations indicating restriction${scopeText}.`
        : `Verify sponsorship before tailoring or applying. SwapOpt has ${companySignal.explicitObservationCount} recent explicit company observations indicating restriction.`,
      300
    );

  adjustments.push({
    type:
      "historical-sponsorship-restriction",
    direction:
      "negative",
    severity:
      hardHistoricalPattern
        ? "strong"
        : "moderate",
    confidence:
      companySignal
        .confidence,
    reason:
      `Historical sponsorship evidence is ${companySignal.patternStrength} with ${formatPercent(companySignal.consistency)} consistency and was last observed ${formatRecency(companySignal.recencyDays)}${scopeText}.`
  });
}

function applyOutcomeLearning({
  next,
  evidence,
  hasStrongNegativeEligibility,
  adjustments
}) {
  const companyEffect =
    classifyOutcomeEffect(
      evidence.companyOutcome
    );

  const roleEffect =
    classifyOutcomeEffect(
      evidence.roleOutcome
    );

  const regionEffect =
    classifyOutcomeEffect(
      evidence.regionOutcome
    );

  const experienceEffect =
    classifyOutcomeEffect(
      evidence
        .experienceOutcome
    );

  const skillEffects =
    evidence.skillOutcomes
      .map((signal) => ({
        signal,
        effect:
          classifyOutcomeEffect(
            signal
          )
      }))
      .filter(
        (item) =>
          item.effect !==
          "insufficient"
      );

  addOutcomeAdjustment({
    adjustments,
    type:
      "company-outcome",
    signal:
      evidence.companyOutcome,
    effect:
      companyEffect,
    label:
      evidence.companyOutcome
        ?.company
  });

  addOutcomeAdjustment({
    adjustments,
    type:
      "role-outcome",
    signal:
      evidence.roleOutcome,
    effect:
      roleEffect,
    label:
      evidence.roleOutcome
        ?.roleFamily
  });

  addOutcomeAdjustment({
    adjustments,
    type:
      "region-outcome",
    signal:
      evidence.regionOutcome,
    effect:
      regionEffect,
    label:
      evidence.regionOutcome
        ?.region
  });

  addOutcomeAdjustment({
    adjustments,
    type:
      "experience-outcome",
    signal:
      evidence
        .experienceOutcome,
    effect:
      experienceEffect,
    label:
      evidence
        .experienceBand
  });

  for (
    const {
      signal,
      effect
    } of skillEffects
      .slice(0, 3)
  ) {
    addOutcomeAdjustment({
      adjustments,
      type:
        "skill-outcome",
      signal,
      effect,
      label:
        signal.skill
    });
  }

  const establishedNegative =
    [
      {
        signal:
          evidence.companyOutcome,
        effect:
          companyEffect
      },
      {
        signal:
          evidence.roleOutcome,
        effect:
          roleEffect
      },
      {
        signal:
          evidence
            .experienceOutcome,
        effect:
          experienceEffect
      }
    ].some(
      ({ signal, effect }) =>
        effect ===
          "negative" &&
        signal?.confidence ===
          "high"
    );

  const establishedPositive =
    [
      {
        signal:
          evidence.companyOutcome,
        effect:
          companyEffect
      },
      {
        signal:
          evidence.roleOutcome,
        effect:
          roleEffect
      },
      {
        signal:
          evidence.regionOutcome,
        effect:
          regionEffect
      },
      {
        signal:
          evidence
            .experienceOutcome,
        effect:
          experienceEffect
      }
    ].some(
      ({ signal, effect }) =>
        effect ===
          "positive" &&
        signal?.confidence ===
          "high"
    );

  if (
    establishedNegative
  ) {
    const conservativePriority =
      moreConservativePriority(
        next.time_priority
      );

    next.time_priority =
      next.target_level ===
        "Strong Target" &&
      conservativePriority ===
        "Low"
        ? "Medium"
        : conservativePriority;

    if (
      next.decision ===
      "Apply"
    ) {
      next.decision =
        "Tailor";
    }
  } else if (
    establishedPositive &&
    !hasStrongNegativeEligibility &&
    next.decision !==
      "Skip"
  ) {
    next.time_priority =
      moreUrgentPriority(
        next.time_priority
      );
  }
}

function addOutcomeAdjustment({
  adjustments,
  type,
  signal,
  effect,
  label
}) {
  if (
    !signal ||
    effect ===
      "insufficient" ||
    effect ===
      "neutral"
  ) {
    return;
  }

  adjustments.push({
    type,
    direction:
      effect,
    severity:
      signal.confidence ===
        "high"
        ? "moderate"
        : "advisory",
    confidence:
      signal.confidence,
    reason:
      `${String(label ?? "Observed segment")} has ${signal.applications} prior application(s), ${signal.interviewConversionRate}% interview conversion, and ${signal.offerConversionRate}% offer conversion in this user's history.`
  });
}

function classifyOutcomeEffect(
  signal
) {
  if (
    !signal ||
    signal.applications <
      5 ||
    (
      signal.confidence !==
        "medium" &&
      signal.confidence !==
        "high"
    )
  ) {
    return "insufficient";
  }

  if (
    signal.interviewConversionRate >=
      25 ||
    signal.offerConversionRate >=
      10
  ) {
    return "positive";
  }

  if (
    signal.interviewConversionRate <=
      5 &&
    signal.closedOutcomes >=
      2
  ) {
    return "negative";
  }

  return "neutral";
}

function appendAdaptiveExplanation({
  next,
  evidence,
  adjustments
}) {
  if (
    adjustments.length ===
    0
  ) {
    return;
  }

  const material =
    adjustments.filter(
      (item) =>
        item.severity !==
        "advisory" ||
        item.type.includes(
          "sponsorship"
        )
    );

  if (
    material.length ===
    0
  ) {
    return;
  }

  const summary =
    material
      .slice(0, 3)
      .map(
        (item) =>
          item.reason
      )
      .join(" ");

  next.score_explanation =
    appendText(
      next
        .score_explanation,
      `Personal learning: ${summary}`,
      1_500
    );

  const strongestNegative =
    material.find(
      (item) =>
        item.direction ===
        "negative"
    );

  if (
    strongestNegative
  ) {
    next.why_they_might_pass =
      appendUniqueString(
        next
          .why_they_might_pass,
        `Personal learning: ${strongestNegative.reason}`,
        6,
        300
      );

    next.risk_or_overclaim_warning =
      appendText(
        next
          .risk_or_overclaim_warning,
        "Historical SwapOpt evidence is observational and must not be treated as a permanent employer policy; newer explicit posting or recruiter evidence overrides it.",
        600
      );
  } else if (
    evidence
      .currentSponsorship
      ?.status ===
      "available"
  ) {
    next.risk_or_overclaim_warning =
      appendText(
        next
          .risk_or_overclaim_warning,
        "The current posting's explicit sponsorship statement takes priority over older historical patterns.",
        600
      );
  }
}

function createAdaptiveMetadata({
  originalAnalysis,
  finalAnalysis,
  snapshot,
  evidence,
  adjustments,
  profile
}) {
  const boundedSignals =
    adjustments
      .slice(0, MAX_SIGNALS)
      .map((item) => ({
        type:
          limitText(
            item.type,
            80
          ),
        direction:
          item.direction,
        severity:
          item.severity,
        confidence:
          item.confidence,
        reason:
          limitText(
            item.reason,
            400
          )
      }));

  const originalDecision =
    originalAnalysis.decision;
  const finalDecision =
    finalAnalysis.decision;
  const originalPriority =
    originalAnalysis
      .time_priority;
  const finalPriority =
    finalAnalysis
      .time_priority;

  const material =
    adjustments.some(
      (item) =>
        item.severity ===
          "hard" ||
        item.severity ===
          "strong" ||
        item.severity ===
          "moderate"
    );

  return {
    schemaVersion:
      ADAPTIVE_JOB_ANALYSIS_METADATA_SCHEMA_VERSION,
    policyVersion:
      ADAPTIVE_JOB_ANALYSIS_POLICY_VERSION,
    applied:
      adjustments.length >
      0,
    material:
      material,
    recommendationChanged:
      originalDecision !==
      finalDecision,
    timePriorityChanged:
      originalPriority !==
      finalPriority,
    originalDecision,
    finalDecision,
    originalTimePriority:
      originalPriority,
    finalTimePriority:
      finalPriority,
    currentEvidence: {
      company:
        snapshot.company
          .canonicalName,
      roleFamily:
        snapshot.role
          .canonicalName,
      region:
        snapshot.region,
      sponsorshipStatus:
        snapshot.sponsorship
          .status,
      sponsorshipExplicit:
        snapshot.sponsorship
          .explicit ===
          true
    },
    historicalEvidence: {
      companySponsorshipMatched:
        Boolean(
          evidence
            .companySignal
        ),
      companySponsorshipObservations:
        finiteInteger(
          evidence
            .companySignal
            ?.explicitObservationCount,
          0
        ),
      companySponsorshipStatus:
        evidence
          .companySignal
          ?.dominantStatus ??
        null,
      companySponsorshipConfidence:
        evidence
          .companySignal
          ?.confidence ??
        null,
      companySponsorshipLastObservedAt:
        evidence
          .companySignal
          ?.lastObservedAt ??
        null,
      companyOutcomeApplications:
        finiteInteger(
          evidence
            .companyOutcome
            ?.applications,
          0
        ),
      roleOutcomeApplications:
        finiteInteger(
          evidence
            .roleOutcome
            ?.applications,
          0
        ),
      regionOutcomeApplications:
        finiteInteger(
          evidence
            .regionOutcome
            ?.applications,
          0
        ),
      experienceOutcomeApplications:
        finiteInteger(
          evidence
            .experienceOutcome
            ?.applications,
          0
        )
    },
    profileReadiness:
      profile.readiness
        ?.adaptiveScoring ??
      "unknown",
    signals:
      boundedSignals,
    explanation:
      createMetadataExplanation({
        adjustments:
          boundedSignals,
        originalDecision,
        finalDecision
      })
  };
}

function createMetadataExplanation({
  adjustments,
  originalDecision,
  finalDecision
}) {
  if (
    adjustments.length ===
    0
  ) {
    return "No sufficiently reliable personal-history signal changed or supplemented this analysis.";
  }

  if (
    originalDecision !==
    finalDecision
  ) {
    return `Personal learning adjusted the recommendation from ${originalDecision} to ${finalDecision}. Current-posting evidence remained authoritative over historical patterns.`;
  }

  return "Personal learning supplemented the analysis without changing the recommendation. Current-posting evidence remained authoritative over historical patterns.";
}

function isStrongHistoricalRestriction(
  signal
) {
  return Boolean(
    signal &&
    NEGATIVE_SPONSORSHIP_STATUSES
      .has(
        signal.dominantStatus
      ) &&
    signal.patternStrength ===
      "repeated-consistent" &&
    signal.confidence ===
      "high" &&
    finiteInteger(
      signal
        .explicitObservationCount,
      0
    ) >=
      4 &&
    Number.isFinite(
      signal.recencyDays
    ) &&
    signal.recencyDays <=
      180
  );
}

function isStrongHistoricalAvailability(
  signal
) {
  return Boolean(
    signal &&
    signal.dominantStatus ===
      "available" &&
    signal.patternStrength ===
      "repeated-consistent" &&
    signal.confidence ===
      "high" &&
    finiteInteger(
      signal
        .explicitObservationCount,
      0
    ) >=
      4 &&
    Number.isFinite(
      signal.recencyDays
    ) &&
    signal.recencyDays <=
      180
  );
}

function isScopedRestrictionSupport(
  scope,
  dominantStatus
) {
  const supported =
    Boolean(
      scope &&
      scope.dominantStatus ===
        dominantStatus &&
      scope.observationCount >=
        2 &&
      (
        scope.confidence ===
          "medium" ||
        scope.confidence ===
          "high"
      )
    );

  return {
    supported,
    strong:
      supported &&
      scope.observationCount >=
        3 &&
      scope.confidence ===
        "high",
    name:
      scope?.name ??
      null
  };
}

function createScopeText({
  roleSupport,
  regionSupport
}) {
  const scopes =
    [];

  if (
    roleSupport.supported
  ) {
    scopes.push(
      `matching role history (${roleSupport.name})`
    );
  }

  if (
    regionSupport.supported
  ) {
    scopes.push(
      `matching region history (${regionSupport.name})`
    );
  }

  if (
    scopes.length ===
    0
  ) {
    return "";
  }

  return `, including ${scopes.join(" and ")}`;
}

function findScope(
  scopes,
  value
) {
  if (
    !Array.isArray(
      scopes
    ) ||
    !value
  ) {
    return null;
  }

  const key =
    normaliseEntityKey(
      value
    );

  return scopes.find(
    (item) =>
      item?.normalizedKey ===
      key
  ) ?? null;
}

function findByNormalizedKey(
  values,
  field,
  target
) {
  if (
    !Array.isArray(
      values
    ) ||
    !target
  ) {
    return null;
  }

  const targetKey =
    normaliseEntityKey(
      target
    );

  return values.find(
    (item) =>
      normaliseEntityKey(
        item?.[field]
      ) ===
      targetKey
  ) ?? null;
}

function compareOutcomeSignals(
  a,
  b
) {
  return (
    finiteInteger(
      b?.applications,
      0
    ) -
      finiteInteger(
        a?.applications,
        0
      ) ||
    finiteNumber(
      b
        ?.interviewConversionRate,
      0
    ) -
      finiteNumber(
        a
          ?.interviewConversionRate,
        0
      )
  );
}

function createExperienceBand(
  requirements
) {
  const years =
    (Array.isArray(
      requirements
    )
      ? requirements
      : [])
      .map(
        (item) =>
          Number(
            item
              ?.minimumYears
          )
      )
      .filter(
        Number.isFinite
      );

  if (
    years.length ===
    0
  ) {
    return "not-stated";
  }

  const maximum =
    Math.max(
      ...years
    );

  if (
    maximum <=
    2
  ) {
    return "0-2-years";
  }

  if (
    maximum <=
    4
  ) {
    return "3-4-years";
  }

  if (
    maximum <=
    7
  ) {
    return "5-7-years";
  }

  return "8-plus-years";
}

function moreConservativeDecision(
  current,
  minimumDecision
) {
  const currentRank =
    DECISION_RANK[
      current
    ] ??
    0;

  const minimumRank =
    DECISION_RANK[
      minimumDecision
    ] ??
    0;

  return currentRank >=
    minimumRank
    ? current
    : minimumDecision;
}

function moreConservativePriority(
  current
) {
  const rank =
    TIME_PRIORITY_RANK[
      current
    ] ??
    1;

  return Object.keys(
    TIME_PRIORITY_RANK
  ).find(
    (key) =>
      TIME_PRIORITY_RANK[
        key
      ] ===
      Math.min(
        2,
        rank + 1
      )
  ) ?? "Low";
}

function moreUrgentPriority(
  current
) {
  const rank =
    TIME_PRIORITY_RANK[
      current
    ] ??
    1;

  return Object.keys(
    TIME_PRIORITY_RANK
  ).find(
    (key) =>
      TIME_PRIORITY_RANK[
        key
      ] ===
      Math.max(
        0,
        rank - 1
      )
  ) ?? "High";
}

function appendUniqueString(
  values,
  value,
  maxItems,
  maxLength
) {
  const current =
    Array.isArray(
      values
    )
      ? values
          .filter(
            (item) =>
              typeof item ===
                "string" &&
              item.trim() !==
                ""
          )
          .map(
            (item) =>
              limitText(
                item,
                maxLength
              )
          )
      : [];

  const candidate =
    limitText(
      value,
      maxLength
    );

  const duplicate =
    current.some(
      (item) =>
        item.localeCompare(
          candidate,
          undefined,
          {
            sensitivity:
              "accent"
          }
        ) ===
        0
    );

  if (
    !duplicate
  ) {
    current.push(
      candidate
    );
  }

  return current.slice(
    0,
    maxItems
  );
}

function appendText(
  current,
  addition,
  maxLength
) {
  const base =
    typeof current ===
      "string"
      ? current.trim()
      : "";

  const extra =
    typeof addition ===
      "string"
      ? addition.trim()
      : "";

  if (
    extra ===
    ""
  ) {
    return limitText(
      base,
      maxLength
    );
  }

  if (
    base.includes(
      extra
    )
  ) {
    return limitText(
      base,
      maxLength
    );
  }

  return limitText(
    [base, extra]
      .filter(Boolean)
      .join(" "),
    maxLength
  );
}

function limitText(
  value,
  maxLength
) {
  const text =
    String(
      value ??
      ""
    )
      .replace(
        /\s+/gu,
        " "
      )
      .trim();

  if (
    text.length <=
    maxLength
  ) {
    return text;
  }

  const sliced =
    text.slice(
      0,
      Math.max(
        0,
        maxLength - 1
      )
    )
      .trimEnd();

  return `${sliced}…`;
}

function formatPercent(
  value
) {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return "unknown";
  }

  return `${Math.round(value * 100)}%`;
}

function formatRecency(
  days
) {
  if (
    !Number.isFinite(
      days
    )
  ) {
    return "at an unknown time";
  }

  if (
    days ===
    0
  ) {
    return "today";
  }

  if (
    days ===
    1
  ) {
    return "1 day ago";
  }

  return `${days} days ago`;
}

function finiteInteger(
  value,
  fallback
) {
  return Number.isFinite(
    value
  )
    ? Math.max(
        0,
        Math.round(
          value
        )
      )
    : fallback;
}

function finiteNumber(
  value,
  fallback
) {
  return Number.isFinite(
    value
  )
    ? value
    : fallback;
}

function isRecord(
  value
) {
  return Boolean(
    value &&
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
    !value ||
    typeof value !==
      "object" ||
    Object.isFrozen(
      value
    )
  ) {
    return value;
  }

  Object.freeze(
    value
  );

  for (
    const child of Object.values(
      value
    )
  ) {
    deepFreeze(
      child
    );
  }

  return value;
}
