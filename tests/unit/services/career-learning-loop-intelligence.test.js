import assert from "node:assert/strict";
import test from "node:test";

import {
  CAREER_LEARNING_LOOP_CALCULATION_VERSION,
  calculateCareerLearningLoop
} from "../../../backend/services/career-learning-loop-intelligence.js";

function snapshot(jobId, index = 1) {
  return {
    id: `snapshot-${jobId}`,
    jobId,
    capturedAt: `2026-07-${String(Math.min(index, 28)).padStart(2, "0")}T12:00:00.000Z`,
    company: {
      canonicalName: `Company ${index}`,
      normalizedKey: `company${index}`
    },
    role: {
      canonicalName: "Data Analyst",
      normalizedKey: "dataanalyst"
    },
    sourcePlatform: "linkedin"
  };
}

function analysis(jobId, {
  recommendation = "Apply",
  baseline = recommendation,
  influenced = false,
  completedAt = "2026-07-01T12:00:00.000Z"
} = {}) {
  return {
    id: `analysis-${jobId}`,
    jobId,
    analysis: {
      job_title: "Data Analyst",
      company: "Acme",
      current_match_percent: 82,
      decision: recommendation
    },
    metadata: {
      completedAt,
      careerOutcome: {
        baseline: {
          decision: baseline,
          currentMatchPercent: 82
        },
        recommendation: {
          decision: recommendation
        },
        changed: influenced,
        recommendationChanged: influenced,
        timePriorityChanged: false,
        matchedHistoricalSignals: influenced
          ? [
              {
                type: "role-outcome"
              }
            ]
          : [],
        readiness: {
          stage: influenced
            ? "actionable"
            : "collecting"
        }
      }
    }
  };
}

function application(jobId, index, {
  status = "Rejected",
  interviewAt = null
} = {}) {
  return {
    id: `application-${jobId}`,
    jobId,
    status,
    dateApplied: `2026-08-${String(Math.min(index, 28)).padStart(2, "0")}T12:00:00.000Z`,
    interviewAt,
    updatedAt: `2026-08-${String(Math.min(index, 28)).padStart(2, "0")}T18:00:00.000Z`
  };
}

function interviewEvent(jobId, index) {
  return {
    id: `event-${jobId}`,
    applicationId: `application-${jobId}`,
    eventType: "interview-stage-entered",
    newStatus: "Interview",
    eventAt: `2026-08-${String(Math.min(index, 28)).padStart(2, "0")}T15:00:00.000Z`
  };
}

test("learning loop preserves interview-stage evidence after an application is later rejected", () => {
  const report =
    calculateCareerLearningLoop(
      {
        snapshots: [
          snapshot("job-1")
        ],
        decisions: [],
        jobAnalyses: [
          analysis("job-1")
        ],
        applications: [
          application(
            "job-1",
            1
          )
        ],
        applicationStatusEvents: [
          interviewEvent(
            "job-1",
            1
          )
        ]
      },
      {
        generatedAt:
          "2026-08-14T12:00:00.000Z"
      }
    );

  assert.equal(
    report.calculationVersion,
    CAREER_LEARNING_LOOP_CALCULATION_VERSION
  );
  assert.equal(
    report.summary.submittedApplications,
    1
  );
  assert.equal(
    report.summary.interviewStageReached,
    1
  );
  assert.equal(
    report.audits[0].outcome,
    "rejected-after-interview"
  );
  assert.equal(
    report.audits[0].interviewReached,
    true
  );
});

