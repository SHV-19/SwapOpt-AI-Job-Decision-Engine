export const CAREER_LEARNING_LOOP_SCHEMA_VERSION = 1;
export const CAREER_LEARNING_LOOP_CALCULATION_VERSION = "2026-08-14.1";

const SUBMITTED_STATUSES = new Set([
  "applied",
  "interview",
  "offer",
  "rejected",
  "withdrawn"
]);

const CLOSED_STATUSES = new Set([
  "offer",
  "rejected",
  "withdrawn"
]);

const RECOMMENDATIONS = [
  "Apply",
  "Tailor",
  "Save",
  "Skip"
];

const INTERVIEW_EVENT_TYPES = new Set([
  "interview-stage-entered",
  "offer-received"
]);

const OFFER_EVENT_TYPES = new Set([
  "offer-received"
]);

export function calculateCareerLearningLoop(dataset, {
  generatedAt = new Date().toISOString(),
  careerEvidenceSummary = null,
  auditLimit = 250
} = {}) {
  const snapshotsByJob = latestByJob(
    dataset?.snapshots,
    (item) => item.capturedAt ?? item.updatedAt ?? item.createdAt
  );
  const decisionsByJob = latestByJob(
    dataset?.decisions,
    (item) => item.decidedAt ?? item.updatedAt ?? item.createdAt
  );
  const applicationsByJob = latestByJob(
    dataset?.applications,
    (item) => item.updatedAt ?? item.dateApplied ?? item.createdAt
  );
  const analysesByJob = latestByJob(
    dataset?.jobAnalyses,
    (item) =>
      item.metadata?.completedAt ??
      item.updatedAt ??
      item.createdAt
  );
  const eventsByApplication = groupEventsByApplication(
    dataset?.applicationStatusEvents
  );

  const jobIds = new Set([
    ...snapshotsByJob.keys(),
    ...decisionsByJob.keys(),
    ...applicationsByJob.keys(),
    ...analysesByJob.keys()
  ]);

  const audits = [...jobIds]
    .map((jobId) =>
      createAudit({
        jobId,
        snapshot: snapshotsByJob.get(jobId) ?? null,
        decision: decisionsByJob.get(jobId) ?? null,
        application: applicationsByJob.get(jobId) ?? null,
        analysis: analysesByJob.get(jobId) ?? null,
        eventsByApplication,
        generatedAt
      })
    )
    .filter((item) => item.recommendation !== null || item.application !== null)
    .sort(compareAuditDates);

  const returnedAudits =
    auditLimit === null
      ? audits
      : audits.slice(
          0,
          clampInteger(auditLimit, 1, 1000, 250)
        );

  const submitted = audits.filter((item) => item.submitted);
  const closed = submitted.filter((item) => item.closed);
  const interviewReached = submitted.filter((item) => item.interviewReached);
  const offers = submitted.filter((item) => item.offerReached);
  const influenced = audits.filter((item) => item.learningInfluenced);
  const aligned = audits.filter((item) => item.behaviorAlignment === "consistent");
  const divergent = audits.filter((item) => item.behaviorAlignment === "divergent");

  const calibration = buildRecommendationCalibration(audits);
  const learningInfluence = buildLearningInfluenceComparison(audits);
  const drift = buildRecencyDrift(submitted);
  const readiness = buildReadiness({
    audits: audits.length,
    submitted: submitted.length,
    closed: closed.length,
    interviewReached: interviewReached.length,
    learningInfluenced: influenced.length
  });
  const maturity = buildMaturity({
    readiness,
    evidence: careerEvidenceSummary
  });
  const actions = buildActions({
    readiness,
    drift,
    audits,
    submitted,
    closed,
    divergent
  });

  return deepFreeze({
    schemaVersion: CAREER_LEARNING_LOOP_SCHEMA_VERSION,
    calculationVersion: CAREER_LEARNING_LOOP_CALCULATION_VERSION,
    generatedAt,
    mode: "deterministic-observational-decision-feedback-loop",

    readiness,

    summary: {
      auditedDecisions: audits.length,
      submittedApplications: submitted.length,
      closedOutcomes: closed.length,
      interviewStageReached: interviewReached.length,
      offers: offers.length,
      learningInfluencedDecisions: influenced.length,
      historicalSignalsUsed: audits.filter((item) => item.historicalSignalsUsed > 0).length,
      behaviorConsistentWithRecommendation: aligned.length,
      behaviorDivergedFromRecommendation: divergent.length,
      interviewRateAmongSubmitted: percentage(interviewReached.length, submitted.length),
      offerRateAmongSubmitted: percentage(offers.length, submitted.length)
    },

    maturity,
    calibration,
    learningInfluence,
    drift,
    actions,
    audits: returnedAudits,

    definitions: {
      auditedDecision:
        "A stored job-analysis recommendation paired with observed user action and application outcome evidence when available.",
      behaviorAlignment:
        "Observed action consistency with the recommendation. It is not proof that the recommendation was correct or that the user intentionally followed it.",
      learningInfluence:
        "A recommendation is marked learning-influenced only when persisted Career Outcome metadata shows historical intelligence changed the recommendation or time priority.",
      calibration:
        "Observed follow-through and outcome rates grouped by the recommendation recorded at decision time. These rates are descriptive, not predictive probabilities.",
      drift:
        "A descriptive comparison between recent and prior submitted-application cohorts. Drift never changes a recommendation by itself."
    },

    guardrails: [
      "Current job-posting evidence and hard eligibility constraints remain authoritative.",
      "Observed outcomes are associations only and do not establish causality or counterfactual success.",
      "No conclusion is drawn from a recommendation the user did not act on.",
      "Recent drift is advisory and cannot automatically rewrite recommendation policy.",
      "Protected demographic information is not used in learning-loop calculations.",
      "The learning loop makes no additional OpenAI request."
    ]
  });
}

