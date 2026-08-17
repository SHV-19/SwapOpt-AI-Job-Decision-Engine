import { createHash } from "node:crypto";

import {
  assertPersonalRepositoryRegistry
} from "../../database/personal-repositories.js";

import {
  assertRepositoryContext
} from "../../database/repository.js";

import {
  AppError
} from "../../utils/app-error.js";

import {
  createCsv
} from "./csv.js";

import {
  createZip
} from "./zip.js";

import {
  calculateApplicationBehaviorIntelligence,
  normaliseApplicationBehaviorInput
} from "./application-behavior-intelligence.js";

import {
  calculatePersonalMarketStrategy
} from "./personal-market-strategy.js";

import {
  calculateCareerLearningLoop
} from "../career-learning-loop-intelligence.js";

import {
  MARKET_EXTRACTION_VERSION,
  MARKET_INTELLIGENCE_SCHEMA_VERSION,
  calculateConfidenceLabel,
  createMarketEntities,
  createMarketSnapshotInput,
  normaliseDecisionInput,
  normaliseEntityKey,
  normaliseFilters,
  snapshotMatchesFilters
} from "./normalization.js";

export const MARKET_INTELLIGENCE_SERVICE_SCHEMA_VERSION = 1;
export const MARKET_INTELLIGENCE_CALCULATION_VERSION = "l2.1";