test("learning loop exposes recommendation calibration without causal claims", () => {
  const jobs =
    Array.from(
      {
        length: 10
      },
      (_, index) =>
        `job-${index + 1}`
    );

  const report =
    calculateCareerLearningLoop(
      {
        snapshots:
          jobs.map(
            (jobId, index) =>
              snapshot(
                jobId,
                index + 1
              )
          ),
        decisions: [],
        jobAnalyses:
          jobs.map(
            (jobId, index) =>
              analysis(
                jobId,
                {
                  influenced:
                    index < 5,
                  completedAt:
                    `2026-07-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`
                }
              )
          ),
        applications:
          jobs.map(
            (jobId, index) =>
              application(
                jobId,
                index + 1
              )
          ),
        applicationStatusEvents:
          jobs
            .slice(
              0,
              5
            )
            .map(
              (jobId, index) =>
                interviewEvent(
                  jobId,
                  index + 1
                )
            )
      },
      {
        generatedAt:
          "2026-08-14T12:00:00.000Z"
      }
    );

  const apply =
    report.calibration.find(
      (item) =>
        item.recommendation ===
          "Apply"
    );

  assert.equal(
    apply.submitted,
    10
  );
  assert.equal(
    apply.interviews,
    5
  );
  assert.equal(
    apply.interviewRateAmongSubmitted,
    50
  );
  assert.equal(
    report.learningInfluence
      .comparisonAvailable,
    true
  );
  assert.match(
    report.learningInfluence
      .interpretation,
    /does not prove/u
  );
  assert.ok(
    report.guardrails.some(
      (item) =>
        /causality/u.test(
          item
        )
    )
  );
});

test("recent outcome drift is advisory and never changes a recommendation by itself", () => {
  const jobs =
    Array.from(
      {
        length: 20
      },
      (_, index) =>
        `job-${index + 1}`
    );

  const applications =
    jobs.map(
      (
        jobId,
        index
      ) =>
        application(
          jobId,
          index + 1
        )
    );

  const events =
    jobs
      .slice(
        0,
        6
      )
      .map(
        (
          jobId,
          index
        ) =>
          interviewEvent(
            jobId,
            index + 1
          )
      );

  const report =
    calculateCareerLearningLoop(
      {
        snapshots:
          jobs.map(
            (jobId, index) =>
              snapshot(
                jobId,
                index + 1
              )
          ),
        decisions: [],
        jobAnalyses:
          jobs.map(
            (
              jobId,
              index
            ) =>
              analysis(
                jobId,
                {
                  completedAt:
                    `2026-07-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`
                }
              )
          ),
        applications,
        applicationStatusEvents:
          events
      },
      {
        generatedAt:
          "2026-08-14T12:00:00.000Z"
      }
    );

  assert.equal(
    report.readiness.stage,
    "compounding"
  );
  assert.equal(
    report.drift.affectsRecommendation,
    false
  );
  assert.equal(
    report.drift.recentSample,
    10
  );
  assert.equal(
    report.drift.priorSample,
    10
  );
  assert.equal(
    report.maturity
      .longitudinalAdvantage,
    "compounding"
  );
});

test("recent unsubmitted Apply recommendations remain unresolved instead of being mislabeled as divergence", () => {
  const report =
    calculateCareerLearningLoop(
      {
        snapshots: [
          snapshot("job-recent")
        ],
        decisions: [],
        jobAnalyses: [
          analysis(
            "job-recent",
            {
              completedAt:
                "2026-08-13T12:00:00.000Z"
            }
          )
        ],
        applications: [],
        applicationStatusEvents: []
      },
      {
        generatedAt:
          "2026-08-14T12:00:00.000Z"
      }
    );

  assert.equal(
    report.audits[0]
      .behaviorAlignment,
    "unresolved"
  );
  assert.equal(
    report.summary
      .behaviorDivergedFromRecommendation,
    0
  );
});

test("learning summaries use the complete longitudinal history while returned audits stay bounded", () => {
  const jobs = Array.from(
    {
      length: 300
    },
    (_, index) => `job-history-${index + 1}`
  );

  const report = calculateCareerLearningLoop(
    {
      snapshots: jobs.map((jobId, index) => snapshot(jobId, index + 1)),
      decisions: [],
      jobAnalyses: jobs.map((jobId, index) =>
        analysis(jobId, {
          completedAt: `2026-07-${String(Math.min(index + 1, 28)).padStart(2, "0")}T12:00:00.000Z`
        })
      ),
      applications: jobs.map((jobId, index) => application(jobId, index + 1)),
      applicationStatusEvents: []
    },
    {
      generatedAt: "2026-08-14T12:00:00.000Z"
    }
  );

  assert.equal(report.summary.auditedDecisions, 300);
  assert.equal(report.summary.submittedApplications, 300);
  assert.equal(report.calibration.find((item) => item.recommendation === "Apply").submitted, 300);
  assert.equal(report.audits.length, 250);
});
