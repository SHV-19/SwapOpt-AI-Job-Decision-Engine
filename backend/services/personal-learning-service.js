import {
  assertMarketIntelligenceService
} from "./market-intelligence/market-intelligence-service.js";

import {
  normaliseEntityKey
} from "./market-intelligence/normalization.js";

export const PERSONAL_LEARNING_SERVICE_SCHEMA_VERSION = 1;
export const PERSONAL_LEARNING_CALCULATION_VERSION = "2026-08-12.3";

const APPLIED_STATUSES = new Set(["applied", "interview", "offer", "rejected"]);
const INTERVIEW_STATUSES = new Set(["interview", "offer"]);
const CLOSED_STATUSES = new Set(["offer", "rejected"]);
const SPONSORSHIP_STATUSES = new Set([
  "available",
  "restricted",
  "citizenship-required"
]);

export function createPersonalLearningService({
  marketIntelligenceService,
  clock = () => new Date()
} = {}) {
  const market = assertMarketIntelligenceService(marketIntelligenceService);

  async function getProfile(context) {
    const dataset = await market.getDataset(context);
    return buildPersonalLearningProfile(dataset, {
      generatedAt: clock().toISOString()
    });
  }

  async function getCompanySignal(context, {
    company,
    roleFamily = null,
    region = null
  } = {}) {
    const normalizedCompany = normaliseEntityKey(company);
    if (!company || normalizedCompany === "unknown") {
      throw new TypeError("company is required.");
    }
    const profile = await getProfile(context);
    const companySignal =
      profile.companySponsorshipSignals.find(
        (item) => item.companyKey === normalizedCompany
      ) ?? null;

    if (!companySignal) {
      return Object.freeze({
        company: String(company).trim(),
        companyKey: normalizedCompany,
        matched: false,
        sponsorship: null,
        roleScope: null,
        regionScope: null,
        explanation:
          "No prior explicit sponsorship evidence has been observed for this company."
      });
    }

    return Object.freeze({
      company: companySignal.company,
      companyKey: companySignal.companyKey,
      matched: true,
      sponsorship: companySignal,
      roleScope: findScopedSignal(
        companySignal.roleFamilyScopes,
        roleFamily
      ),
      regionScope: findScopedSignal(
        companySignal.regionScopes,
        region
      ),
      explanation: createCompanyExplanation(companySignal)
    });
  }

  async function getStrategyFeedback(context) {
    const profile = await getProfile(context);
    return profile.strategyFeedback;
  }

  return Object.freeze({
    schemaVersion: PERSONAL_LEARNING_SERVICE_SCHEMA_VERSION,
    getProfile,
    getCompanySignal,
    getStrategyFeedback
  });
}

export function assertPersonalLearningService(service) {
  if (
    !service ||
    typeof service !== "object" ||
    service.schemaVersion !== PERSONAL_LEARNING_SERVICE_SCHEMA_VERSION ||
    typeof service.getProfile !== "function" ||
    typeof service.getCompanySignal !== "function" ||
    typeof service.getStrategyFeedback !== "function"
  ) {
    throw new TypeError("A valid personal learning service is required.");
  }
  return service;
}

