import {
  AppError
} from "../../utils/app-error.js";

export const APPLICATION_BEHAVIOR_SCHEMA_VERSION = 1;

export const APPLICATION_BEHAVIOR_ACTIONS = Object.freeze([
  "job-analysed",
  "resume-generated",
  "cover-letter-generated",
  "networking-used",
  "recruiter-saved",
  "application-assistant-used",
  "applied",
  "interview-prep-used"
]);

export const RESUME_ACTIONS = Object.freeze([
  "Use Base Resume",
  "Tailor Resume",
  "Do Not Tailor Yet",
  "Do Not Tailor"
]);

export const EFFORT_LEVELS = Object.freeze([
  "Low",
  "Medium",
  "High"
]);

const ACTION_SET = new Set(APPLICATION_BEHAVIOR_ACTIONS);
const TERMINAL_APPLICATION_STATUSES = new Set([
  "Offer",
  "Rejected",
  "Withdrawn"
]);
const APPLIED_APPLICATION_STATUSES = new Set([
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn"
]);

export function deriveJobStrategyGuidance(analysis = {}) {
  const decision = String(analysis?.decision ?? "").trim();
  const currentMatch = finitePercentage(analysis?.current_match_percent);
  const tailoredMatch = finitePercentage(analysis?.tailored_match_percent);
  const expectedGain = currentMatch === null || tailoredMatch === null
    ? null
    : tailoredMatch - currentMatch;

  let resumeAction;
  switch (decision) {
    case "Skip":
      resumeAction = "Do Not Tailor";
      break;
    case "Save":
      resumeAction = "Do Not Tailor Yet";
      break;
    case "Tailor":
      resumeAction = "Tailor Resume";
      break;
    case "Apply":
      resumeAction =
        currentMatch !== null &&
        currentMatch >= 85 &&
        (expectedGain === null || expectedGain < 5)
          ? "Use Base Resume"
          : "Tailor Resume";
      break;
    default:
      resumeAction = "Do Not Tailor Yet";
      break;
  }

  let effortLevel;
  if (decision === "Skip" || decision === "Save") {
    effortLevel = "Low";
  } else if (decision === "Tailor") {
    effortLevel = currentMatch !== null && currentMatch >= 75
      ? "Medium"
      : "High";
  } else if (decision === "Apply") {
    effortLevel = currentMatch !== null && currentMatch >= 85
      ? "Low"
      : currentMatch !== null && currentMatch >= 70
        ? "Medium"
        : "High";
  } else {
    effortLevel = "Low";
  }

  return Object.freeze({
    jobDecision: decision || "Save",
    resumeAction,
    effortLevel
  });
}

export function normaliseApplicationBehaviorInput(payload, {
  clock = () => new Date()
} = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw AppError.validation("Application behavior must be an object.", {
      code: "APPLICATION_BEHAVIOR_INVALID"
    });
  }
  const allowed = new Set([
    "jobId",
    "applicationId",
    "action",
    "occurredAt",
    "source"
  ]);
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) {
      throw AppError.validation(`Unsupported application behavior field: ${key}.`, {
        code: "APPLICATION_BEHAVIOR_FIELD_UNSUPPORTED"
      });
    }
  }
  const jobId = requiredId(payload.jobId, "jobId");
  const applicationId = optionalId(payload.applicationId, "applicationId");
  const action = String(payload.action ?? "").trim().toLocaleLowerCase("en-US");
  if (!ACTION_SET.has(action)) {
    throw AppError.validation("Application behavior action is not supported.", {
      code: "APPLICATION_BEHAVIOR_ACTION_INVALID",
      details: {
        supportedActions: APPLICATION_BEHAVIOR_ACTIONS
      }
    });
  }
  const occurredAt = normaliseIso(payload.occurredAt ?? clock().toISOString());
  const source = normaliseSource(payload.source);

  return Object.freeze({
    schemaVersion: APPLICATION_BEHAVIOR_SCHEMA_VERSION,
    jobId,
    applicationId,
    action,
    occurredAt,
    source
  });
}

