import assert from "node:assert/strict";
import test from "node:test";

import {
  APPLICATION_BEHAVIOR_ACTIONS,
  calculateApplicationBehaviorIntelligence,
  deriveJobStrategyGuidance,
  normaliseApplicationBehaviorInput
} from "../../../backend/services/market-intelligence/application-behavior-intelligence.js";

const NOW = new Date("2026-08-13T12:00:00.000Z");

function snapshot(jobId, score, company, role) {
  return {
    id: `snapshot-${jobId}`,
    jobId,
    capturedAt: "2026-08-12T12:00:00.000Z",
    sourcePlatform: "linkedin",
    region: "Phoenix, Arizona",
    workModel: "hybrid",
    sponsorship: {
      status: "not-explicitly-stated"
    },
    company: {
      canonicalName: company
    },
    role: {
      canonicalName: role
    },
    fit: {
      currentMatchPercent: score
    }
  };
}

function analysis(jobId, decision, currentMatch, tailoredMatch = null) {
  return {
    id: `analysis-${jobId}`,
    jobId,
    createdAt: "2026-08-12T12:01:00.000Z",
    analysis: {
      decision,
      current_match_percent: currentMatch,
      tailored_match_percent: tailoredMatch
    }
  };
}

test("job strategy guidance deterministically maps job decision to resume action and effort", () => {
  assert.deepEqual(
    deriveJobStrategyGuidance({
      decision: "Skip",
      current_match_percent: 91
    }),
    {
      jobDecision: "Skip",
      resumeAction: "Do Not Tailor",
      effortLevel: "Low"
    }
  );

  assert.deepEqual(
    deriveJobStrategyGuidance({
      decision: "Apply",
      current_match_percent: 90,
      tailored_match_percent: 93
    }),
    {
      jobDecision: "Apply",
      resumeAction: "Use Base Resume",
      effortLevel: "Low"
    }
  );

  assert.deepEqual(
    deriveJobStrategyGuidance({
      decision: "Tailor",
      current_match_percent: 74,
      tailored_match_percent: 86
    }),
    {
      jobDecision: "Tailor",
      resumeAction: "Tailor Resume",
      effortLevel: "High"
    }
  );
});

test("application behavior input validates a supported immutable job-linked event", () => {
  const value = normaliseApplicationBehaviorInput(
    {
      jobId: "job-1",
      applicationId: "application-1",
      action: "NETWORKING-USED",
      source: "user-action"
    },
    {
      clock: () => NOW
    }
  );

  assert.deepEqual(value, {
    schemaVersion: 1,
    jobId: "job-1",
    applicationId: "application-1",
    action: "networking-used",
    occurredAt: NOW.toISOString(),
    source: "user-action"
  });
  assert.equal(Object.isFrozen(value), true);

  assert.throws(
    () => normaliseApplicationBehaviorInput({
      jobId: "job-1",
      action: "unknown-action"
    }),
    /not supported/iu
  );
  assert.ok(APPLICATION_BEHAVIOR_ACTIONS.includes("application-assistant-used"));
});