export function buildPersonalLearningProfile(dataset, {
  generatedAt = new Date().toISOString()
} = {}) {
  const snapshots = Array.isArray(dataset?.snapshots)
    ? dataset.snapshots
    : [];
  const applications = Array.isArray(dataset?.applications)
    ? dataset.applications
    : [];
  const decisions = Array.isArray(dataset?.decisions)
    ? dataset.decisions
    : [];

  const latestSnapshotByJob = latestByJob(
    snapshots,
    (item) => item.capturedAt ?? item.updatedAt ?? item.createdAt
  );
  const latestDecisionByJob = latestByJob(
    decisions,
    (item) => item.decidedAt ?? item.updatedAt ?? item.createdAt
  );
  const applicationByJob = latestByJob(
    applications,
    (item) => item.updatedAt ?? item.createdAt ?? item.dateApplied
  );

  const companySponsorshipSignals =
    buildCompanySponsorshipSignals(snapshots, generatedAt);
  const linkedRows = [...latestSnapshotByJob.values()]
    .map((snapshot) => ({
      snapshot,
      application: applicationByJob.get(snapshot.jobId) ?? null,
      decision: latestDecisionByJob.get(snapshot.jobId) ?? null
    }));

  const appliedRows = linkedRows.filter(({ application }) =>
    APPLIED_STATUSES.has(normalizeStatus(application))
  );

  const roleOutcomeSignals = buildOutcomeSignals(
    appliedRows,
    ({ snapshot }) => snapshot.role?.canonicalName ?? "Unknown role",
    "roleFamily"
  );
  const locationOutcomeSignals = buildOutcomeSignals(
    appliedRows,
    ({ snapshot }) => snapshot.region ?? "Unknown",
    "region"
  );
  const skillOutcomeSignals = buildMultiValueOutcomeSignals(
    appliedRows,
    ({ snapshot }) => (snapshot.skills ?? []).map((item) => item.name),
    "skill"
  );
  const resumeVersionOutcomeSignals = buildOutcomeSignals(
    appliedRows.filter(({ application }) => application?.resumeVersionId),
    ({ application }) => application.resumeVersionId,
    "resumeVersionId"
  );
  const experienceOutcomeSignals = buildOutcomeSignals(
    appliedRows,
    ({ snapshot }) => experienceBucket(snapshot.experienceRequirements),
    "experienceBand"
  );
  const companyOutcomeSignals = buildOutcomeSignals(
    appliedRows,
    ({ snapshot }) => snapshot.company?.canonicalName ?? "Unknown company",
    "company"
  );
  const sourceOutcomeSignals = buildOutcomeSignals(
    appliedRows,
    ({ snapshot }) => snapshot.sourcePlatform ?? "unknown",
    "sourcePlatform"
  );
  const recommendationOutcomeSignals = buildOutcomeSignals(
    appliedRows,
    ({ snapshot, decision }) =>
      decision?.decision ?? snapshot.aiRecommendation ?? "Unknown",
    "recommendation"
  );

  const knownOutcomes = appliedRows.filter(({ application }) =>
    CLOSED_STATUSES.has(normalizeStatus(application))
  ).length;

  const strategyFeedback = buildStrategyFeedback({
    appliedRows,
    roleOutcomeSignals,
    locationOutcomeSignals,
    companyOutcomeSignals,
    skillOutcomeSignals,
    resumeVersionOutcomeSignals,
    experienceOutcomeSignals,
    sourceOutcomeSignals,
    recommendationOutcomeSignals
  });

  return deepFreeze({
    schemaVersion: PERSONAL_LEARNING_SERVICE_SCHEMA_VERSION,
    calculationVersion: PERSONAL_LEARNING_CALCULATION_VERSION,
    generatedAt,
    mode: "adaptive-evidence",
    affectsJobRecommendation: true,
    summary: {
      observedJobs: latestSnapshotByJob.size,
      companiesObserved: new Set(
        [...latestSnapshotByJob.values()]
          .map((snapshot) => snapshot.company?.normalizedKey)
          .filter(Boolean)
      ).size,
      applicationsObserved: appliedRows.length,
      knownClosedOutcomes: knownOutcomes,
      explicitSponsorshipObservations:
        companySponsorshipSignals.reduce(
          (sum, item) => sum + item.explicitObservationCount,
          0
        ),
      companiesWithSponsorshipPatterns:
        companySponsorshipSignals.filter(
          (item) => item.patternStrength !== "single-observation"
        ).length
    },
    companySponsorshipSignals,
    roleOutcomeSignals,
    locationOutcomeSignals,
    skillOutcomeSignals,
    resumeVersionOutcomeSignals,
    experienceOutcomeSignals,
    companyOutcomeSignals,
    sourceOutcomeSignals,
    recommendationOutcomeSignals,
    strategyFeedback,
    readiness: {
      adaptiveScoring: readinessLabel(appliedRows.length, 5, 15),
      predictiveMl: appliedRows.length >= 100 && knownOutcomes >= 50
        ? "candidate-for-evaluation"
        : "insufficient-personal-outcome-data",
      explanation:
        "Batch 8 adds deterministic outcome-strategy feedback while keeping current-posting evidence authoritative and avoiding causal claims from observational data."
    },
    limitations: [
      "Signals describe only jobs and outcomes observed in this user's SwapOpt history.",
      "Company sponsorship evidence is scoped evidence, not a permanent company-wide policy.",
      "Recent explicit evidence should outweigh old observations when future adaptive scoring is introduced.",
      "Small personal samples are reported with low confidence and must not be treated as predictive ML.",
      "Only sufficiently reliable signals may influence recommendations; small samples remain advisory, strategy feedback is observational rather than causal, and current explicit posting evidence always takes priority."
    ]
  });
}