const EXPORT_FILE_COLUMNS = Object.freeze({
  "jobs.csv": [
    column("snapshotId", "Snapshot ID", (row) => row.id),
    column("jobId", "Job ID"),
    column("jobAnalysisId", "Job Analysis ID"),
    column("capturedAt", "Captured At"),
    column("sourceUrl", "Source URL"),
    column("sourcePlatform", "Source Platform"),
    column("company", "Company", (row) => row.company?.canonicalName),
    column("roleFamily", "Role Family", (row) => row.role?.canonicalName),
    column("originalTitle", "Original Title", (row) => row.role?.originalTitle),
    column("industries", "Industries", (row) => row.industries?.map((item) => item.name)),
    column("location", "Location"),
    column("region", "Region"),
    column("country", "Country"),
    column("workModel", "Work Model"),
    column("employmentType", "Employment Type"),
    column("seniority", "Seniority"),
    column("salaryMinimum", "Salary Minimum", (row) => row.salary?.minimum),
    column("salaryMaximum", "Salary Maximum", (row) => row.salary?.maximum),
    column("salaryCurrency", "Salary Currency", (row) => row.salary?.currency),
    column("salaryPeriod", "Salary Period", (row) => row.salary?.period),
    column("sponsorship", "Sponsorship", (row) => row.sponsorship?.status),
    column("confidence", "Confidence"),
    column("currentMatchPercent", "Current Match %", (row) => row.fit?.currentMatchPercent),
    column("tailoredMatchPercent", "Tailored Match %", (row) => row.fit?.tailoredMatchPercent),
    column("extractionVersion", "Extraction Version"),
    column("schemaVersion", "Schema Version")
  ],
  "companies.csv": entityColumns("company"),
  "roles.csv": entityColumns("role"),
  "people.csv": entityColumns("person"),
  "skills.csv": entityColumns("skill"),
  "technologies.csv": entityColumns("technology"),
  "initiatives.csv": entityColumns("initiative"),
  "job-decisions.csv": [
    column("id", "Decision ID"),
    column("jobId", "Job ID"),
    column("jobAnalysisId", "Job Analysis ID"),
    column("marketJobSnapshotId", "Market Snapshot ID"),
    column("decision", "Decision"),
    column("primaryReason", "Primary Reason"),
    column("secondaryReasons", "Secondary Reasons"),
    column("constraintType", "Constraint Type"),
    column("note", "Note"),
    column("aiRecommendationAtDecision", "AI Recommendation"),
    column("userOverrodeAi", "User Overrode AI"),
    column("decidedAt", "Decided At"),
    column("revisionCount", "Revision Count", (row) => row.revisionHistory?.length ?? 0)
  ],
  "skip-reasons.csv": [
    column("decisionId", "Decision ID", (row) => row.id),
    column("jobId", "Job ID"),
    column("primaryReason", "Primary Reason"),
    column("secondaryReasons", "Secondary Reasons"),
    column("constraintType", "Constraint Type"),
    column("note", "Note"),
    column("decidedAt", "Decided At")
  ],
  "resume-gaps.csv": [
    column("snapshotId", "Snapshot ID", (row) => row.id),
    column("jobId", "Job ID"),
    column("company", "Company", (row) => row.company?.canonicalName),
    column("roleFamily", "Role Family", (row) => row.role?.canonicalName),
    column("coveragePercentage", "Coverage %", (row) => row.resumeGap?.coveragePercentage),
    column("matchedVerifiedSkills", "Matched Verified Skills", (row) => row.resumeGap?.matchedVerifiedSkills),
    column("missingMandatorySkills", "Missing Mandatory Skills", (row) => row.resumeGap?.missingMandatorySkills),
    column("missingPreferredSkills", "Missing Preferred Skills", (row) => row.resumeGap?.missingPreferredSkills),
    column("highImpactGaps", "High Impact Gaps", (row) => row.resumeGap?.highImpactGaps),
    column("assessedAt", "Assessed At", (row) => row.resumeGap?.assessedAt)
  ],
  "application-outcomes.csv": [
    column("id", "Application ID"),
    column("jobId", "Job ID"),
    column("company", "Company"),
    column("role", "Role"),
    column("status", "Status", resolveApplicationStatus),
    column("appliedAt", "Applied At"),
    column("updatedAt", "Updated At")
  ],
  "decision-learning-audits.csv": [
    column("jobId", "Job ID"),
    column("jobAnalysisId", "Job Analysis ID"),
    column("applicationId", "Application ID"),
    column("company", "Company"),
    column("role", "Role"),
    column("sourcePlatform", "Source Platform"),
    column("recommendation", "Recommendation"),
    column("baselineRecommendation", "Baseline Recommendation"),
    column("userDecision", "User Decision"),
    column("learningInfluenced", "Learning Influenced"),
    column("historicalSignalsUsed", "Historical Signals Used"),
    column("learningReadinessAtDecision", "Learning Readiness At Decision"),
    column("currentMatchPercent", "Current Match %"),
    column("submitted", "Submitted"),
    column("behaviorAlignment", "Observed Behavior Alignment"),
    column("interviewReached", "Interview Stage Reached"),
    column("offerReached", "Offer Reached"),
    column("closed", "Closed Outcome"),
    column("outcome", "Observed Outcome"),
    column("analyzedAt", "Analyzed At"),
    column("appliedAt", "Applied At")
  ],
  "application-behavior.csv": [
    column("jobId", "Job ID"),
    column("jobAnalysisId", "Job Analysis ID"),
    column("applicationId", "Application ID"),
    column("company", "Company"),
    column("role", "Role"),
    column("sourcePlatform", "Source Platform"),
    column("region", "Region"),
    column("workModel", "Work Model"),
    column("sponsorshipStatus", "Sponsorship"),
    column("seniority", "Seniority"),
    column("experienceRequirements", "Experience Requirements"),
    column("currentMatchPercent", "Current Match %"),
    column("matchScoreBand", "Match Score Band"),
    column("jobDecision", "Job Decision"),
    column("recommendedResumeAction", "Recommended Resume Action"),
    column("effortLevel", "Recommended Effort Level"),
    column("actualResumeBehavior", "Actual Resume Behavior"),
    column("workflowInvestment", "Observed Workflow Investment"),
    column("applied", "Applied"),
    column("interviewed", "Interviewed"),
    column("offered", "Offer"),
    column("rejected", "Rejected"),
    column("outcome", "Outcome"),
    column("behavior", "Behavior Evidence"),
    column("behaviorEventCount", "Behavior Event Count"),
    column("nextBestAction", "Next Best Action"),
    column("evidenceConfidence", "Evidence Confidence")
  ],
  "match-score-outcomes.csv": [
    column("label", "Match Score Band"),
    column("jobs", "Jobs"),
    column("applied", "Applied"),
    column("interviews", "Interviews"),
    column("offers", "Offers"),
    column("rejections", "Rejections"),
    column("interviewRateAmongApplied", "Interview Rate Among Applied %"),
    column("offerRateAmongApplied", "Offer Rate Among Applied %")
  ],
  "match-score-feature-usage.csv": [
    column("band", "Match Score Band"),
    column("jobs", "Jobs"),
    column("resumeGenerated", "Resume Generated %", (row) => row.featureUsage?.resumeGenerated?.rate),
    column("coverLetterGenerated", "Cover Letter Generated %", (row) => row.featureUsage?.coverLetterGenerated?.rate),
    column("networkingUsed", "Networking Used %", (row) => row.featureUsage?.networkingUsed?.rate),
    column("recruiterSaved", "Recruiter Saved %", (row) => row.featureUsage?.recruiterSaved?.rate),
    column("applicationAssistantUsed", "Application Assistant Used %", (row) => row.featureUsage?.applicationAssistantUsed?.rate),
    column("applied", "Applied %", (row) => row.featureUsage?.applied?.rate),
    column("interviewPrepUsed", "Interview Prep Used %", (row) => row.featureUsage?.interviewPrepUsed?.rate)
  ],
  "effort-roi.csv": [
    column("label", "Observed Workflow Investment"),
    column("jobs", "Jobs"),
    column("applied", "Applied"),
    column("interviews", "Interviews"),
    column("offers", "Offers"),
    column("rejections", "Rejections"),
    column("interviewRateAmongApplied", "Interview Rate Among Applied %"),
    column("offerRateAmongApplied", "Offer Rate Among Applied %")
  ],
  "workflow-outcomes.csv": [
    column("label", "Workflow"),
    column("jobs", "Jobs"),
    column("applied", "Applied"),
    column("interviews", "Interviews"),
    column("offers", "Offers"),
    column("rejections", "Rejections"),
    column("interviewRateAmongApplied", "Interview Rate Among Applied %"),
    column("offerRateAmongApplied", "Offer Rate Among Applied %")
  ],
  "resume-outcomes.csv": [
    column("label", "Resume / Cover Workflow"),
    column("jobs", "Jobs"),
    column("applied", "Applied"),
    column("interviews", "Interviews"),
    column("offers", "Offers"),
    column("rejections", "Rejections"),
    column("interviewRateAmongApplied", "Interview Rate Among Applied %"),
    column("offerRateAmongApplied", "Offer Rate Among Applied %")
  ],
  "networking-association.csv": [
    column("label", "Networking Evidence"),
    column("jobs", "Jobs"),
    column("applied", "Applied"),
    column("interviews", "Interviews"),
    column("offers", "Offers"),
    column("rejections", "Rejections"),
    column("interviewRateAmongApplied", "Interview Rate Among Applied %"),
    column("offerRateAmongApplied", "Offer Rate Among Applied %")
  ],
  "next-best-actions.csv": [
    column("jobId", "Job ID"),
    column("applicationId", "Application ID"),
    column("company", "Company"),
    column("role", "Role"),
    column("currentMatchPercent", "Current Match %"),
    column("action", "Next Best Action"),
    column("reason", "Reason"),
    column("priority", "Priority")
  ],
  "role-opportunities.csv": [
    column("roleFamily", "Role Family"),
    column("opportunityScore", "Opportunity Score"),
    column("observations", "Observed Jobs"),
    column("companies", "Companies"),
    column("averageMatchPercent", "Average Match %"),
    column("averageResumeCoverage", "Average Resume Coverage %"),
    column("demandSharePercent", "Observed Demand Share %"),
    column("proceed", "Proceed Decisions"),
    column("submittedApplications", "Submitted Applications"),
    column("interviews", "Interview Stage"),
    column("offers", "Offers"),
    column("interviewRateAmongApplied", "Interview Rate Among Applied %"),
    column("confidence", "Confidence"),
    column("rationale", "Rationale")
  ],
  "skill-priorities.csv": [
    column("skill", "Skill"),
    column("classification", "Classification"),
    column("priorityScore", "Priority Score"),
    column("observations", "Observed Jobs"),
    column("companies", "Companies"),
    column("mandatory", "Mandatory"),
    column("preferred", "Preferred"),
    column("verifiedMatches", "Verified Matches"),
    column("missingMandatory", "Missing Mandatory Evidence"),
    column("action", "Recommended Evidence Action")
  ],
  "sponsorship-friction.csv": [
    column("region", "Region"),
    column("observations", "Observed Jobs"),
    column("explicitAvailable", "Explicitly Available"),
    column("restrictive", "Restrictive"),
    column("unstated", "Unstated"),
    column("restrictiveRate", "Restrictive Rate %"),
    column("explicitlyAvailableRate", "Explicitly Available Rate %")
  ],
  "market-strategy-actions.csv": [
    column("priority", "Priority"),
    column("action", "Action"),
    column("reason", "Reason"),
    column("evidenceType", "Evidence Type")
  ],
  "market-trends.csv": [
    column("id", "Trend Snapshot ID"),
    column("periodStart", "Period Start"),
    column("periodEnd", "Period End"),
    column("filtersHash", "Filters Hash"),
    column("sampleSize", "Sample Size"),
    column("companyCount", "Company Count"),
    column("metrics", "Metrics"),
    column("trendSignals", "Trend Signals"),
    column("generatedAt", "Generated At"),
    column("calculationVersion", "Calculation Version")
  ]
});