test("behavior intelligence reports feature usage, outcomes, effort, resume adherence, and next action without causal inference", () => {
  const dataset = {
    snapshots: [
      snapshot("job-1", 92, "Fast Apply Inc", "Data Analyst"),
      snapshot("job-2", 78, "Tailored Co", "Business Intelligence Analyst"),
      snapshot("job-3", 55, "Low Fit LLC", "Analytics Engineer"),
      snapshot("job-4", 85, "Pending Corp", "Product Analyst")
    ],
    jobAnalyses: [
      analysis("job-1", "Apply", 92, 94),
      analysis("job-2", "Tailor", 78, 88),
      analysis("job-3", "Tailor", 55, 72),
      analysis("job-4", "Apply", 85, 90)
    ],
    applications: [
      {
        id: "application-1",
        jobId: "job-1",
        status: "Applied",
        dateApplied: "2026-08-12",
        updatedAt: "2026-08-12T13:00:00.000Z"
      },
      {
        id: "application-2",
        jobId: "job-2",
        status: "Interview",
        dateApplied: "2026-08-11",
        interviewAt: "2026-08-14T17:00:00.000Z",
        updatedAt: "2026-08-12T14:00:00.000Z"
      },
      {
        id: "application-3",
        jobId: "job-3",
        status: "Rejected",
        dateApplied: "2026-08-10",
        updatedAt: "2026-08-12T15:00:00.000Z"
      }
    ],
    applicationResumeDocuments: [
      {
        id: "resume-2",
        jobId: "job-2",
        createdAt: "2026-08-11T10:00:00.000Z"
      },
      {
        id: "resume-3",
        jobId: "job-3",
        createdAt: "2026-08-10T10:00:00.000Z"
      }
    ],
    coverLetters: [
      {
        id: "cover-2",
        jobId: "job-2",
        createdAt: "2026-08-11T10:10:00.000Z"
      },
      {
        id: "cover-3",
        jobId: "job-3",
        createdAt: "2026-08-10T10:10:00.000Z"
      }
    ],
    behaviorEvents: [
      {
        id: "behavior-1",
        jobId: "job-2",
        action: "networking-used",
        occurredAt: "2026-08-11T10:20:00.000Z",
        source: "user-action"
      },
      {
        id: "behavior-2",
        jobId: "job-2",
        action: "application-assistant-used",
        occurredAt: "2026-08-11T10:30:00.000Z",
        source: "user-action"
      },
      {
        id: "behavior-3",
        jobId: "job-3",
        action: "networking-used",
        occurredAt: "2026-08-10T10:20:00.000Z",
        source: "user-action"
      }
    ],
    decisions: []
  };

  const intelligence = calculateApplicationBehaviorIntelligence(dataset, {
    now: NOW
  });

  assert.equal(intelligence.generatedAt, NOW.toISOString());
  assert.equal(intelligence.opportunities.length, 4);

  const quickHighFit = intelligence.opportunities.find((item) => item.jobId === "job-1");
  assert.equal(quickHighFit.workflowInvestment, "Quick");
  assert.equal(quickHighFit.actualResumeBehavior, "No Tailored Resume Observed");
  assert.equal(quickHighFit.recommendedResumeAction, "Use Base Resume");

  const fullWorkflow = intelligence.opportunities.find((item) => item.jobId === "job-2");
  assert.equal(fullWorkflow.workflowInvestment, "High Investment");
  assert.equal(fullWorkflow.behavior.resumeGenerated, true);
  assert.equal(fullWorkflow.behavior.coverLetterGenerated, true);
  assert.equal(fullWorkflow.behavior.networkingUsed, true);
  assert.equal(fullWorkflow.behavior.applicationAssistantUsed, true);
  assert.equal(fullWorkflow.interviewed, true);

  const matchBand = intelligence.featureUsageByMatchScore.find((item) => item.band === "70–79");
  assert.equal(matchBand.jobs, 1);
  assert.equal(matchBand.featureUsage.resumeGenerated.rate, 100);
  assert.equal(matchBand.featureUsage.networkingUsed.rate, 100);
  assert.equal(matchBand.featureUsage.applicationAssistantUsed.rate, 100);

  const fullOutcome = intelligence.workflowOutcomeComparison.find((item) => item.label === "Full workflow");
  const minimalOutcome = intelligence.workflowOutcomeComparison.find((item) => item.label === "Minimal workflow");
  assert.equal(fullOutcome.jobs, 1);
  assert.equal(fullOutcome.interviews, 1);
  assert.equal(minimalOutcome.jobs, 2);
  assert.equal(minimalOutcome.applied, 1);

  assert.equal(intelligence.wastePatterns.lowFitHighInvestmentCount, 1);
  assert.deepEqual(intelligence.wastePatterns.lowFitHighInvestmentJobIds, ["job-3"]);
  assert.equal(intelligence.wastePatterns.highFitQuickAppliedCount, 1);

  const pending = intelligence.nextBestActions.find((item) => item.jobId === "job-4");
  assert.equal(pending.action, "Tailor resume");

  assert.match(intelligence.definitions.causality, /associations only/iu);
  assert.match(intelligence.definitions.interest, /must not be interpreted as candidate interest/iu);
});

test("interview preparation is the highest-value unfinished action for an interview-stage application", () => {
  const intelligence = calculateApplicationBehaviorIntelligence({
    snapshots: [
      snapshot("job-5", 81, "Interview Co", "Data Analyst")
    ],
    jobAnalyses: [
      analysis("job-5", "Apply", 81, 89)
    ],
    applications: [
      {
        id: "application-5",
        jobId: "job-5",
        status: "Interview",
        dateApplied: "2026-08-11",
        interviewAt: "2026-08-14T17:00:00.000Z",
        updatedAt: "2026-08-12T14:00:00.000Z"
      }
    ],
    applicationResumeDocuments: [],
    coverLetters: [],
    behaviorEvents: [],
    decisions: []
  }, {
    now: NOW
  });

  assert.equal(intelligence.nextBestActions[0].action, "Prepare for interview");
  assert.equal(intelligence.nextBestActions[0].priority, "High");
});