function buildCompanySponsorshipSignals(snapshots, generatedAt) {
  const grouped = new Map();

  for (const snapshot of snapshots) {
    const status = snapshot.sponsorship?.status;

    if (
      !snapshot.sponsorship?.explicit ||
      !SPONSORSHIP_STATUSES.has(status)
    ) {
      continue;
    }

    const company =
      snapshot.company?.canonicalName ?? "Unknown company";

    const companyKey =
      snapshot.company?.normalizedKey ?? normaliseEntityKey(company);

    const current = grouped.get(companyKey) ?? {
      company,
      companyKey,
      observationsByKey:
        new Map()
    };

    const observation = {
      status,
      observedAt:
        snapshot.capturedAt ?? snapshot.updatedAt ?? snapshot.createdAt,
      roleFamily:
        snapshot.role?.canonicalName ?? "Unknown role",
      region:
        snapshot.region ?? "Unknown",
      jobId:
        snapshot.jobId ?? null,
      sourceUrl:
        snapshot.sourceUrl ?? null,
      evidence:
        snapshot.sponsorship?.evidence ?? null,
      snapshotConfidence:
        finite(snapshot.confidence, 0.6)
    };

    const observationKey =
      createSponsorshipObservationKey(
        snapshot
      );

    const existing =
      current
        .observationsByKey
        .get(
          observationKey
        );

    if (
      !existing ||
      dateValue(
        observation.observedAt
      ) >=
      dateValue(
        existing.observedAt
      )
    ) {
      current
        .observationsByKey
        .set(
          observationKey,
          observation
        );
    }

    grouped.set(
      companyKey,
      current
    );
  }

  return [...grouped.values()]
    .map((group) =>
      createSponsorshipSignal({
        company:
          group.company,
        companyKey:
          group.companyKey,
        observations: [
          ...group
            .observationsByKey
            .values()
        ]
      }, generatedAt)
    )
    .sort((a, b) =>
      b.confidenceScore - a.confidenceScore ||
      b.explicitObservationCount - a.explicitObservationCount ||
      a.company.localeCompare(b.company)
    );
}

function createSponsorshipObservationKey(
  snapshot
) {
  const sourceUrl =
    typeof snapshot
      ?.sourceUrl ===
      "string"
      ? snapshot
          .sourceUrl
          .trim()
          .toLocaleLowerCase(
            "en-US"
          )
      : "";

  if (
    sourceUrl !==
    ""
  ) {
    return `url:${sourceUrl}`;
  }

  const fingerprint =
    typeof snapshot
      ?.sourceFingerprint ===
      "string"
      ? snapshot
          .sourceFingerprint
          .trim()
      : "";

  if (
    fingerprint !==
    ""
  ) {
    return `fingerprint:${fingerprint}`;
  }

  return `job:${String(
    snapshot?.jobId ??
    "unknown"
  )}`;
}

function createSponsorshipSignal(group, generatedAt) {
  const observations = [...group.observations]
    .sort((a, b) => dateValue(b.observedAt) - dateValue(a.observedAt));
  const counts = countValues(observations.map((item) => item.status));
  const [dominantStatus, dominantCount] =
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ??
    ["unknown", 0];
  const consistency =
    observations.length > 0
      ? dominantCount / observations.length
      : 0;
  const latestObservedAt = observations[0]?.observedAt ?? null;
  const recencyDays =
    daysBetween(latestObservedAt, generatedAt);
  const recencyFactor = recencyWeight(recencyDays);
  const sampleFactor = Math.min(1, observations.length / 4);
  const evidenceConfidence = average(
    observations.map((item) => item.snapshotConfidence)
  ) ?? 0.6;
  const rawConfidenceScore = clamp(
    sampleFactor *
      (0.55 + 0.45 * consistency) *
      recencyFactor *
      (0.75 + 0.25 * evidenceConfidence),
    0,
    1
  );
  const confidenceScore =
    consistency < 0.6
      ? Math.min(rawConfidenceScore, 0.69)
      : rawConfidenceScore;

  return {
    company: group.company,
    companyKey: group.companyKey,
    dominantStatus:
      consistency >= 0.6 ? dominantStatus : "mixed",
    explicitObservationCount: observations.length,
    statusCounts: Object.fromEntries(counts),
    consistency: round(consistency, 3),
    firstObservedAt:
      observations.at(-1)?.observedAt ?? null,
    lastObservedAt:
      latestObservedAt,
    recencyDays,
    confidenceScore: round(confidenceScore, 3),
    confidence: confidenceLabel(confidenceScore),
    patternStrength:
      observations.length >= 4 && consistency >= 0.75
        ? "repeated-consistent"
        : observations.length >= 2
          ? "emerging-pattern"
          : "single-observation",
    roleFamilyScopes:
      buildSponsorshipScopes(observations, "roleFamily", generatedAt),
    regionScopes:
      buildSponsorshipScopes(observations, "region", generatedAt),
    recentEvidence: observations.slice(0, 8)
  };
}