export function createMarketIntelligenceService({
  repositoryRegistry,
  clock = () => new Date()
}) {
  const registry = assertPersonalRepositoryRegistry(repositoryRegistry);
  if (typeof clock !== "function") {
    throw new TypeError("Market intelligence service clock must be a function.");
  }

  const repositories = {
    jobs: registry.getRepository("jobs"),
    jobAnalyses: registry.getRepository("jobAnalyses"),
    applications: registry.getRepository("applications"),
    skills: registry.getRepository("skills"),
    baseResumes: registry.getRepository("baseResumes"),
    applicationBehaviorEvents: registry.getRepository("applicationBehaviorEvents"),
    applicationStatusEvents: registry.getRepository("applicationStatusEvents"),
    applicationResumeDocuments: registry.getRepository("applicationResumeDocuments"),
    coverLetters: registry.getRepository("coverLetters"),
    snapshots: registry.getRepository("marketJobSnapshots"),
    entities: registry.getRepository("marketEntities"),
    decisions: registry.getRepository("jobDecisions"),
    trends: registry.getRepository("marketTrendSnapshots"),
    backfills: registry.getRepository("marketBackfillRuns")
  };

  async function captureAnalysis({
    context,
    jobRecord,
    jobAnalysisRecord
  }) {
    const repositoryContext = assertRepositoryContext(context);
    const [
      verifiedSkills,
      baseResumes
    ] = await Promise.all([
      repositories.skills.list(repositoryContext),
      repositories.baseResumes.list(repositoryContext)
    ]);

    return captureAnalysisWithReferences({
      context: repositoryContext,
      jobRecord,
      jobAnalysisRecord,
      verifiedSkills,
      baseResumes,
      observeEntityEvidence: true
    });
  }

  async function captureAnalysisWithReferences({
    context,
    jobRecord,
    jobAnalysisRecord,
    verifiedSkills,
    baseResumes,
    observeEntityEvidence
  }) {
    const repositoryContext = assertRepositoryContext(context);
    validateStoredRecord(jobRecord, "jobRecord");
    validateStoredRecord(jobAnalysisRecord, "jobAnalysisRecord");

    const snapshotInput = createMarketSnapshotInput({
      job: jobRecord,
      jobAnalysis: jobAnalysisRecord,
      verifiedSkills,
      baseResumes,
      capturedAt: clock().toISOString()
    });

    const existing = await findSnapshotByFingerprint(
      repositoryContext,
      snapshotInput.sourceFingerprint,
      snapshotInput.extractionVersion
    );
    if (existing) {
      return Object.freeze({
        snapshot: existing,
        created: false,
        duplicate: true
      });
    }

    const snapshot = await repositories.snapshots.create(
      repositoryContext,
      snapshotInput
    );

    if (observeEntityEvidence) {
      await observeEntities(repositoryContext, snapshot);
    }

    return Object.freeze({
      snapshot,
      created: true,
      duplicate: false
    });
  }

  async function recordApplicationBehavior(context, payload) {
    const repositoryContext = assertRepositoryContext(context);
    const input = normaliseApplicationBehaviorInput(payload, {
      clock
    });
    await assertOwnedJob(repositoryContext, input.jobId);
    if (input.applicationId) {
      const application = await assertOwnedRecord(
        repositories.applications,
        repositoryContext,
        input.applicationId,
        "Application"
      );
      if (application.jobId !== input.jobId) {
        throw AppError.validation(
          "Application behavior applicationId does not belong to the supplied jobId.",
          {
            code: "APPLICATION_BEHAVIOR_JOB_MISMATCH"
          }
        );
      }
    }
    return repositories.applicationBehaviorEvents.create(
      repositoryContext,
      input
    );
  }

  async function createDecision(context, payload) {
    const repositoryContext = assertRepositoryContext(context);
    const input = normaliseDecisionInput(payload);
    await assertOwnedJob(repositoryContext, input.jobId);
    if (input.jobAnalysisId) {
      await assertOwnedRecord(repositories.jobAnalyses, repositoryContext, input.jobAnalysisId, "Job analysis");
    }
    if (input.marketJobSnapshotId) {
      await assertOwnedRecord(repositories.snapshots, repositoryContext, input.marketJobSnapshotId, "Market snapshot");
    }

    const record = await repositories.decisions.create(repositoryContext, {
      schemaVersion: 1,
      ...input,
      revisionHistory: []
    });
    return record;
  }

  async function updateDecision(context, id, payload) {
    const repositoryContext = assertRepositoryContext(context);
    const current = await assertOwnedRecord(repositories.decisions, repositoryContext, id, "Job decision");
    const changes = normaliseDecisionInput(payload, { partial: true });
    const nextDecision = changes.decision ?? current.decision;
    const nextReason = Object.hasOwn(changes, "primaryReason")
      ? changes.primaryReason
      : current.primaryReason;
    if (nextDecision === "skip" && !nextReason) {
      throw AppError.validation("A skip decision requires a primary reason.", {
        code: "MARKET_DECISION_REASON_REQUIRED"
      });
    }

    const revision = {
      revisedAt: clock().toISOString(),
      version: current.version,
      decision: current.decision,
      primaryReason: current.primaryReason,
      secondaryReasons: current.secondaryReasons,
      constraintType: current.constraintType,
      note: current.note,
      aiRecommendationAtDecision: current.aiRecommendationAtDecision,
      userOverrodeAi: current.userOverrodeAi,
      decidedAt: current.decidedAt
    };
    const updated = await repositories.decisions.update(repositoryContext, id, {
      ...changes,
      revisionHistory: [...(current.revisionHistory ?? []), revision]
    });
    if (!updated) {
      throw AppError.notFound("The job decision no longer exists.", {
        code: "MARKET_DECISION_NOT_FOUND"
      });
    }
    return updated;
  }

  async function listJobs(context, rawFilters = {}) {
    const repositoryContext = assertRepositoryContext(context);
    const filters = normaliseFilters(rawFilters);
    const dataset = await loadDataset(repositoryContext);
    const filtered = filterDataset(dataset, filters);
    return Object.freeze({
      items: filtered.snapshots.slice(filters.offset, filters.offset + filters.limit),
      total: filtered.snapshots.length,
      limit: filters.limit,
      offset: filters.offset,
      filters
    });
  }

  async function listEntities(context, {
    entityType = null,
    search = null,
    limit = 100,
    offset = 0
  } = {}) {
    const repositoryContext = assertRepositoryContext(context);
    const all = await repositories.entities.list(repositoryContext);
    const normalizedType = normalizeOptionalText(entityType);
    const normalizedSearch = normalizeOptionalText(search);
    const filtered = all
      .filter((entity) => !normalizedType || entity.entityType === normalizedType)
      .filter((entity) =>
        !normalizedSearch ||
        entity.canonicalName.toLocaleLowerCase("en-US").includes(normalizedSearch.toLocaleLowerCase("en-US")) ||
        entity.aliases?.some((alias) => alias.toLocaleLowerCase("en-US").includes(normalizedSearch.toLocaleLowerCase("en-US")))
      )
      .sort((a, b) =>
        (b.observationCount ?? 0) - (a.observationCount ?? 0) ||
        a.canonicalName.localeCompare(b.canonicalName)
      );
    const safeLimit = normalizeInteger(limit, 100, 1, 1000);
    const safeOffset = normalizeInteger(offset, 0, 0, 1_000_000);
    return Object.freeze({
      items: filtered.slice(safeOffset, safeOffset + safeLimit),
      total: filtered.length,
      limit: safeLimit,
      offset: safeOffset
    });
  }

  async function getDashboard(context, rawFilters = {}) {
    const repositoryContext = assertRepositoryContext(context);
    const filters = normaliseFilters(rawFilters);
    const dataset = await loadDataset(repositoryContext);
    const filtered = filterDataset(dataset, filters);
    const dashboard = calculateDashboard(filtered, filters, clock());
    const trendSnapshot = await persistTrendSnapshot(repositoryContext, dashboard, filters);
    return Object.freeze({
      ...dashboard,
      trendSnapshotId: trendSnapshot.id
    });
  }

  async function getTrends(context, rawFilters = {}) {
    const repositoryContext = assertRepositoryContext(context);
    const filters = normaliseFilters(rawFilters);
    const dataset = await loadDataset(repositoryContext);
    const filtered = filterDataset(dataset, filters);
    const dashboard = calculateDashboard(filtered, filters, clock());
    return Object.freeze({
      periodStart: dashboard.dateRange.start,
      periodEnd: dashboard.dateRange.end,
      sampleSize: dashboard.summary.uniqueJobs,
      series: dashboard.trends,
      signals: dashboard.trendSignals,
      calculationVersion: MARKET_INTELLIGENCE_CALCULATION_VERSION,
      filters
    });
  }

  async function backfill(context, {
    onlyFailed = false,
    outdatedOnly = false
  } = {}) {
    const repositoryContext = assertRepositoryContext(context);
    const run = await repositories.backfills.create(repositoryContext, {
      schemaVersion: 1,
      startedAt: clock().toISOString(),
      completedAt: null,
      status: "running",
      recordsExamined: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      failures: [],
      extractionVersion: MARKET_EXTRACTION_VERSION,
      onlyFailed: Boolean(onlyFailed),
      outdatedOnly: Boolean(outdatedOnly)
    });

    let recordsExamined = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;
    const failures = [];

    try {
      const [
        jobs,
        analyses,
        existingSnapshots,
        verifiedSkills,
        baseResumes,
        previousRuns
      ] = await Promise.all([
        repositories.jobs.list(repositoryContext),
        repositories.jobAnalyses.list(repositoryContext),
        repositories.snapshots.list(repositoryContext),
        repositories.skills.list(repositoryContext),
        repositories.baseResumes.list(repositoryContext),
        onlyFailed
          ? repositories.backfills.list(repositoryContext)
          : Promise.resolve([])
      ]);
      const jobById = new Map(jobs.map((job) => [job.id, job]));
      const existingByAnalysisId = new Map();
      for (const snapshot of existingSnapshots) {
        if (!snapshot.jobAnalysisId) continue;
        const current = existingByAnalysisId.get(snapshot.jobAnalysisId);
        if (
          !current ||
          snapshot.extractionVersion === MARKET_EXTRACTION_VERSION ||
          new Date(snapshot.capturedAt ?? 0).getTime() >
            new Date(current.capturedAt ?? 0).getTime()
        ) {
          existingByAnalysisId.set(snapshot.jobAnalysisId, snapshot);
        }
      }

      for (const analysis of analyses) {
        recordsExamined += 1;
        try {
          const job = jobById.get(analysis.jobId);
          if (!job) {
            recordsSkipped += 1;
            failures.push({
              jobAnalysisId: analysis.id,
              jobId: analysis.jobId,
              code: "BACKFILL_JOB_NOT_FOUND",
              message: "The referenced job record does not exist."
            });
            continue;
          }
          const currentSnapshot = existingByAnalysisId.get(analysis.id);
          if (currentSnapshot && (!outdatedOnly || currentSnapshot.extractionVersion === MARKET_EXTRACTION_VERSION)) {
            recordsSkipped += 1;
            continue;
          }
          if (onlyFailed) {
            const previouslyFailed = previousRuns.some((previous) =>
              previous.failures?.some((failure) => failure.jobAnalysisId === analysis.id)
            );
            if (!previouslyFailed) {
              recordsSkipped += 1;
              continue;
            }
          }
          const result = await captureAnalysisWithReferences({
            context: repositoryContext,
            jobRecord: job,
            jobAnalysisRecord: analysis,
            verifiedSkills,
            baseResumes,
            observeEntityEvidence: currentSnapshot === undefined
          });
          if (result.created) recordsCreated += 1;
          else if (result.duplicate) recordsUpdated += 1;
          else recordsSkipped += 1;
        } catch (error) {
          failures.push({
            jobAnalysisId: analysis.id,
            jobId: analysis.jobId,
            code: normalizeErrorCode(error?.code) ?? "BACKFILL_RECORD_FAILED",
            message: normalizeErrorMessage(error)
          });
        }
      }

      const completed = await repositories.backfills.update(repositoryContext, run.id, {
        completedAt: clock().toISOString(),
        status: failures.length > 0 ? "completed-with-errors" : "completed",
        recordsExamined,
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        failures
      });
      return completed;
    } catch (error) {
      await repositories.backfills.update(repositoryContext, run.id, {
        completedAt: clock().toISOString(),
        status: "failed",
        recordsExamined,
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        failures: [
          ...failures,
          {
            jobAnalysisId: null,
            jobId: null,
            code: normalizeErrorCode(error?.code) ?? "BACKFILL_FAILED",
            message: normalizeErrorMessage(error)
          }
        ]
      });
      throw error;
    }
  }

  async function getBackfillRun(context, id) {
    return assertOwnedRecord(repositories.backfills, assertRepositoryContext(context), id, "Market backfill run");
  }

  async function exportJson(context, rawFilters = {}) {
    const repositoryContext = assertRepositoryContext(context);
    const filters = normaliseFilters(rawFilters);
    const dataset = filterDataset(await loadDataset(repositoryContext), filters);
    const dashboard = calculateDashboard(dataset, filters, clock());
    const payload = {
      metadata: createExportMetadata(filters),
      marketJobSnapshots: dataset.snapshots,
      marketEntities: dataset.entities,
      jobDecisions: dataset.decisions,
      resumeGapSnapshots: dataset.snapshots.map((snapshot) => ({
        snapshotId: snapshot.id,
        jobId: snapshot.jobId,
        company: snapshot.company,
        role: snapshot.role,
        resumeGap: snapshot.resumeGap
      })),
      applicationOutcomes: dataset.applications,
      applicationStatusEvents: dataset.applicationStatusEvents,
      applicationBehaviorEvents: dataset.behaviorEvents,
      applicationBehaviorIntelligence: dashboard.applicationBehaviorIntelligence,
      decisionLearningLoop: dashboard.learningLoop,
      marketTrends: dashboard
    };
    return {
      filename: "swapopt-market-intelligence.json",
      mimeType: "application/json",
      encoding: "utf8",
      content: JSON.stringify(payload, null, 2)
    };
  }

  async function exportCsvPackage(context, rawFilters = {}) {
    const repositoryContext = assertRepositoryContext(context);
    const filters = normaliseFilters(rawFilters);
    const dataset = filterDataset(await loadDataset(repositoryContext), filters);
    const dashboard = calculateDashboard(dataset, filters, clock());
    const entityGroups = Object.groupBy
      ? Object.groupBy(dataset.entities, (entity) => entity.entityType)
      : groupBy(dataset.entities, (entity) => entity.entityType);
    const skipDecisions = dataset.decisions.filter((decision) => decision.decision === "skip");
    const trendRows = [{
      id: null,
      periodStart: dashboard.dateRange.start,
      periodEnd: dashboard.dateRange.end,
      filtersHash: createFiltersHash(filters),
      sampleSize: dashboard.summary.uniqueJobs,
      companyCount: dashboard.summary.companies,
      metrics: dashboard.summary,
      trendSignals: dashboard.trendSignals,
      generatedAt: dashboard.generatedAt,
      calculationVersion: MARKET_INTELLIGENCE_CALCULATION_VERSION
    }];

    const rowsByFile = {
      "jobs.csv": dataset.snapshots,
      "companies.csv": entityGroups.company ?? [],
      "roles.csv": entityGroups.role ?? [],
      "people.csv": entityGroups.person ?? [],
      "skills.csv": entityGroups.skill ?? [],
      "technologies.csv": entityGroups.technology ?? [],
      "initiatives.csv": entityGroups.initiative ?? [],
      "job-decisions.csv": dataset.decisions,
      "skip-reasons.csv": skipDecisions,
      "resume-gaps.csv": dataset.snapshots,
      "application-outcomes.csv": dataset.applications,
      "decision-learning-audits.csv": dashboard.learningLoop.audits,
      "application-behavior.csv": dashboard.applicationBehaviorIntelligence.opportunities,
      "match-score-outcomes.csv": dashboard.applicationBehaviorIntelligence.matchScoreOutcomes,
      "match-score-feature-usage.csv": dashboard.applicationBehaviorIntelligence.featureUsageByMatchScore,
      "effort-roi.csv": dashboard.applicationBehaviorIntelligence.effortRoi,
      "workflow-outcomes.csv": dashboard.applicationBehaviorIntelligence.workflowOutcomeComparison,
      "resume-outcomes.csv": dashboard.applicationBehaviorIntelligence.resumeOutcomeComparison,
      "networking-association.csv": dashboard.applicationBehaviorIntelligence.networkingAssociation,
      "next-best-actions.csv": dashboard.applicationBehaviorIntelligence.nextBestActions,
      "role-opportunities.csv": dashboard.personalStrategy.roleOpportunities,
      "skill-priorities.csv": dashboard.personalStrategy.skillPriorities,
      "sponsorship-friction.csv": dashboard.personalStrategy.sponsorshipFriction.regions,
      "market-strategy-actions.csv": dashboard.personalStrategy.actions,
      "market-trends.csv": trendRows
    };
    const metadata = createExportMetadata(filters);
    const entries = [
      {
        name: "export-metadata.json",
        data: JSON.stringify(metadata, null, 2)
      },
      ...Object.entries(rowsByFile).map(([name, rows]) => ({
        name,
        data: createCsv(EXPORT_FILE_COLUMNS[name], rows)
      }))
    ];
    const archive = createZip(entries);
    return {
      filename: "swapopt-market-intelligence-csv.zip",
      mimeType: "application/zip",
      encoding: "base64",
      content: archive.toString("base64"),
      files: entries.map((entry) => entry.name),
      metadata
    };
  }

  async function getDataset(context, rawFilters = {}) {
    const repositoryContext = assertRepositoryContext(context);
    const filters = normaliseFilters(rawFilters);
    return filterDataset(await loadDataset(repositoryContext), filters);
  }

  return Object.freeze({
    schemaVersion: MARKET_INTELLIGENCE_SERVICE_SCHEMA_VERSION,
    captureAnalysis,
    recordApplicationBehavior,
    createDecision,
    updateDecision,
    listJobs,
    listEntities,
    getDashboard,
    getTrends,
    backfill,
    getBackfillRun,
    exportJson,
    exportCsvPackage,
    getDataset
  });

  async function loadDataset(context) {
    const [
      snapshots,
      entities,
      decisions,
      applications,
      jobAnalyses,
      behaviorEvents,
      applicationStatusEvents,
      applicationResumeDocuments,
      coverLetters
    ] = await Promise.all([
      repositories.snapshots.list(context),
      repositories.entities.list(context),
      repositories.decisions.list(context),
      repositories.applications.list(context),
      repositories.jobAnalyses.list(context),
      repositories.applicationBehaviorEvents.list(context),
      repositories.applicationStatusEvents.list(context),
      repositories.applicationResumeDocuments.list(context),
      repositories.coverLetters.list(context)
    ]);
    return {
      snapshots,
      entities,
      decisions,
      applications,
      jobAnalyses,
      behaviorEvents,
      applicationStatusEvents,
      applicationResumeDocuments,
      coverLetters
    };
  }

  async function observeEntities(context, snapshot) {
    const entityInputs = createMarketEntities(snapshot);
    const observedAt = snapshot.capturedAt ?? clock().toISOString();
    for (const input of entityInputs) {
      const matches = await repositories.entities.list(context, {
        entityType: input.entityType,
        normalizedKey: input.normalizedKey
      });
      const existing = matches[0] ?? null;
      if (!existing) {
        await repositories.entities.create(context, {
          ...input,
          aliases: input.aliases ?? [],
          firstObservedAt: observedAt,
          lastObservedAt: observedAt,
          observationCount: 1,
          sourceRecordIds: input.sourceRecordIds ?? [],
          reviewState: "resolved"
        });
        continue;
      }
      await repositories.entities.update(context, existing.id, {
        aliases: uniqueStrings([...(existing.aliases ?? []), ...(input.aliases ?? [])]),
        lastObservedAt: observedAt,
        observationCount: (existing.observationCount ?? 0) + 1,
        sourceRecordIds: uniqueStrings([...(existing.sourceRecordIds ?? []), ...(input.sourceRecordIds ?? [])]).slice(-500),
        confidence: Math.max(existing.confidence ?? 0, input.confidence ?? 0),
        metadata: {
          ...(existing.metadata ?? {}),
          ...(input.metadata ?? {})
        }
      });
    }
  }

  async function findSnapshotByFingerprint(context, sourceFingerprint, extractionVersion) {
    const matches = await repositories.snapshots.list(context, {
      sourceFingerprint,
      extractionVersion
    });
    return matches[0] ?? null;
  }

  async function persistTrendSnapshot(context, dashboard, filters) {
    const filtersHash = createFiltersHash(filters);
    const existing = await repositories.trends.list(context, {
      filtersHash,
      periodStart: dashboard.dateRange.start,
      periodEnd: dashboard.dateRange.end,
      calculationVersion: MARKET_INTELLIGENCE_CALCULATION_VERSION
    });
    if (existing[0]) return existing[0];
    return repositories.trends.create(context, {
      schemaVersion: 1,
      periodStart: dashboard.dateRange.start,
      periodEnd: dashboard.dateRange.end,
      filtersHash,
      filters,
      sampleSize: dashboard.summary.uniqueJobs,
      companyCount: dashboard.summary.companies,
      metrics: dashboard.summary,
      trendSignals: dashboard.trendSignals,
      generatedAt: dashboard.generatedAt,
      calculationVersion: MARKET_INTELLIGENCE_CALCULATION_VERSION
    });
  }

  async function assertOwnedJob(context, id) {
    return assertOwnedRecord(repositories.jobs, context, id, "Job");
  }
}