function createAudit({
  jobId,
  snapshot,
  decision,
  application,
  analysis,
  eventsByApplication,
  generatedAt
}) {
  const careerOutcome = isRecord(analysis?.metadata?.careerOutcome)
    ? analysis.metadata.careerOutcome
    : {};

  const recommendation =
    normalizeRecommendation(
      careerOutcome?.recommendation?.decision ??
      analysis?.analysis?.decision ??
      decision?.aiRecommendationAtDecision ??
      null
    );

  const baselineRecommendation =
    normalizeRecommendation(
      careerOutcome?.baseline?.decision ??
      recommendation
    );

  const applicationStatus = normalizeStatus(application?.status);
  const submitted =
    isSubmittedApplication(application, applicationStatus);
  const events =
    application?.id
      ? eventsByApplication.get(application.id) ?? []
      : [];
  const lifecycle = deriveLifecycle({
    application,
    status: applicationStatus,
    events
  });
  const analyzedAt =
    analysis?.metadata?.completedAt ??
    analysis?.updatedAt ??
    analysis?.createdAt ??
    snapshot?.capturedAt ??
    null;
  const appliedAt =
    application?.dateApplied ??
    lifecycle.submittedAt ??
    null;

  const behaviorAlignment =
    classifyBehaviorAlignment({
      recommendation,
      submitted,
      analyzedAt,
      generatedAt
    });

  const historicalSignalsUsed =
    Array.isArray(careerOutcome?.matchedHistoricalSignals)
      ? careerOutcome.matchedHistoricalSignals.length
      : Array.isArray(analysis?.metadata?.adaptiveLearning?.signals)
        ? analysis.metadata.adaptiveLearning.signals.length
        : 0;

  const learningInfluenced =
    careerOutcome?.recommendationChanged === true ||
    careerOutcome?.timePriorityChanged === true ||
    careerOutcome?.changed === true;

  return {
    jobId,
    jobAnalysisId: analysis?.id ?? null,
    applicationId: application?.id ?? null,
    snapshotId: snapshot?.id ?? null,
    company:
      snapshot?.company?.canonicalName ??
      analysis?.analysis?.company ??
      null,
    role:
      snapshot?.role?.canonicalName ??
      analysis?.analysis?.job_title ??
      null,
    sourcePlatform: snapshot?.sourcePlatform ?? null,
    recommendation,
    baselineRecommendation,
    userDecision: normalizeUserDecision(decision?.decision),
    learningInfluenced,
    historicalSignalsUsed,
    learningReadinessAtDecision:
      careerOutcome?.readiness?.stage ??
      null,
    currentMatchPercent:
      finitePercentage(
        careerOutcome?.baseline?.currentMatchPercent ??
        analysis?.analysis?.current_match_percent
      ),
    submitted,
    application: application
      ? {
          status: application?.status ?? null,
          dateApplied: application?.dateApplied ?? null
        }
      : null,
    behaviorAlignment,
    interviewReached: lifecycle.interviewReached,
    offerReached: lifecycle.offerReached,
    closed: lifecycle.closed,
    outcome: lifecycle.outcome,
    analyzedAt,
    appliedAt,
    lastObservedAt:
      application?.updatedAt ??
      decision?.updatedAt ??
      snapshot?.capturedAt ??
      analyzedAt
  };
}