function buildSponsorshipScopes(observations, field, generatedAt) {
  const grouped = new Map();
  for (const observation of observations) {
    const name = observation[field] ?? "Unknown";
    const current = grouped.get(name) ?? [];
    current.push(observation);
    grouped.set(name, current);
  }
  return [...grouped.entries()]
    .map(([name, rows]) => {
      const counts = countValues(rows.map((item) => item.status));
      const [dominantStatus, dominantCount] =
        [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ??
        ["unknown", 0];
      const consistency =
        rows.length > 0 ? dominantCount / rows.length : 0;
      const latest = [...rows].sort(
        (a, b) => dateValue(b.observedAt) - dateValue(a.observedAt)
      )[0];
      const confidenceScore = clamp(
        Math.min(1, rows.length / 3) *
          (0.55 + 0.45 * consistency) *
          recencyWeight(daysBetween(latest?.observedAt, generatedAt)),
        0,
        1
      );
      return {
        name,
        normalizedKey: normaliseEntityKey(name),
        observationCount: rows.length,
        dominantStatus:
          consistency >= 0.6 ? dominantStatus : "mixed",
        consistency: round(consistency, 3),
        confidenceScore: round(confidenceScore, 3),
        confidence: confidenceLabel(confidenceScore),
        lastObservedAt: latest?.observedAt ?? null
      };
    })
    .sort((a, b) =>
      b.observationCount - a.observationCount ||
      a.name.localeCompare(b.name)
    );
}

function buildOutcomeSignals(rows, keyFactory, fieldName) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFactory(row);
    if (!key) continue;
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }
  return [...groups.entries()]
    .map(([key, values]) =>
      createOutcomeSignal(key, values, fieldName)
    )
    .sort((a, b) =>
      b.applications - a.applications ||
      b.interviewConversionRate - a.interviewConversionRate ||
      String(a[fieldName]).localeCompare(String(b[fieldName]))
    )
    .slice(0, 50);
}

function buildMultiValueOutcomeSignals(rows, valuesFactory, fieldName) {
  const groups = new Map();
  for (const row of rows) {
    for (const key of new Set(valuesFactory(row).filter(Boolean))) {
      const current = groups.get(key) ?? [];
      current.push(row);
      groups.set(key, current);
    }
  }
  return [...groups.entries()]
    .map(([key, values]) =>
      createOutcomeSignal(key, values, fieldName)
    )
    .sort((a, b) =>
      b.applications - a.applications ||
      b.interviewConversionRate - a.interviewConversionRate ||
      String(a[fieldName]).localeCompare(String(b[fieldName]))
    )
    .slice(0, 50);
}

function createOutcomeSignal(key, rows, fieldName) {
  const statuses = rows.map(({ application }) =>
    normalizeStatus(application)
  );
  const applications = rows.length;
  const interviews = statuses.filter((status) =>
    INTERVIEW_STATUSES.has(status)
  ).length;
  const offers = statuses.filter((status) => status === "offer").length;
  const rejections =
    statuses.filter((status) => status === "rejected").length;
  const closedOutcomes =
    statuses.filter((status) => CLOSED_STATUSES.has(status)).length;
  const confidence = outcomeConfidence(applications, closedOutcomes);

  return {
    [fieldName]: key,
    applications,
    interviews,
    offers,
    rejections,
    closedOutcomes,
    interviewConversionRate:
      ratioPercent(interviews, applications),
    offerConversionRate:
      ratioPercent(offers, applications),
    confidence,
    evidenceLevel:
      applications >= 15
        ? "established-personal-sample"
        : applications >= 5
          ? "emerging-personal-sample"
          : "small-personal-sample"
  };
}