export function assertMarketIntelligenceService(service) {
  const methods = [
    "captureAnalysis", "createDecision", "updateDecision", "listJobs",
    "listEntities", "getDashboard", "getTrends", "backfill",
    "getBackfillRun", "exportJson", "exportCsvPackage", "getDataset"
  ];
  if (!service || typeof service !== "object" || service.schemaVersion !== MARKET_INTELLIGENCE_SERVICE_SCHEMA_VERSION) {
    throw new TypeError("A valid market intelligence service is required.");
  }
  for (const method of methods) {
    if (typeof service[method] !== "function") {
      throw new TypeError(`Market intelligence service must expose ${method}.`);
    }
  }
  return service;
}

function filterDataset(dataset, filters) {
  const latestDecisions = latestByJob(dataset.decisions);
  const applicationsByJob = new Map(dataset.applications.map((application) => [application.jobId, application]));
  const snapshots = latestSnapshotsByFingerprint(
    dataset.snapshots
  )
    .filter((snapshot) => {
      const decision = latestDecisions.get(snapshot.jobId) ?? null;
      const application = applicationsByJob.get(snapshot.jobId) ?? null;
      return snapshotMatchesFilters(
        snapshot,
        filters,
        decision,
        resolveApplicationStatus(application)
      );
    })
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  const jobIds = new Set(snapshots.map((snapshot) => snapshot.jobId));
  const entityKeys = new Set();
  for (const snapshot of snapshots) {
    entityKeys.add(`company:${snapshot.company?.normalizedKey}`);
    entityKeys.add(`role:${snapshot.role?.normalizedKey}`);
    entityKeys.add(`region:${normaliseEntityKey(snapshot.region)}`);
    for (const item of snapshot.industries ?? []) entityKeys.add(`industry:${item.normalizedKey}`);
    for (const item of snapshot.skills ?? []) entityKeys.add(`skill:${item.normalizedKey}`);
    for (const item of snapshot.technologies ?? []) entityKeys.add(`technology:${item.normalizedKey}`);
    for (const item of snapshot.initiatives ?? []) entityKeys.add(`initiative:${item.normalizedKey}`);
    for (const item of snapshot.people ?? []) entityKeys.add(`person:${item.normalizedKey}`);
  }
  const filteredApplications =
    dataset.applications.filter((application) => jobIds.has(application.jobId));
  const applicationIds =
    new Set(filteredApplications.map((application) => application.id));

  return {
    snapshots,
    entities: dataset.entities.filter((entity) => entityKeys.has(`${entity.entityType}:${entity.normalizedKey}`)),
    decisions: dataset.decisions.filter((decision) => jobIds.has(decision.jobId)),
    applications: filteredApplications,
    jobAnalyses: dataset.jobAnalyses.filter((analysis) => jobIds.has(analysis.jobId)),
    behaviorEvents: dataset.behaviorEvents.filter((event) => jobIds.has(event.jobId)),
    applicationStatusEvents: (dataset.applicationStatusEvents ?? [])
      .filter((event) => applicationIds.has(event.applicationId)),
    applicationResumeDocuments: dataset.applicationResumeDocuments.filter((document) => jobIds.has(document.jobId)),
    coverLetters: dataset.coverLetters.filter((letter) => jobIds.has(letter.jobId))
  };
}