function deriveLifecycle({
  application,
  status,
  events
}) {
  const normalizedStatuses = new Set(
    events
      .map((event) => normalizeStatus(event?.newStatus))
      .filter(Boolean)
  );

  if (status) {
    normalizedStatuses.add(status);
  }

  const eventTypes = new Set(
    events
      .map((event) =>
        typeof event?.eventType === "string"
          ? event.eventType.trim().toLowerCase()
          : ""
      )
      .filter(Boolean)
  );

  const interviewReached =
    normalizedStatuses.has("interview") ||
    normalizedStatuses.has("offer") ||
    [...eventTypes].some((value) => INTERVIEW_EVENT_TYPES.has(value)) ||
    Boolean(application?.interviewAt);

  const offerReached =
    normalizedStatuses.has("offer") ||
    [...eventTypes].some((value) => OFFER_EVENT_TYPES.has(value));

  const rejected = status === "rejected";
  const withdrawn = status === "withdrawn";
  const closed = CLOSED_STATUSES.has(status);

  let outcome = "not-submitted";

  if (isSubmittedApplication(application, status)) {
    outcome = "open";
  }
  if (interviewReached) {
    outcome = "interview-stage";
  }
  if (offerReached) {
    outcome = "offer";
  } else if (rejected) {
    outcome = interviewReached
      ? "rejected-after-interview"
      : "rejected-before-interview";
  } else if (withdrawn) {
    outcome = interviewReached
      ? "withdrawn-after-interview"
      : "withdrawn";
  }

  const submittedAt =
    application?.dateApplied ??
    events.find((event) =>
      normalizeEventType(event?.eventType) === "application-submitted"
    )?.eventAt ??
    null;

  return {
    interviewReached,
    offerReached,
    closed,
    outcome,
    submittedAt
  };
}

function classifyBehaviorAlignment({
  recommendation,
  submitted,
  analyzedAt,
  generatedAt
}) {
  if (!recommendation) {
    return "unknown";
  }

  if (recommendation === "Apply" || recommendation === "Tailor") {
    if (submitted) {
      return "consistent";
    }
    return daysBetween(analyzedAt, generatedAt) >= 14
      ? "divergent"
      : "unresolved";
  }

  if (recommendation === "Save" || recommendation === "Skip") {
    return submitted
      ? "divergent"
      : "consistent";
  }

  return "unknown";
}