function buildStrategyFeedback({
  appliedRows,
  roleOutcomeSignals,
  locationOutcomeSignals,
  companyOutcomeSignals,
  skillOutcomeSignals,
  resumeVersionOutcomeSignals,
  experienceOutcomeSignals,
  sourceOutcomeSignals,
  recommendationOutcomeSignals
}) {
  const allSignals = [
    ...tagStrategySignals(roleOutcomeSignals, "role-family", "roleFamily"),
    ...tagStrategySignals(locationOutcomeSignals, "region", "region"),
    ...tagStrategySignals(companyOutcomeSignals, "company", "company"),
    ...tagStrategySignals(skillOutcomeSignals, "skill", "skill"),
    ...tagStrategySignals(resumeVersionOutcomeSignals, "resume-version", "resumeVersionId"),
    ...tagStrategySignals(experienceOutcomeSignals, "experience-band", "experienceBand"),
    ...tagStrategySignals(sourceOutcomeSignals, "source-platform", "sourcePlatform"),
    ...tagStrategySignals(recommendationOutcomeSignals, "recommendation", "recommendation")
  ];

  const classified = allSignals.map(classifyStrategySignal);
  const prioritize = classified
    .filter((item) => item.direction === "prioritize")
    .sort(compareStrategyFeedback)
    .slice(0, 12);
  const deprioritize = classified
    .filter((item) => item.direction === "deprioritize")
    .sort(compareStrategyFeedback)
    .slice(0, 12);
  const observe = classified
    .filter((item) => item.direction === "observe")
    .sort(compareStrategyFeedback)
    .slice(0, 12);

  const statuses = appliedRows.map(({ application }) => normalizeStatus(application));
  const interviews = statuses.filter((status) => INTERVIEW_STATUSES.has(status)).length;
  const offers = statuses.filter((status) => status === "offer").length;
  const rejections = statuses.filter((status) => status === "rejected").length;
  const closedOutcomes = statuses.filter((status) => CLOSED_STATUSES.has(status)).length;

  return {
    schemaVersion: 1,
    mode: "observational-strategy-feedback",
    sampleSize: appliedRows.length,
    closedOutcomes,
    interviewConversionRate: ratioPercent(interviews, appliedRows.length),
    offerConversionRate: ratioPercent(offers, appliedRows.length),
    rejectionRate: ratioPercent(rejections, appliedRows.length),
    confidence: outcomeConfidence(appliedRows.length, closedOutcomes),
    prioritize,
    deprioritize,
    observe,
    actions: buildStrategyActions(prioritize, deprioritize, appliedRows.length),
    limitations: [
      "Outcome feedback describes associations in this user's observed application history and does not prove causation.",
      "Signals require at least five applications and medium confidence before they can be classified as prioritize or deprioritize.",
      "Resume-version and source-platform signals should be compared only when the underlying roles and eligibility constraints are reasonably similar.",
      "Current explicit job eligibility evidence always overrides historical outcome patterns."
    ]
  };
}

function tagStrategySignals(signals, dimension, fieldName) {
  return (Array.isArray(signals) ? signals : [])
    .filter((signal) => signal && signal[fieldName] && signal[fieldName] !== "Unknown")
    .map((signal) => ({
      dimension,
      key: String(signal[fieldName]),
      signal
    }));
}

function classifyStrategySignal({ dimension, key, signal }) {
  const actionable =
    signal.applications >= 5 &&
    (signal.confidence === "medium" || signal.confidence === "high");

  let direction = "observe";
  if (
    actionable &&
    (signal.interviewConversionRate >= 25 || signal.offerConversionRate >= 10)
  ) {
    direction = "prioritize";
  } else if (
    actionable &&
    signal.interviewConversionRate <= 5 &&
    signal.offerConversionRate === 0 &&
    signal.closedOutcomes >= 2
  ) {
    direction = "deprioritize";
  }

  const sampleText = `${signal.applications} application(s), ${signal.interviewConversionRate}% interview conversion, ${signal.offerConversionRate}% offer conversion`;

  return {
    dimension,
    key,
    direction,
    applications: signal.applications,
    interviews: signal.interviews,
    offers: signal.offers,
    rejections: signal.rejections,
    closedOutcomes: signal.closedOutcomes,
    interviewConversionRate: signal.interviewConversionRate,
    offerConversionRate: signal.offerConversionRate,
    confidence: signal.confidence,
    evidenceLevel: signal.evidenceLevel,
    rationale:
      direction === "prioritize"
        ? `${sampleText}. This is an observed positive association worth prioritizing while the pattern remains current.`
        : direction === "deprioritize"
          ? `${sampleText}. This is an observed weak-outcome association worth reducing effort on until stronger evidence appears.`
          : `${sampleText}. The evidence is not strong enough for a strategy change yet.`
  };
}