function calculateDashboard(dataset, filters, now = new Date()) {
  const snapshots = dataset.snapshots;
  const uniqueFingerprints = new Set(snapshots.map((snapshot) => snapshot.sourceFingerprint));
  const companies = new Set(snapshots.map((snapshot) => snapshot.company?.normalizedKey).filter(Boolean));
  const roles = new Set(snapshots.map((snapshot) => snapshot.role?.normalizedKey).filter(Boolean));
  const regions = new Set(snapshots.map((snapshot) => normaliseEntityKey(snapshot.region)).filter(Boolean));
  const industries = new Set(snapshots.flatMap((snapshot) => snapshot.industries?.map((item) => item.normalizedKey) ?? []));
  const latestDecisions = [...latestByJob(dataset.decisions).values()];
  const applications = dataset.applications;
  const statuses = applications.map(resolveApplicationStatus);
  const dates = snapshots.map((snapshot) => new Date(snapshot.capturedAt).getTime()).filter(Number.isFinite).sort((a, b) => a - b);
  const dateRange = {
    start: dates.length > 0 ? new Date(dates[0]).toISOString() : null,
    end: dates.length > 0 ? new Date(dates.at(-1)).toISOString() : null
  };
  const skillDemand = rankSkillDemand(snapshots);
  const technologyThemes = rankNamedItems(snapshots, "technologies");
  const initiativeThemes = rankNamedItems(snapshots, "initiatives");
  const companiesRanked = rankCompanies(snapshots);
  const locations = rankSimple(snapshots, (snapshot) => snapshot.region || "Unknown");
  const workModels = rankSimple(snapshots, (snapshot) => snapshot.workModel || "unknown");
  const skipReasons = rankSimple(
    latestDecisions.filter((decision) => decision.decision === "skip"),
    (decision) => decision.primaryReason || "other"
  );
  const roleFamilies = rankSimple(snapshots, (snapshot) => snapshot.role?.canonicalName || "Unknown role");
  const missingSkills = rankArray(snapshots, (snapshot) => snapshot.resumeGap?.missingMandatorySkills ?? []);
  const trends = calculateTimeSeries(snapshots);
  const trendSignals = calculateTrendSignals(trends);
  const companyCount = companies.size;
  const spanDays = dateRange.start && dateRange.end
    ? Math.max(0, Math.round((new Date(dateRange.end) - new Date(dateRange.start)) / 86_400_000))
    : 0;
  const confidence = calculateConfidenceLabel({
    sampleSize: uniqueFingerprints.size,
    companyCount,
    dateSpanDays: spanDays
  });
  const applicationBehaviorIntelligence =
    calculateApplicationBehaviorIntelligence(dataset, { now });
  const personalStrategy =
    calculatePersonalMarketStrategy(dataset);
  const learningLoop =
    calculateCareerLearningLoop(dataset, {
      generatedAt: now.toISOString()
    });

  return {
    schemaVersion: 1,
    calculationVersion: MARKET_INTELLIGENCE_CALCULATION_VERSION,
    generatedAt: now.toISOString(),
    filters,
    dateRange,
    summary: {
      jobsScanned: snapshots.length,
      uniqueJobs: uniqueFingerprints.size,
      companies: companyCount,
      roles: roles.size,
      regions: regions.size,
      industries: industries.size,
      proceed: latestDecisions.filter((decision) => decision.decision === "apply").length,
      applied: applications.filter(isSubmittedApplication).length,
      saved: latestDecisions.filter((decision) => decision.decision === "save").length,
      skipped: latestDecisions.filter((decision) => decision.decision === "skip").length,
      interviews: learningLoop.summary.interviewStageReached,
      offers: learningLoop.summary.offers,
      rejections: statuses.filter((status) => status.includes("reject")).length
    },
    skillDemand,
    technologyThemes,
    initiativeThemes,
    companyIntelligence: companiesRanked,
    personalFit: {
      strongestRoleFamilies: roleFamilies.slice(0, 15),
      repeatedBlockers: missingSkills.slice(0, 15),
      repeatedSkipReasons: skipReasons.slice(0, 15),
      averageResumeCoverage: Math.min(
        100,
        Math.max(
          0,
          average(
            snapshots.map((snapshot) => snapshot.resumeGap?.coveragePercentage).filter(Number.isFinite)
          )
        )
      ),
      highestImpactGaps: missingSkills.slice(0, 10)
    },
    locationIntelligence: {
      regions: locations,
      workModels,
      sponsorshipByRegion: rankSponsorshipByRegion(snapshots)
    },
    personalStrategy,
    learningLoop,
    applicationBehaviorIntelligence,
    trends,
    trendSignals,
    confidence,
    limitations: [
      "All metrics describe only the user's observed SwapOpt job sample.",
      "Initiative classifications are signals from posting text, not verified company-wide programs.",
      "Small samples, repeated postings, and narrow date ranges reduce confidence.",
      "Application behavior metrics show observed associations only and do not establish causation or candidate interest."
    ]
  };
}