function buildRecommendationCalibration(audits) {
  return RECOMMENDATIONS.map((recommendation) => {
    const rows = audits.filter((item) => item.recommendation === recommendation);
    const submitted = rows.filter((item) => item.submitted);
    const closed = submitted.filter((item) => item.closed);
    const interviews = submitted.filter((item) => item.interviewReached);
    const offers = submitted.filter((item) => item.offerReached);

    return {
      recommendation,
      observed: rows.length,
      submitted: submitted.length,
      closedOutcomes: closed.length,
      interviews: interviews.length,
      offers: offers.length,
      followThroughRate: percentage(submitted.length, rows.length),
      interviewRateAmongSubmitted: percentage(interviews.length, submitted.length),
      offerRateAmongSubmitted: percentage(offers.length, submitted.length),
      confidence: confidenceLabel(submitted.length, closed.length)
    };
  });
}

function buildLearningInfluenceComparison(audits) {
  const influenced = audits.filter((item) => item.learningInfluenced && item.submitted);
  const unchanged = audits.filter((item) => !item.learningInfluenced && item.submitted);
  const influencedClosed = influenced.filter((item) => item.closed);
  const unchangedClosed = unchanged.filter((item) => item.closed);

  const groups = {
    learningInfluenced: summarizeSubmittedGroup(influenced),
    unchanged: summarizeSubmittedGroup(unchanged)
  };

  const comparisonAvailable =
    influenced.length >= 5 &&
    unchanged.length >= 5 &&
    influencedClosed.length >= 2 &&
    unchangedClosed.length >= 2;

  const interviewRateDelta =
    comparisonAvailable
      ? round(
          groups.learningInfluenced.interviewRateAmongSubmitted -
          groups.unchanged.interviewRateAmongSubmitted,
          1
        )
      : null;

  return {
    comparisonAvailable,
    groups,
    interviewRateDeltaPercentagePoints: interviewRateDelta,
    interpretation:
      comparisonAvailable
        ? "The difference is an observed association between cohorts. It does not prove that historical learning caused the outcome difference."
        : "More submitted and closed outcomes are required before comparing learning-influenced and unchanged recommendation cohorts."
  };
}

function summarizeSubmittedGroup(rows) {
  const closed = rows.filter((item) => item.closed);
  const interviews = rows.filter((item) => item.interviewReached);
  const offers = rows.filter((item) => item.offerReached);

  return {
    submitted: rows.length,
    closedOutcomes: closed.length,
    interviews: interviews.length,
    offers: offers.length,
    interviewRateAmongSubmitted: percentage(interviews.length, rows.length),
    offerRateAmongSubmitted: percentage(offers.length, rows.length),
    confidence: confidenceLabel(rows.length, closed.length)
  };
}

function buildRecencyDrift(submitted) {
  const ordered = [...submitted].sort((a, b) =>
    dateValue(b.appliedAt ?? b.analyzedAt) -
    dateValue(a.appliedAt ?? a.analyzedAt)
  );

  if (ordered.length < 10) {
    return {
      status: "insufficient-data",
      direction: "unknown",
      recentSample: Math.min(ordered.length, 5),
      priorSample: 0,
      recentInterviewRate: null,
      priorInterviewRate: null,
      deltaPercentagePoints: null,
      affectsRecommendation: false,
      explanation:
        "At least 10 submitted applications are required for a recent-versus-prior drift check."
    };
  }

  const windowSize = ordered.length >= 20 ? 10 : 5;
  const recent = ordered.slice(0, windowSize);
  const prior = ordered.slice(windowSize, windowSize * 2);
  const recentRate = percentage(
    recent.filter((item) => item.interviewReached).length,
    recent.length
  );
  const priorRate = percentage(
    prior.filter((item) => item.interviewReached).length,
    prior.length
  );
  const delta = round(recentRate - priorRate, 1);
  const magnitude = Math.abs(delta);

  return {
    status: magnitude >= 20 ? "watch" : "stable",
    direction:
      delta >= 5
        ? "improving"
        : delta <= -5
          ? "declining"
          : "flat",
    recentSample: recent.length,
    priorSample: prior.length,
    recentInterviewRate: recentRate,
    priorInterviewRate: priorRate,
    deltaPercentagePoints: delta,
    affectsRecommendation: false,
    explanation:
      magnitude >= 20
        ? "Recent outcome mix differs materially from the prior cohort. Review role, source, sponsorship, and market composition before changing policy."
        : "No material recent-versus-prior interview-rate drift is visible in the available submitted-application cohorts."
  };
}