export function calculateApplicationBehaviorIntelligence(dataset, {
  now = new Date()
} = {}) {
  const snapshots = Array.isArray(dataset?.snapshots) ? dataset.snapshots : [];
  const applications = Array.isArray(dataset?.applications) ? dataset.applications : [];
  const behaviorEvents = Array.isArray(dataset?.behaviorEvents) ? dataset.behaviorEvents : [];
  const jobAnalyses = Array.isArray(dataset?.jobAnalyses) ? dataset.jobAnalyses : [];
  const resumeDocuments = Array.isArray(dataset?.applicationResumeDocuments) ? dataset.applicationResumeDocuments : [];
  const coverLetters = Array.isArray(dataset?.coverLetters) ? dataset.coverLetters : [];
  const decisions = Array.isArray(dataset?.decisions) ? dataset.decisions : [];

  const applicationByJob = latestRecordByJob(applications);
  const analysisByJob = latestRecordByJob(jobAnalyses);
  const resumesByJob = groupByJob(resumeDocuments);
  const coverLettersByJob = groupByJob(coverLetters);
  const eventsByJob = groupByJob(behaviorEvents);
  const snapshotByJob = latestSnapshotByJob(snapshots);
  const jobIds = new Set([
    ...snapshotByJob.keys(),
    ...applicationByJob.keys(),
    ...analysisByJob.keys(),
    ...eventsByJob.keys(),
    ...resumesByJob.keys(),
    ...coverLettersByJob.keys()
  ]);

  const opportunities = [...jobIds]
    .map((jobId) => {
      const snapshot = snapshotByJob.get(jobId) ?? null;
      const application = applicationByJob.get(jobId) ?? null;
      const jobAnalysis = analysisByJob.get(jobId) ?? null;
      const explicitEvents = eventsByJob.get(jobId) ?? [];
      const resumeArtifacts = resumesByJob.get(jobId) ?? [];
      const coverLetterArtifacts = coverLettersByJob.get(jobId) ?? [];
      const derivedEvents = deriveArtifactEvents({
        jobId,
        snapshot,
        application,
        resumeArtifacts,
        coverLetterArtifacts
      });
      const allEvents = dedupeEvents([...explicitEvents, ...derivedEvents]);
      const actionCounts = countActions(allEvents);
      const analysis = jobAnalysis?.analysis ?? {};
      const strategy = deriveJobStrategyGuidance(analysis);
      const currentMatch =
        finitePercentage(snapshot?.fit?.currentMatchPercent) ??
        finitePercentage(analysis.current_match_percent);
      const status = normaliseStatus(application?.status);
      const applied = Boolean(
        application?.dateApplied ||
        APPLIED_APPLICATION_STATUSES.has(status) ||
        actionCounts.get("applied")
      );
      const interviewed = status === "Interview" || status === "Offer";
      const offered = status === "Offer";
      const rejected = status === "Rejected";
      const tailoredResumeUsed =
        resumeArtifacts.length > 0 ||
        Boolean(actionCounts.get("resume-generated"));
      const coverLetterUsed =
        coverLetterArtifacts.length > 0 ||
        Boolean(actionCounts.get("cover-letter-generated"));
      const networkingUsed = Boolean(actionCounts.get("networking-used"));
      const recruiterSaved = Boolean(actionCounts.get("recruiter-saved"));
      const assistantUsed = Boolean(actionCounts.get("application-assistant-used"));
      const interviewPrepUsed = Boolean(actionCounts.get("interview-prep-used"));
      const actualResumeBehavior = tailoredResumeUsed
        ? "Tailored Resume"
        : applied
          ? "No Tailored Resume Observed"
          : "Not Yet Observed";
      const workflowInvestment = classifyWorkflowInvestment({
        tailoredResumeUsed,
        coverLetterUsed,
        networkingUsed,
        recruiterSaved,
        assistantUsed,
        interviewPrepUsed
      });
      const outcome = status || (applied ? "Applied" : "Not Applied");
      const scoreBand = matchScoreBand(currentMatch);
      const nextBestAction = determineNextBestAction({
        application,
        applied,
        status,
        strategy,
        tailoredResumeUsed,
        coverLetterUsed,
        networkingUsed,
        recruiterSaved,
        assistantUsed,
        interviewPrepUsed,
        now
      });

      return Object.freeze({
        jobId,
        jobAnalysisId: jobAnalysis?.id ?? snapshot?.jobAnalysisId ?? null,
        applicationId: application?.id ?? null,
        company: snapshot?.company?.canonicalName ?? null,
        role: snapshot?.role?.canonicalName ?? null,
        sourcePlatform: snapshot?.sourcePlatform ?? null,
        region: snapshot?.region ?? null,
        workModel: snapshot?.workModel ?? null,
        sponsorshipStatus: snapshot?.sponsorship?.status ?? null,
        seniority: snapshot?.seniority ?? null,
        experienceRequirements: snapshot?.experienceRequirements ?? [],
        currentMatchPercent: currentMatch,
        matchScoreBand: scoreBand,
        jobDecision: strategy.jobDecision,
        recommendedResumeAction: strategy.resumeAction,
        effortLevel: strategy.effortLevel,
        actualResumeBehavior,
        workflowInvestment,
        applied,
        interviewed,
        offered,
        rejected,
        status: status || null,
        outcome,
        behavior: Object.freeze({
          jobAnalysed: Boolean(actionCounts.get("job-analysed")),
          resumeGenerated: tailoredResumeUsed,
          coverLetterGenerated: coverLetterUsed,
          networkingUsed,
          recruiterSaved,
          applicationAssistantUsed: assistantUsed,
          applied,
          interviewPrepUsed
        }),
        behaviorEventCount: allEvents.length,
        nextBestAction,
        evidenceConfidence: calculateOpportunityConfidence({
          snapshot,
          application,
          allEvents
        })
      });
    })
    .sort((a, b) =>
      (b.currentMatchPercent ?? -1) - (a.currentMatchPercent ?? -1) ||
      String(a.company ?? "").localeCompare(String(b.company ?? ""))
    );

  const matchScoreOutcomes = aggregateMatchScoreOutcomes(opportunities);
  const featureUsageByMatchScore = aggregateMatchScoreFeatureUsage(opportunities);
  const effortRoi = aggregateEffortOutcomes(opportunities);
  const workflowOutcomeComparison = [
    outcomeSummary(
      "Full workflow",
      opportunities.filter(hasFullApplicationWorkflow)
    ),
    outcomeSummary(
      "Minimal workflow",
      opportunities.filter((item) => item.workflowInvestment === "Quick")
    )
  ];
  const resumeOutcomeComparison = compareBooleanUsage(
    opportunities,
    (item) => item.behavior.coverLetterGenerated,
    "Resume + cover letter",
    "Resume without generated cover letter",
    (item) => item.behavior.resumeGenerated
  );
  const networkingAssociation = compareBooleanUsage(
    opportunities,
    (item) => item.behavior.networkingUsed || item.behavior.recruiterSaved,
    "Networking evidence observed",
    "No networking evidence observed",
    (item) => item.applied
  );
  const lowFitHighInvestment = opportunities.filter((item) =>
    item.currentMatchPercent !== null &&
    item.currentMatchPercent < 60 &&
    item.workflowInvestment === "High Investment"
  );
  const highFitEfficient = opportunities.filter((item) =>
    item.currentMatchPercent !== null &&
    item.currentMatchPercent >= 80 &&
    item.workflowInvestment === "Quick" &&
    item.applied
  );

  return Object.freeze({
    schemaVersion: APPLICATION_BEHAVIOR_SCHEMA_VERSION,
    generatedAt: now.toISOString(),
    definitions: Object.freeze({
      quick: "No more than one preparation action beyond job analysis/application status.",
      tailored: "Two preparation signals, or resume/cover-letter tailoring without broader high-investment activity.",
      highInvestment: "Three or more preparation signals across resume, cover letter, networking, recruiter, assistant, and interview preparation.",
      fullWorkflow: "Resume generation, cover-letter generation, networking or recruiter evidence, and Application Assistant usage were all observed for the opportunity.",
      minimalWorkflow: "The observed workflow was classified as Quick.",
      causality: "Observed associations only. SwapOpt does not claim that a workflow action caused an interview, offer, or rejection.",
      interest: "Workflow investment is observed behavior and must not be interpreted as candidate interest unless interest was explicitly recorded."
    }),
    opportunities,
    matchScoreOutcomes,
    featureUsageByMatchScore,
    effortRoi,
    workflowOutcomeComparison,
    resumeOutcomeComparison,
    networkingAssociation,
    wastePatterns: Object.freeze({
      lowFitHighInvestmentCount: lowFitHighInvestment.length,
      lowFitHighInvestmentJobIds: lowFitHighInvestment.map((item) => item.jobId),
      highFitQuickAppliedCount: highFitEfficient.length,
      highFitQuickAppliedJobIds: highFitEfficient.map((item) => item.jobId)
    }),
    nextBestActions: opportunities
      .filter((item) => item.nextBestAction && !TERMINAL_APPLICATION_STATUSES.has(item.status))
      .map((item) => ({
        jobId: item.jobId,
        applicationId: item.applicationId,
        company: item.company,
        role: item.role,
        currentMatchPercent: item.currentMatchPercent,
        action: item.nextBestAction.action,
        reason: item.nextBestAction.reason,
        priority: item.nextBestAction.priority
      }))
  });
}

