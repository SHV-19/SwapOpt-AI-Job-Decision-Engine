import assert from "node:assert/strict";
import test from "node:test";

import {
  createRepositoryContext
} from "../../../backend/database/repository.js";

import {
  buildPersonalLearningProfile
} from "../../../backend/services/personal-learning-service.js";

import {
  createCareerOutcomeEngineService,
  CAREER_OUTCOME_ENGINE_CALCULATION_VERSION,
  CAREER_OUTCOME_ENGINE_SERVICE_NAME,
  CAREER_OUTCOME_ENGINE_SERVICE_SCHEMA_VERSION
} from "../../../backend/services/career-outcome-engine-service.js";

import {
  createIdentityContext,
  IDENTITY_KINDS
} from "../../../backend/services/identity/identity-provider.js";

function context() {
  const identity = createIdentityContext({
    kind: IDENTITY_KINDS.LOCAL,
    providerId: "local",
    subjectId: "local-user",
    userId: "local-user",
    workspaceId: "local-workspace"
  });

  return createRepositoryContext(identity, {
    requestId: "career-outcome-test"
  });
}

function validAnalysis(overrides = {}) {
  return {
    job_title: "Business Intelligence Analyst",
    company: "Acme",
    location: "Phoenix, Arizona",
    current_match_percent: 82,
    tailored_match_percent: 88,
    hiring_logic_score: 8,
    technical_match_score: 8,
    responsibility_match_score: 8,
    experience_level_score: 8,
    domain_transfer_score: 7,
    sponsorship_risk_score: 5,
    target_level: "Strong Target",
    decision: "Apply",
    time_priority: "High",
    h1b_risk: "Medium",
    next_action: "Apply with the strongest relevant resume.",
    score_explanation: "The current role is a strong fit.",
    why_they_might_hire: [
      "Strong SQL and business intelligence experience."
    ],
    why_they_might_pass: [
      "Sponsorship is not explicitly stated."
    ],
    keywords_to_emphasize: [
      "SQL",
      "Power BI"
    ],
    missing_keywords: [],
    recommended_projects: [
      "FIFA World Cup 2026 Sponsorship Analytics Platform"
    ],
    best_resume_angle:
      "Lead with business intelligence, SQL, reporting automation, and stakeholder-facing analytics.",
    risk_or_overclaim_warning:
      "Do not claim unsupported experience.",
    ...overrides
  };
}

function snapshot(index, {
  role = "Business Intelligence Analyst",
  company = "Acme"
} = {}) {
  return {
    jobId: `history-${index}`,
    capturedAt: `2026-08-${String(Math.min(index, 14)).padStart(2, "0")}T12:00:00.000Z`,
    company: {
      canonicalName: company,
      normalizedKey: company.toLowerCase().replace(/[^a-z0-9]+/gu, "")
    },
    role: {
      canonicalName: role,
      normalizedKey: role.toLowerCase().replace(/[^a-z0-9]+/gu, "")
    },
    region: "Phoenix Metropolitan Area",
    sponsorship: {
      status: "not-explicitly-stated",
      explicit: false,
      evidence: null
    },
    confidence: 0.95,
    skills: [
      {
        name: "SQL",
        normalizedKey: "sql"
      },
      {
        name: "Power BI",
        normalizedKey: "powerbi"
      }
    ],
    experienceRequirements: [
      {
        minimumYears: 3
      }
    ],
    sourceUrl: `https://example.test/history-${index}`
  };
}

function learningProfile({
  applications = 0,
  outcome = "Rejected"
} = {}) {
  const snapshots = Array.from(
    {
      length: applications
    },
    (_, index) => snapshot(index + 1)
  );

  return buildPersonalLearningProfile({
    snapshots,
    applications: snapshots.map((item) => ({
      jobId: item.jobId,
      status: outcome,
      updatedAt: "2026-08-14T12:00:00.000Z"
    })),
    decisions: []
  }, {
    generatedAt: "2026-08-14T12:00:00.000Z"
  });
}

function personalLearningService(profile) {
  return Object.freeze({
    schemaVersion: 1,

    async getProfile() {
      return profile;
    },

    async getCompanySignal() {
      return null;
    },

    async getStrategyFeedback() {
      return profile.strategyFeedback;
    }
  });
}

function careerEvidenceService({
  nodes = 12,
  edges = 9,
  userConfirmedNodes = 4,
  verifiedSourceNodes = 8
} = {}) {
  const decisionContext = Object.freeze({
    schemaVersion: 1,
    calculationVersion: "test",
    generatedAt: "2026-08-14T12:00:00.000Z",
    mode: "decision-eligible-only",
    candidateNodeId: "candidate:self",
    nodes: Object.freeze([]),
    edges: Object.freeze([]),
    summary: Object.freeze({
      nodes,
      edges,
      userConfirmedNodes,
      verifiedSourceNodes
    }),
    limitations: Object.freeze([])
  });

  return Object.freeze({
    schemaVersion: 1,
    name: "careerEvidenceService",

    async getSummary() {
      return decisionContext.summary;
    },

    async getGraph() {
      return decisionContext;
    },

    async getDecisionContext() {
      return decisionContext;
    },

    async listClaims() {
      return [];
    },

    async createClaim() {
      return {};
    },

    async updateClaim() {
      return {};
    },

    async archiveClaim() {
      return {};
    }
  });
}