function buildReadiness({
  audits,
  submitted,
  closed,
  interviewReached,
  learningInfluenced
}) {
  let stage = "collecting";

  if (submitted >= 50 && closed >= 20 && audits >= 60) {
    stage = "established";
  } else if (submitted >= 15 && closed >= 5 && audits >= 20) {
    stage = "compounding";
  } else if (submitted >= 5 && closed >= 2) {
    stage = "learning";
  }

  return {
    stage,
    auditedDecisions: audits,
    submittedApplications: submitted,
    closedOutcomes: closed,
    interviewStageReached: interviewReached,
    learningInfluencedDecisions: learningInfluenced,
    explanation: {
      collecting:
        "SwapOpt is collecting enough linked decisions and outcomes to evaluate its historical recommendation behavior.",
      learning:
        "SwapOpt has enough outcome history for cautious descriptive learning, but small-sample guardrails remain important.",
      compounding:
        "Decision and outcome history is large enough for repeated personal patterns to compound across future recommendations.",
      established:
        "The personal decision history is substantial enough for mature longitudinal auditing while current-job evidence remains authoritative."
    }[stage]
  };
}

function buildMaturity({
  readiness,
  evidence
}) {
  const evidenceNodes = nonNegativeInteger(evidence?.nodes);
  const evidenceEdges = nonNegativeInteger(evidence?.edges);
  const userConfirmedNodes = nonNegativeInteger(evidence?.userConfirmedNodes);
  const verifiedSourceNodes = nonNegativeInteger(evidence?.verifiedSourceNodes);

  const evidenceReady =
    evidence === null ||
    evidence === undefined
      ? null
      : evidenceNodes >= 10 &&
        (userConfirmedNodes + verifiedSourceNodes) >= 5;

  return {
    stage: readiness.stage,
    evidenceReady,
    decisionEligibleNodes: evidenceNodes,
    decisionEligibleEdges: evidenceEdges,
    userConfirmedNodes,
    verifiedSourceNodes,
    longitudinalAdvantage:
      readiness.stage === "compounding" ||
      readiness.stage === "established"
        ? "compounding"
        : readiness.stage === "learning"
          ? "emerging"
          : "collecting",
    explanation:
      "The defensible asset is the linked history of verified evidence, stored decisions, user actions, ATS/application behavior, and outcomes—not any single UI feature."
  };
}

function buildActions({
  readiness,
  drift,
  audits,
  submitted,
  closed,
  divergent
}) {
  const actions = [];

  if (submitted.length < 5) {
    actions.push({
      priority: "High",
      action: "Keep application outcomes current",
      reason:
        `Only ${submitted.length} submitted applications are linked to decision history. Accurate Applied, Interview, Offer, and Rejected updates are what make the learning loop useful.`
    });
  } else if (closed.length < 2) {
    actions.push({
      priority: "High",
      action: "Record closed outcomes consistently",
      reason:
        `There are ${submitted.length} submitted applications but only ${closed.length} closed outcomes, so outcome comparisons remain incomplete.`
    });
  }

  if (drift.status === "watch") {
    actions.push({
      priority: "Medium",
      action: "Review recent outcome drift before changing strategy",
      reason: drift.explanation
    });
  }

  if (divergent.length >= 3) {
    actions.push({
      priority: "Medium",
      action: "Review recommendation overrides",
      reason:
        `${divergent.length} observed actions diverged from the stored recommendation. Review whether the recommendation, constraints, or user preference changed.`
    });
  }

  const withoutAnalysis =
    audits.filter((item) => item.recommendation === null).length;

  if (withoutAnalysis > 0) {
    actions.push({
      priority: "Low",
      action: "Improve decision-history coverage",
      reason:
        `${withoutAnalysis} tracked opportunities do not have a recoverable stored recommendation, reducing audit completeness.`
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: "Maintain",
      action: "Continue the closed-loop workflow",
      reason:
        `${readiness.submittedApplications} submitted applications and ${readiness.closedOutcomes} closed outcomes are linked to stored decisions. Continue recording outcomes so longitudinal evidence compounds.`
    });
  }

  return actions.slice(0, 5);
}