function deriveArtifactEvents({
  jobId,
  snapshot,
  application,
  resumeArtifacts,
  coverLetterArtifacts
}) {
  const events = [];
  if (snapshot) events.push(derivedEvent(jobId, "job-analysed", snapshot.capturedAt));
  if (resumeArtifacts.length > 0) {
    events.push(derivedEvent(jobId, "resume-generated", latestTimestamp(resumeArtifacts)));
  }
  if (coverLetterArtifacts.length > 0) {
    events.push(derivedEvent(jobId, "cover-letter-generated", latestTimestamp(coverLetterArtifacts)));
  }
  if (application && (
    application.dateApplied ||
    APPLIED_APPLICATION_STATUSES.has(normaliseStatus(application.status))
  )) {
    events.push(derivedEvent(jobId, "applied", application.dateApplied ?? application.updatedAt));
  }
  return events;
}

function derivedEvent(jobId, action, occurredAt) {
  return {
    jobId,
    action,
    occurredAt: normaliseIso(occurredAt ?? new Date(0).toISOString()),
    source: "derived-artifact"
  };
}

function countActions(events) {
  const counts = new Map();
  for (const event of events) {
    counts.set(event.action, (counts.get(event.action) ?? 0) + 1);
  }
  return counts;
}

function dedupeEvents(events) {
  const seen = new Set();
  const result = [];
  for (const event of events) {
    if (!event?.jobId || !ACTION_SET.has(event.action)) continue;
    const key = `${event.jobId}:${event.action}:${event.source === "derived-artifact" ? "artifact" : event.id ?? event.occurredAt ?? result.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
}

function classifyWorkflowInvestment(values) {
  const signals = [
    values.tailoredResumeUsed,
    values.coverLetterUsed,
    values.networkingUsed,
    values.recruiterSaved,
    values.assistantUsed,
    values.interviewPrepUsed
  ].filter(Boolean).length;
  if (signals >= 3) return "High Investment";
  if (signals >= 2) return "Tailored";
  if (signals === 1 && (values.tailoredResumeUsed || values.coverLetterUsed)) {
    return "Tailored";
  }
  return "Quick";
}

function aggregateMatchScoreOutcomes(opportunities) {
  const bands = [
    ["90–100", 90, 100],
    ["80–89", 80, 89.999999],
    ["70–79", 70, 79.999999],
    ["60–69", 60, 69.999999],
    ["Below 60", 0, 59.999999],
    ["Unknown", null, null]
  ];
  return bands.map(([band, minimum, maximum]) => {
    const rows = opportunities.filter((item) =>
      minimum === null
        ? item.currentMatchPercent === null
        : item.currentMatchPercent !== null &&
          item.currentMatchPercent >= minimum &&
          item.currentMatchPercent <= maximum
    );
    return outcomeSummary(band, rows);
  }).filter((item) => item.jobs > 0);
}

function aggregateMatchScoreFeatureUsage(opportunities) {
  return aggregateMatchScoreOutcomes(opportunities).map((bandSummary) => {
    const rows = opportunities.filter(
      (item) => item.matchScoreBand === bandSummary.label
    );
    return Object.freeze({
      band: bandSummary.label,
      jobs: rows.length,
      featureUsage: Object.freeze({
        resumeGenerated: usageRate(rows, (item) => item.behavior.resumeGenerated),
        coverLetterGenerated: usageRate(rows, (item) => item.behavior.coverLetterGenerated),
        networkingUsed: usageRate(
          rows,
          (item) => item.behavior.networkingUsed || item.behavior.recruiterSaved
        ),
        recruiterSaved: usageRate(rows, (item) => item.behavior.recruiterSaved),
        applicationAssistantUsed: usageRate(
          rows,
          (item) => item.behavior.applicationAssistantUsed
        ),
        applied: usageRate(rows, (item) => item.behavior.applied),
        interviewPrepUsed: usageRate(rows, (item) => item.behavior.interviewPrepUsed)
      })
    });
  });
}

function aggregateEffortOutcomes(opportunities) {
  return ["Quick", "Tailored", "High Investment"]
    .map((label) => outcomeSummary(
      label,
      opportunities.filter((item) => item.workflowInvestment === label)
    ));
}

function hasFullApplicationWorkflow(item) {
  return Boolean(
    item?.behavior?.resumeGenerated &&
    item?.behavior?.coverLetterGenerated &&
    (item?.behavior?.networkingUsed || item?.behavior?.recruiterSaved) &&
    item?.behavior?.applicationAssistantUsed
  );
}

function usageRate(rows, predicate) {
  const used = rows.filter(predicate).length;
  return Object.freeze({
    used,
    jobs: rows.length,
    rate: percentage(used, rows.length)
  });
}

function compareBooleanUsage(opportunities, predicate, usedLabel, unusedLabel, eligibility) {
  const eligible = opportunities.filter(eligibility);
  return [
    outcomeSummary(usedLabel, eligible.filter(predicate)),
    outcomeSummary(unusedLabel, eligible.filter((item) => !predicate(item)))
  ];
}

function outcomeSummary(label, rows) {
  const appliedRows = rows.filter((item) => item.applied);
  const interviews = appliedRows.filter((item) => item.interviewed).length;
  const offers = appliedRows.filter((item) => item.offered).length;
  const rejections = appliedRows.filter((item) => item.rejected).length;
  return Object.freeze({
    label,
    jobs: rows.length,
    applied: appliedRows.length,
    interviews,
    offers,
    rejections,
    interviewRateAmongApplied: percentage(interviews, appliedRows.length),
    offerRateAmongApplied: percentage(offers, appliedRows.length)
  });
}

function determineNextBestAction({
  application,
  applied,
  status,
  strategy,
  tailoredResumeUsed,
  coverLetterUsed,
  networkingUsed,
  recruiterSaved,
  assistantUsed,
  interviewPrepUsed,
  now
}) {
  if (TERMINAL_APPLICATION_STATUSES.has(status)) return null;
  if (status === "Interview" && !interviewPrepUsed) {
    return action("Prepare for interview", "An interview is active and no job-linked interview preparation is recorded.", "High");
  }
  if (application?.interviewAt && new Date(application.interviewAt) >= now && !interviewPrepUsed) {
    return action("Prepare for interview", "An upcoming interview is scheduled and preparation is not yet recorded.", "High");
  }
  if (!applied) {
    if (strategy.resumeAction === "Tailor Resume" && !tailoredResumeUsed) {
      return action("Tailor resume", "Job Analysis recommends tailoring and no tailored resume is recorded.", "High");
    }
    if (strategy.resumeAction === "Do Not Tailor Yet") {
      return action("Reassess before tailoring", "Job Analysis recommends delaying resume tailoring.", "Low");
    }
    if (strategy.resumeAction === "Do Not Tailor") {
      return action("Do not invest further", "Job Analysis recommends no resume tailoring for this opportunity.", "Low");
    }
    if (strategy.effortLevel !== "Low" && !coverLetterUsed) {
      return action("Prepare cover letter", "The recommended effort level supports additional application preparation.", "Medium");
    }
    if (strategy.effortLevel === "High" && !(networkingUsed || recruiterSaved)) {
      return action("Add networking evidence", "High-effort pursuit is recommended but no job-linked networking activity is recorded.", "Medium");
    }
    if (!assistantUsed && strategy.effortLevel === "High") {
      return action("Use Application Assistant", "High-effort application preparation remains incomplete.", "Medium");
    }
    return action("Apply", "The recorded preparation is consistent with the current Job Analysis recommendation.", "High");
  }
  if (application?.followUpAt && new Date(application.followUpAt) <= now) {
    return action("Follow up", "The tracked follow-up date is due.", "High");
  }
  if (!(networkingUsed || recruiterSaved) && status === "Applied") {
    return action("Consider targeted networking", "The application is active and no job-linked networking evidence is recorded.", "Medium");
  }
  return action("Track outcome", "The application is active and no higher-priority deterministic action is currently due.", "Low");
}

function action(value, reason, priority) {
  return Object.freeze({
    action: value,
    reason,
    priority
  });
}

function calculateOpportunityConfidence({
  snapshot,
  application,
  allEvents
}) {
  let score = 0;
  if (snapshot) score += 0.45;
  if (application) score += 0.3;
  if (allEvents.some((event) => event.source !== "derived-artifact")) score += 0.25;
  return score >= 0.85
    ? "high"
    : score >= 0.5
      ? "medium"
      : "low";
}

function matchScoreBand(value) {
  if (value === null) return "Unknown";
  if (value >= 90) return "90–100";
  if (value >= 80) return "80–89";
  if (value >= 70) return "70–79";
  if (value >= 60) return "60–69";
  return "Below 60";
}

function latestSnapshotByJob(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row?.jobId) continue;
    const current = map.get(row.jobId);
    if (!current || timestamp(row.capturedAt ?? row.updatedAt) > timestamp(current.capturedAt ?? current.updatedAt)) {
      map.set(row.jobId, row);
    }
  }
  return map;
}

function latestRecordByJob(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row?.jobId) continue;
    const current = map.get(row.jobId);
    if (!current || timestamp(row.updatedAt ?? row.createdAt) > timestamp(current.updatedAt ?? current.createdAt)) {
      map.set(row.jobId, row);
    }
  }
  return map;
}

function groupByJob(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row?.jobId) continue;
    const current = map.get(row.jobId) ?? [];
    current.push(row);
    map.set(row.jobId, current);
  }
  return map;
}

function latestTimestamp(rows) {
  return rows
    .map((row) => row.createdAt ?? row.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? new Date(0).toISOString();
}

function finitePercentage(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, number));
}

function percentage(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function timestamp(value) {
  const parsed = new Date(value ?? 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normaliseStatus(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || "";
}

function requiredId(value, field) {
  const text = String(value ?? "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(text)) {
    throw AppError.validation(`Application behavior ${field} is invalid.`, {
      code: "APPLICATION_BEHAVIOR_ID_INVALID"
    });
  }
  return text;
}

function optionalId(value, field) {
  if (value === null || value === undefined || value === "") return null;
  return requiredId(value, field);
}

function normaliseSource(value) {
  if (value === undefined || value === null || value === "") return "user-action";
  const source = String(value).trim().toLocaleLowerCase("en-US");
  if (!["user-action", "backend-workflow"].includes(source)) {
    throw AppError.validation("Application behavior source is invalid.", {
      code: "APPLICATION_BEHAVIOR_SOURCE_INVALID"
    });
  }
  return source;
}

function normaliseIso(value) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw AppError.validation("Application behavior occurredAt must be an ISO timestamp.", {
      code: "APPLICATION_BEHAVIOR_TIME_INVALID"
    });
  }
  return parsed.toISOString();
}