function rankSkillDemand(snapshots) {
  const values = new Map();
  for (const snapshot of snapshots) {
    const verified = new Set((snapshot.resumeGap?.matchedVerifiedSkills ?? []).map(normaliseEntityKey));
    const missing = new Set((snapshot.resumeGap?.missingMandatorySkills ?? []).map(normaliseEntityKey));
    for (const skill of snapshot.skills ?? []) {
      const current = values.get(skill.normalizedKey) ?? {
        name: skill.name,
        total: 0,
        mandatory: 0,
        preferred: 0,
        mentioned: 0,
        verifiedMatches: 0,
        missingCount: 0,
        companies: new Set(),
        roles: new Set(),
        regions: new Set()
      };
      current.total += 1;
      current[skill.requirement] = (current[skill.requirement] ?? 0) + 1;
      if (verified.has(skill.normalizedKey)) current.verifiedMatches += 1;
      if (missing.has(skill.normalizedKey)) current.missingCount += 1;
      current.companies.add(snapshot.company?.canonicalName);
      current.roles.add(snapshot.role?.canonicalName);
      current.regions.add(snapshot.region);
      values.set(skill.normalizedKey, current);
    }
  }
  return [...values.values()]
    .map((item) => ({
      ...item,
      companies: [...item.companies].filter(Boolean).sort(),
      roles: [...item.roles].filter(Boolean).sort(),
      regions: [...item.regions].filter(Boolean).sort()
    }))
    .sort((a, b) => b.total - a.total || b.mandatory - a.mandatory || a.name.localeCompare(b.name));
}