function groupEventsByApplication(events) {
  const grouped = new Map();

  for (const event of Array.isArray(events) ? events : []) {
    const id =
      typeof event?.applicationId === "string"
        ? event.applicationId
        : null;

    if (!id) {
      continue;
    }

    const rows = grouped.get(id) ?? [];
    rows.push(event);
    grouped.set(id, rows);
  }

  for (const rows of grouped.values()) {
    rows.sort((a, b) =>
      dateValue(a.eventAt ?? a.createdAt) -
      dateValue(b.eventAt ?? b.createdAt)
    );
  }

  return grouped;
}

function latestByJob(values, dateFactory) {
  const map = new Map();

  for (const value of Array.isArray(values) ? values : []) {
    const jobId =
      typeof value?.jobId === "string"
        ? value.jobId
        : null;

    if (!jobId) {
      continue;
    }

    const current = map.get(jobId);

    if (
      !current ||
      dateValue(dateFactory?.(value)) >=
        dateValue(dateFactory?.(current))
    ) {
      map.set(jobId, value);
    }
  }

  return map;
}

function compareAuditDates(a, b) {
  return (
    dateValue(b.appliedAt ?? b.analyzedAt ?? b.lastObservedAt) -
    dateValue(a.appliedAt ?? a.analyzedAt ?? a.lastObservedAt)
  );
}

function isSubmittedApplication(application, status = normalizeStatus(application?.status)) {
  return Boolean(application?.dateApplied) || SUBMITTED_STATUSES.has(status);
}

function normalizeStatus(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function normalizeEventType(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function normalizeRecommendation(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return {
    apply: "Apply",
    "apply immediately": "Apply",
    tailor: "Tailor",
    "tailor first": "Tailor",
    save: "Save",
    "save for later": "Save",
    skip: "Skip"
  }[normalized] ?? null;
}

function normalizeUserDecision(value) {
  if (typeof value !== "string") {
    return null;
  }

  return {
    apply: "Proceed",
    save: "Save",
    skip: "Skip"
  }[value.trim().toLowerCase()] ?? value.trim();
}

function confidenceLabel(submitted, closed) {
  if (submitted >= 15 && closed >= 8) {
    return "high";
  }
  if (submitted >= 5 && closed >= 2) {
    return "medium";
  }
  return "low";
}

function percentage(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  return round(
    Math.min(100, Math.max(0, (numerator / denominator) * 100)),
    1
  );
}

function finitePercentage(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return round(Math.min(100, Math.max(0, numeric)), 1);
}

function daysBetween(start, end) {
  const startMs = dateValue(start);
  const endMs = dateValue(end);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs === 0 || endMs === 0) {
    return 0;
  }

  return Math.max(0, Math.floor((endMs - startMs) / 86_400_000));
}

function dateValue(value) {
  const time = new Date(value ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function nonNegativeInteger(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(0, Math.floor(numeric))
    : 0;
}

function clampInteger(value, minimum, maximum, fallback) {
  const numeric = Number(value);

  if (!Number.isInteger(numeric)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, numeric));
}

function round(value, places = 1) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}