function compareStrategyFeedback(left, right) {
  const confidenceRank = { high: 3, medium: 2, low: 1 };
  return (
    (confidenceRank[right.confidence] ?? 0) -
      (confidenceRank[left.confidence] ?? 0) ||
    right.applications - left.applications ||
    right.offerConversionRate - left.offerConversionRate ||
    right.interviewConversionRate - left.interviewConversionRate ||
    left.dimension.localeCompare(right.dimension) ||
    left.key.localeCompare(right.key)
  );
}

function buildStrategyActions(prioritize, deprioritize, sampleSize) {
  if (sampleSize < 5) {
    return [
      "Keep recording complete application outcomes. At least five submitted applications are required before outcome strategy signals can become actionable."
    ];
  }

  const actions = [];
  const strongestPositive = prioritize[0];
  const strongestNegative = deprioritize[0];

  if (strongestPositive) {
    actions.push(
      `Preserve and test the ${strongestPositive.dimension} pattern "${strongestPositive.key}" because it has the strongest current positive observed outcome signal.`
    );
  }

  if (strongestNegative) {
    actions.push(
      `Reduce time spent on the ${strongestNegative.dimension} pattern "${strongestNegative.key}" unless a new job has unusually strong current-job evidence.`
    );
  }

  if (actions.length === 0) {
    actions.push(
      "No outcome pattern is strong enough to change strategy yet. Continue applying selectively and recording interviews, offers, and rejections."
    );
  }

  return actions.slice(0, 4);
}

function experienceBucket(requirements) {
  const values = (Array.isArray(requirements) ? requirements : [])
    .map((item) => Number(item?.minimumYears))
    .filter(Number.isFinite);
  if (values.length === 0) return "not-stated";
  const maximumMinimum = Math.max(...values);
  if (maximumMinimum <= 2) return "0-2-years";
  if (maximumMinimum <= 4) return "3-4-years";
  if (maximumMinimum <= 7) return "5-7-years";
  return "8-plus-years";
}

function findScopedSignal(scopes, value) {
  if (!value) return null;
  const key = normaliseEntityKey(value);
  return scopes.find((item) => item.normalizedKey === key) ?? null;
}

function createCompanyExplanation(signal) {
  const status =
    signal.dominantStatus === "restricted"
      ? "sponsorship-restricted"
      : signal.dominantStatus === "available"
        ? "sponsorship-available"
        : signal.dominantStatus === "citizenship-required"
          ? "citizenship-required"
          : "mixed sponsorship";
  return `${signal.explicitObservationCount} explicit observation(s) currently form a ${signal.patternStrength} ${status} signal with ${signal.confidence} confidence.`;
}

function normalizeStatus(application) {
  return String(
    application?.status ??
    application?.currentStatus ??
    application?.applicationStatus ??
    application?.stage ??
    ""
  ).trim().toLocaleLowerCase("en-US");
}

function latestByJob(rows, dateFactory) {
  const values = new Map();
  for (const row of rows) {
    const jobId = row?.jobId;
    if (!jobId) continue;
    const current = values.get(jobId);
    if (
      !current ||
      dateValue(dateFactory(row)) >= dateValue(dateFactory(current))
    ) {
      values.set(jobId, row);
    }
  }
  return values;
}

function countValues(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function outcomeConfidence(applications, closedOutcomes) {
  if (applications >= 15 && closedOutcomes >= 8) return "high";
  if (applications >= 5 && closedOutcomes >= 2) return "medium";
  return "low";
}

function readinessLabel(value, medium, high) {
  if (value >= high) return "high";
  if (value >= medium) return "medium";
  return "low";
}

function confidenceLabel(score) {
  if (score >= 0.72) return "high";
  if (score >= 0.42) return "medium";
  return "low";
}

function recencyWeight(days) {
  if (!Number.isFinite(days)) return 0.6;
  if (days <= 90) return 1;
  if (days <= 180) return 0.85;
  if (days <= 365) return 0.65;
  return 0.4;
}

function daysBetween(from, to) {
  const start = dateValue(from);
  const end = dateValue(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function dateValue(value) {
  const result = new Date(value ?? 0).getTime();
  return Number.isFinite(result) ? result : 0;
}

function average(values) {
  const finiteValues = values.filter(Number.isFinite);
  return finiteValues.length > 0
    ? finiteValues.reduce((sum, value) => sum + value, 0) /
        finiteValues.length
    : null;
}

function ratioPercent(numerator, denominator) {
  return denominator > 0
    ? round((numerator / denominator) * 100, 1)
    : 0;
}

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