function rankNamedItems(snapshots, field) {
  return rankArray(snapshots, (snapshot) => (snapshot[field] ?? []).map((item) => item.name));
}

function rankCompanies(snapshots) {
  const values = new Map();
  for (const snapshot of snapshots) {
    const name = snapshot.company?.canonicalName ?? "Unknown company";
    const key = snapshot.company?.normalizedKey ?? normaliseEntityKey(name);
    const current = values.get(key) ?? {
      company: name,
      observationCount: 0,
      roles: new Map(),
      skills: new Map(),
      technologies: new Map(),
      initiatives: new Map(),
      people: new Map(),
      firstObservedAt: snapshot.capturedAt,
      lastObservedAt: snapshot.capturedAt
    };
    current.observationCount += 1;
    current.firstObservedAt = earlier(current.firstObservedAt, snapshot.capturedAt);
    current.lastObservedAt = later(current.lastObservedAt, snapshot.capturedAt);
    addCounts(current.roles, [snapshot.role?.canonicalName]);
    addCounts(current.skills, (snapshot.skills ?? []).map((item) => item.name));
    addCounts(current.technologies, (snapshot.technologies ?? []).map((item) => item.name));
    addCounts(current.initiatives, (snapshot.initiatives ?? []).map((item) => item.name));
    addCounts(current.people, (snapshot.people ?? []).map((item) => item.name));
    values.set(key, current);
  }
  return [...values.values()]
    .map((item) => ({
      company: item.company,
      observationCount: item.observationCount,
      repeatedRoles: mapToRanked(item.roles),
      repeatedSkills: mapToRanked(item.skills),
      repeatedTechnologies: mapToRanked(item.technologies),
      repeatedInitiatives: mapToRanked(item.initiatives),
      visiblePeople: mapToRanked(item.people),
      firstObservedAt: item.firstObservedAt,
      lastObservedAt: item.lastObservedAt
    }))
    .sort((a, b) => b.observationCount - a.observationCount || a.company.localeCompare(b.company));
}

function rankSponsorshipByRegion(snapshots) {
  const values = new Map();
  for (const snapshot of snapshots) {
    const region = snapshot.region || "Unknown";
    const current = values.get(region) ?? {
      region,
      total: 0,
      available: 0,
      restricted: 0,
      citizenshipRequired: 0,
      notExplicitlyStated: 0
    };
    current.total += 1;
    const status = snapshot.sponsorship?.status;
    if (status === "available") current.available += 1;
    else if (status === "restricted") current.restricted += 1;
    else if (status === "citizenship-required") current.citizenshipRequired += 1;
    else current.notExplicitlyStated += 1;
    values.set(region, current);
  }
  return [...values.values()].sort((a, b) => b.total - a.total || a.region.localeCompare(b.region));
}