function service(profile, evidenceOptions = {}) {
  return createCareerOutcomeEngineService({
    personalLearningService:
      personalLearningService(profile),

    careerEvidenceService:
      careerEvidenceService(evidenceOptions),

    clock:
      () =>
        new Date("2026-08-14T19:30:00.000Z")
  });
}

test(
  "Career Outcome Engine exposes a stable immutable service contract",
  () => {
    const engine = service(
      learningProfile()
    );

    assert.equal(
      engine.schemaVersion,
      CAREER_OUTCOME_ENGINE_SERVICE_SCHEMA_VERSION
    );

    assert.equal(
      engine.name,
      CAREER_OUTCOME_ENGINE_SERVICE_NAME
    );

    assert.equal(
      CAREER_OUTCOME_ENGINE_CALCULATION_VERSION,
      "2026-08-14.1"
    );

    assert.equal(
      Object.isFrozen(engine),
      true
    );
  }
);

test(
  "small outcome samples remain collecting and cannot influence recommendations",
  async () => {
    const engine = service(
      learningProfile({
        applications: 4
      }),
      {
        nodes: 18,
        edges: 13,
        userConfirmedNodes: 6,
        verifiedSourceNodes: 12
      }
    );

    const profile = await engine.getProfile(
      context()
    );

    assert.equal(
      profile.readiness.stage,
      "collecting"
    );

    assert.equal(
      profile.readiness.canInfluenceRecommendation,
      false
    );

    assert.equal(
      profile.outcomeHistory.applications,
      4
    );

    assert.deepEqual(
      profile.verifiedCareerEvidence,
      {
        decisionEligibleNodes: 18,
        decisionEligibleEdges: 13,
        userConfirmedNodes: 6,
        verifiedSourceNodes: 12
      }
    );

    assert.equal(
      Object.isFrozen(profile),
      true
    );
  }
);

test(
  "actionable outcome history is identified without making causal claims",
  async () => {
    const engine = service(
      learningProfile({
        applications: 5
      })
    );

    const profile = await engine.getProfile(
      context()
    );

    assert.equal(
      profile.readiness.stage,
      "actionable"
    );

    assert.equal(
      profile.readiness.canInfluenceRecommendation,
      true
    );

    assert.equal(
      profile.outcomeHistory.closedOutcomes,
      5
    );

    assert.equal(
      profile.outcomeHistory.confidence,
      "medium"
    );

    assert.ok(
      profile.guardrails.some(
        (item) =>
          /observational associations/iu.test(item)
      )
    );
  }
);

test(
  "established poor personal outcomes conservatively adapt Apply to Tailor and return an auditable decision",
  async () => {
    const engine = service(
      learningProfile({
        applications: 15
      })
    );

    const result = await engine.evaluate(
      context(),
      {
        payload: {
          pageText:
            "Acme is hiring a Business Intelligence Analyst in Phoenix, Arizona. SQL and Power BI are required.",
          url:
            "https://example.test/acme/bi-analyst"
        },
        analysis:
          validAnalysis()
      }
    );

    assert.equal(
      result.analysis.decision,
      "Tailor"
    );

    assert.equal(
      result.metadata.careerOutcome
        .readiness.stage,
      "established"
    );

    assert.equal(
      result.metadata.careerOutcome
        .baseline.decision,
      "Apply"
    );

    assert.equal(
      result.metadata.careerOutcome
        .recommendation.decision,
      "Tailor"
    );

    assert.equal(
      result.metadata.careerOutcome
        .recommendationChanged,
      true
    );

    assert.ok(
      result.metadata.careerOutcome
        .matchedHistoricalSignals.some(
          (item) =>
            item.type === "role-outcome" &&
            item.direction === "negative"
        )
    );

    assert.match(
      result.metadata.careerOutcome
        .limitations.join(" "),
      /does not infer causality/iu
    );
  }
);

test(
  "current explicit sponsorship evidence remains authoritative over historical outcome intelligence",
  async () => {
    const engine = service(
      learningProfile({
        applications: 15
      })
    );

    const result = await engine.evaluate(
      context(),
      {
        payload: {
          pageText:
            "Acme is hiring a Business Intelligence Analyst. Visa sponsorship is not available now or in the future. SQL and Power BI are required.",
          url:
            "https://example.test/acme/bi-analyst"
        },
        analysis:
          validAnalysis()
      }
    );

    assert.equal(
      result.analysis.decision,
      "Skip"
    );

    assert.equal(
      result.analysis.h1b_risk,
      "High"
    );

    assert.ok(
      result.metadata.careerOutcome
        .matchedHistoricalSignals.some(
          (item) =>
            item.type ===
            "current-posting-sponsorship-blocker"
        )
    );
  }
);

test(
  "evaluation rejects malformed input before loading outcome sources",
  async () => {
    const profile =
      learningProfile();
    let sourceCalls = 0;

    const learning = personalLearningService(
      profile
    );

    const evidence =
      careerEvidenceService();

    const engine =
      createCareerOutcomeEngineService({
        personalLearningService: {
          ...learning,

          async getProfile() {
            sourceCalls += 1;
            return profile;
          }
        },

        careerEvidenceService: evidence
      });

    await assert.rejects(
      () =>
        engine.evaluate(
          context(),
          {
            payload: {},
            analysis: {
              decision: "Apply"
            }
          }
        )
    );

    assert.equal(
      sourceCalls,
      0
    );
  }
);