function calculateTimeSeries(snapshots) {
  const values = new Map();
  for (const snapshot of snapshots) {
    const date = new Date(snapshot.capturedAt);
    if (!Number.isFinite(date.getTime())) continue;
    const period = date.toISOString().slice(0, 10);
    const current = values.get(period) ?? {
      period,
      jobs: 0,
      companies: new Set(),
      skills: new Map(),
      technologies: new Map(),
      initiatives: new Map()
    };
    current.jobs += 1;
    current.companies.add(snapshot.company?.canonicalName);
    addCounts(current.skills, (snapshot.skills ?? []).map((item) => item.name));
    addCounts(current.technologies, (snapshot.technologies ?? []).map((item) => item.name));
    addCounts(current.initiatives, (snapshot.initiatives ?? []).map((item) => item.name));
    values.set(period, current);
  }
  return [...values.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((item) => ({
      period: item.period,
      jobs: item.jobs,
      companies: item.companies.size,
      skills: mapToRanked(item.skills),
      technologies: mapToRanked(item.technologies),
      initiatives: mapToRanked(item.initiatives)
    }));
}

function calculateTrendSignals(series) {
  if (series.length < 2) {
    return [{
      metric: "jobs",
      label: "Insufficient history",
      change: 0,
      explanation: "At least two observed dates are required for directional comparison."
    }];
  }
  const midpoint = Math.ceil(series.length / 2);
  const previous = series.slice(0, midpoint);
  const current = series.slice(midpoint);
  const previousJobs = previous.reduce((sum, item) => sum + item.jobs, 0);
  const currentJobs = current.reduce((sum, item) => sum + item.jobs, 0);
  const change = currentJobs - previousJobs;
  return [{
    metric: "jobs",
    label: change > 0 ? "Observed increase" : change < 0 ? "Observed decrease" : "Stable in observed sample",
    change,
    explanation: "Compares the later half of the selected observed dates with the earlier half."
  }];
}

function latestSnapshotsByFingerprint(snapshots) {
  const preferred = new Map();

  for (const snapshot of snapshots) {
    const key =
      snapshot.sourceFingerprint ??
      snapshot.jobId ??
      snapshot.id;

    if (!key) continue;

    const existing =
      preferred.get(key) ??
      null;

    if (
      existing === null ||
      compareMarketSnapshots(
        snapshot,
        existing
      ) >
        0
    ) {
      preferred.set(
        key,
        snapshot
      );
    }
  }

  return [
    ...preferred.values()
  ];
}

function compareMarketSnapshots(left, right) {
  const leftCurrent =
    left?.extractionVersion ===
      MARKET_EXTRACTION_VERSION
      ? 1
      : 0;
  const rightCurrent =
    right?.extractionVersion ===
      MARKET_EXTRACTION_VERSION
      ? 1
      : 0;

  if (
    leftCurrent !==
      rightCurrent
  ) {
    return leftCurrent -
      rightCurrent;
  }

  const leftTime =
    new Date(
      left?.capturedAt ??
      0
    )
      .getTime();
  const rightTime =
    new Date(
      right?.capturedAt ??
      0
    )
      .getTime();

  return (
    Number.isFinite(leftTime)
      ? leftTime
      : 0
  ) -
    (
      Number.isFinite(rightTime)
        ? rightTime
        : 0
    );
}

function isSubmittedApplication(application) {
  if (!application) return false;

  const appliedAt =
    application.dateApplied ??
    application.appliedAt ??
    application.submittedAt ??
    null;

  if (
    appliedAt !==
      null &&
    String(
      appliedAt
    )
      .trim() !==
      ""
  ) {
    return true;
  }

  const status =
    resolveApplicationStatus(
      application
    );

  return [
    "applied",
    "interview",
    "offer",
    "rejected"
  ]
    .some(
      (
        submittedStatus
      ) =>
        status ===
          submittedStatus ||
        status.startsWith(
          `${submittedStatus}-`
        ) ||
        status.startsWith(
          `${submittedStatus} `
        )
    );
}

function latestByJob(decisions) {
  const values = new Map();
  for (const decision of decisions) {
    const current = values.get(decision.jobId);
    if (!current || new Date(decision.decidedAt ?? decision.updatedAt) > new Date(current.decidedAt ?? current.updatedAt)) {
      values.set(decision.jobId, decision);
    }
  }
  return values;
}

function rankSimple(rows, valueFactory) {
  const counts = new Map();
  for (const row of rows) {
    const value = valueFactory(row);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return mapToRanked(counts);
}

function rankArray(rows, valuesFactory) {
  const counts = new Map();
  for (const row of rows) addCounts(counts, valuesFactory(row));
  return mapToRanked(counts);
}

function addCounts(map, values) {
  for (const value of values) {
    if (!value) continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
}

function mapToRanked(map) {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function createFiltersHash(filters) {
  return createHash("sha256").update(stableStringify(filters), "utf8").digest("hex");
}

function createExportMetadata(filters) {
  return {
    product: "SwapOpt V4",
    exportType: "market-intelligence",
    generatedAt: new Date().toISOString(),
    schemaVersion: MARKET_INTELLIGENCE_SCHEMA_VERSION,
    extractionVersion: MARKET_EXTRACTION_VERSION,
    calculationVersion: MARKET_INTELLIGENCE_CALCULATION_VERSION,
    filters,
    privacy: {
      secretsIncluded: false,
      oauthTokensIncluded: false,
      apiKeysIncluded: false,
      hiddenLocalPathsIncluded: false
    },
    limitations: [
      "The export contains only the user's observed SwapOpt data.",
      "AI-classified and inferred signals retain confidence and evidence metadata."
    ]
  };
}

function entityColumns() {
  return [
    column("id", "Entity ID"),
    column("entityType", "Entity Type"),
    column("canonicalName", "Canonical Name"),
    column("normalizedKey", "Normalized Key"),
    column("aliases", "Aliases"),
    column("firstObservedAt", "First Observed At"),
    column("lastObservedAt", "Last Observed At"),
    column("observationCount", "Observation Count"),
    column("sourceRecordIds", "Source Record IDs"),
    column("confidence", "Confidence"),
    column("reviewState", "Review State"),
    column("metadata", "Metadata"),
    column("taxonomyVersion", "Taxonomy Version")
  ];
}

function column(key, header, value = undefined) {
  return { key, header, value };
}

function resolveApplicationStatus(application) {
  if (!application) return "";
  return String(
    application.status ??
    application.currentStatus ??
    application.applicationStatus ??
    application.stage ??
    ""
  ).trim().toLocaleLowerCase("en-US");
}

async function assertOwnedRecord(repository, context, id, label) {
  const record = await repository.findById(context, id);
  if (!record) {
    throw AppError.notFound(`${label} was not found.`, {
      code: `MARKET_${label.toLocaleUpperCase("en-US").replace(/[^A-Z0-9]+/gu, "_")}_NOT_FOUND`
    });
  }
  return record;
}

function validateStoredRecord(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.id !== "string") {
    throw new TypeError(`${name} must be a persisted record.`);
  }
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return String(value).trim().slice(0, 300);
}

function normalizeInteger(value, fallback, minimum, maximum) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number.parseInt(String(value), 10);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw AppError.validation(`Value must be an integer between ${minimum} and ${maximum}.`, {
      code: "MARKET_INVALID_PAGINATION"
    });
  }
  return number;
}

function normalizeErrorMessage(error) {
  const message = typeof error?.message === "string" ? error.message : "Unknown failure.";
  return message.replace(/[\r\n\t]+/gu, " ").trim().slice(0, 500);
}

function normalizeErrorCode(value) {
  if (typeof value !== "string") return null;
  const code = value.trim().toLocaleUpperCase("en-US").replace(/[^A-Z0-9_]+/gu, "_").slice(0, 100);
  return /^[A-Z][A-Z0-9_]*$/u.test(code) ? code : null;
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function average(values) {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function earlier(left, right) {
  return new Date(left) <= new Date(right) ? left : right;
}

function later(left, right) {
  return new Date(left) >= new Date(right) ? left : right;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function groupBy(values, keyFactory) {
  const result = {};
  for (const value of values) {
    const key = keyFactory(value);
    (result[key] ??= []).push(value);
  }
  return result;
}
