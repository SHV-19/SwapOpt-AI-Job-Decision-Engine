import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createPersonalRepositories } from "../../../backend/database/personal-repositories.js";
import { createRepositoryContext } from "../../../backend/database/repository.js";
import { createIdentityContext, IDENTITY_KINDS } from "../../../backend/services/identity/identity-provider.js";
import {
  createMarketIntelligenceService
} from "../../../backend/services/market-intelligence/market-intelligence-service.js";
import {
  createMarketSnapshotInput,
  normaliseDecisionInput,
  normaliseFilters
} from "../../../backend/services/market-intelligence/normalization.js";
import {
  escapeCsvCell
} from "../../../backend/services/market-intelligence/csv.js";

async function harness() {
  const dataDirectory = await mkdtemp(path.join(tmpdir(), "swapopt-market-intelligence-"));
  let sequence = 0;
  const repositoryRegistry = createPersonalRepositories({
    dataDirectory,
    idFactory: () => `market-record-${++sequence}`,
    clock: () => new Date("2026-08-05T12:00:00.000Z")
  });
  const identity = createIdentityContext({
    kind: IDENTITY_KINDS.LOCAL,
    providerId: "local",
    subjectId: "local-user",
    userId: "local-user",
    workspaceId: "local-workspace"
  });
  const context = createRepositoryContext(identity, { requestId: "market-test" });
  const service = createMarketIntelligenceService({
    repositoryRegistry,
    clock: () => new Date("2026-08-05T12:00:00.000Z")
  });
  return {
    dataDirectory,
    repositoryRegistry,
    context,
    service,
    async cleanup() {
      await rm(dataDirectory, { recursive: true, force: true });
    }
  };
}

async function seedAnalysis(h, {
  title = "Senior Data Analyst",
  company = "Acme Analytics",
  url = "https://jobs.example.com/jobs/123?utm_source=test",
  location = "Phoenix, Arizona",
  pageText = [
    "Senior Data Analyst at Acme Analytics.",
    "Required qualifications: SQL, Power BI, and Python.",
    "Preferred: Snowflake and Tableau.",
    "Hybrid role in Phoenix, Arizona. Full-time.",
    "Salary: $90,000 - $110,000 per year.",
    "No visa sponsorship is available.",
    "Requires 3 years of experience.",
    "Support cloud migration and data governance.",
    "Recruiter: Jane Smith."
  ].join("\n")
} = {}) {
  const job = await h.repositoryRegistry.getRepository("jobs").create(h.context, {
    schemaVersion: 1,
    title,
    company,
    location,
    url,
    pageText,
    source: "job-analysis",
    analysedAt: "2026-08-05T11:59:00.000Z"
  });
  const jobAnalysis = await h.repositoryRegistry.getRepository("jobAnalyses").create(h.context, {
    schemaVersion: 1,
    jobId: job.id,
    analysis: {
      job_title: title,
      company,
      location,
      current_match_percent: 74,
      tailored_match_percent: 86,
      decision: "Tailor",
      mandatory_skills: ["SQL", "Power BI", "Python"],
      preferred_skills: ["Snowflake", "Tableau"]
    },
    metadata: {
      completedAt: "2026-08-05T11:59:00.000Z"
    }
  });
  return { job, jobAnalysis };
}

test("normalization validates filters, decisions, and spreadsheet cells", () => {
  assert.deepEqual(normaliseFilters({ company: "Acme", limit: "25" }), {
    company: "Acme",
    limit: 25,
    offset: 0
  });
  assert.throws(() => normaliseFilters({ unsupported: true }), /Unsupported/u);
  assert.throws(
    () => normaliseDecisionInput({ jobId: "job-1", decision: "skip" }),
    /primary reason/u
  );
  assert.equal(escapeCsvCell("=HYPERLINK(\"bad\")"), "\"'=HYPERLINK(\"\"bad\"\")\"");
});

test("snapshot extraction records normalized facts, evidence, and resume gaps", () => {
  const snapshot = createMarketSnapshotInput({
    job: {
      id: "job-1",
      title: "Senior BI Analyst",
      company: "Example Corp",
      location: "Phoenix, AZ",
      url: "https://example.com/jobs/1?utm_source=x",
      pageText: "Required: SQL and Power BI. Preferred: Snowflake. Hybrid. No sponsorship. Salary $80,000-$100,000. Cloud migration."
    },
    jobAnalysis: {
      id: "analysis-1",
      analysis: {
        job_title: "Senior BI Analyst",
        company: "Example Corp",
        current_match_percent: 75
      }
    },
    verifiedSkills: [{ name: "SQL", verificationStatus: "verified" }],
    baseResumes: [{ id: "resume-1", isDefault: true, content: "SQL Power BI dashboards" }],
    capturedAt: "2026-08-05T12:00:00.000Z"
  });
  assert.equal(snapshot.company.canonicalName, "Example Corp");
  assert.equal(snapshot.role.canonicalName, "Business Intelligence Analyst");
  assert.equal(snapshot.workModel, "hybrid");
  assert.equal(snapshot.sponsorship.status, "restricted");
  assert.equal(snapshot.salary.minimum, 80000);
  assert.ok(snapshot.skills.some((item) => item.name === "SQL"));
  assert.ok(!snapshot.skills.some((item) => item.name === "R"));
  assert.ok(snapshot.initiatives.some((item) => item.name === "Cloud migration"));
  assert.ok(snapshot.evidence.length > 0);
  assert.equal(snapshot.resumeGap.defaultBaseResumeId, "resume-1");
});


test("resume coverage uses one skill set for numerator and denominator and never exceeds 100 percent", () => {
  const snapshot = createMarketSnapshotInput({
    job: {
      id: "coverage-job",
      title: "Data Analyst",
      company: "Coverage Corp",
      location: "Phoenix, AZ",
      url: "https://example.com/jobs/coverage",
      pageText: [
        "Required: SQL.",
        "Our analytics stack includes Power BI, Tableau, Python, Snowflake, Looker, Excel, and R."
      ].join("\n")
    },
    jobAnalysis: {
      id: "coverage-analysis",
      analysis: {
        job_title: "Data Analyst",
        company: "Coverage Corp",
        current_match_percent: 70
      }
    },
    verifiedSkills: [
      "SQL",
      "Power BI",
      "Tableau",
      "Python",
      "Snowflake",
      "Looker",
      "Excel",
      "R"
    ].map((name) => ({
      name,
      verificationStatus: "verified"
    })),
    baseResumes: [],
    capturedAt: "2026-08-05T12:00:00.000Z"
  });

  assert.ok(
    snapshot.skills.some((skill) => skill.requirement === "mentioned")
  );
  assert.equal(
    snapshot.resumeGap.coveragePercentage,
    100
  );
});

test("service deduplicates snapshots, audits decisions, aggregates, backfills, and exports", async () => {
  const h = await harness();
  try {
    const { job, jobAnalysis } = await seedAnalysis(h);
    const first = await h.service.captureAnalysis({
      context: h.context,
      jobRecord: job,
      jobAnalysisRecord: jobAnalysis
    });
    const duplicate = await h.service.captureAnalysis({
      context: h.context,
      jobRecord: job,
      jobAnalysisRecord: jobAnalysis
    });
    assert.equal(first.created, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(await h.repositoryRegistry.getRepository("marketJobSnapshots").count(h.context), 1);
    const entities = await h.repositoryRegistry.getRepository("marketEntities").list(h.context);
    assert.ok(entities.length > 5);
    assert.ok(entities.every((entity) => entity.observationCount === 1));

    const decision = await h.service.createDecision(h.context, {
      jobId: job.id,
      jobAnalysisId: jobAnalysis.id,
      marketJobSnapshotId: first.snapshot.id,
      decision: "skip",
      primaryReason: "sponsorship",
      secondaryReasons: ["location"],
      constraintType: "hard",
      note: "No sponsorship available.",
      aiRecommendationAtDecision: "Tailor",
      userOverrodeAi: true,
      decidedAt: "2026-08-05T12:01:00.000Z"
    });
    const updated = await h.service.updateDecision(h.context, decision.id, {
      decision: "save",
      primaryReason: null,
      secondaryReasons: [],
      constraintType: "temporary",
      note: "Revisit later."
    });
    assert.equal(updated.decision, "save");
    assert.equal(updated.revisionHistory.length, 1);
    assert.equal(updated.revisionHistory[0].decision, "skip");

    const dashboard = await h.service.getDashboard(h.context, {});
    assert.equal(dashboard.summary.uniqueJobs, 1);
    assert.equal(dashboard.summary.saved, 1);
    assert.equal(dashboard.summary.proceed, 0);
    assert.equal(dashboard.summary.applied, 0);
    assert.ok(dashboard.personalFit.averageResumeCoverage <= 100);
    assert.ok(dashboard.skillDemand.some((item) => item.name === "SQL"));
    assert.equal(dashboard.personalStrategy.funnel.observedJobs, 1);
    assert.equal(dashboard.personalStrategy.funnel.submittedApplications, 0);
    assert.ok(Array.isArray(dashboard.personalStrategy.roleOpportunities));
    assert.ok(Array.isArray(dashboard.personalStrategy.skillPriorities));
    assert.equal(dashboard.confidence.label, "Insufficient evidence");

    await h.repositoryRegistry.getRepository("applications").create(h.context, {
      jobId: job.id,
      status: "Applied",
      dateApplied: "2026-08-05T12:05:00.000Z"
    });
    await h.service.updateDecision(h.context, updated.id, {
      decision: "apply",
      primaryReason: null,
      secondaryReasons: [],
      constraintType: null,
      note: "Proceed with this opportunity."
    });
    const submittedDashboard = await h.service.getDashboard(h.context, {});
    assert.equal(submittedDashboard.summary.proceed, 1);
    assert.equal(submittedDashboard.summary.applied, 1);
    assert.equal(submittedDashboard.summary.saved, 0);

    const jsonExport = await h.service.exportJson(h.context, {});
    assert.equal(jsonExport.mimeType, "application/json");
    assert.match(jsonExport.content, /"secretsIncluded": false/u);
    assert.doesNotMatch(jsonExport.content, /sk-[A-Za-z0-9]/u);

    const csvExport = await h.service.exportCsvPackage(h.context, {});
    assert.equal(csvExport.mimeType, "application/zip");
    assert.ok(Buffer.from(csvExport.content, "base64").subarray(0, 2).equals(Buffer.from("PK")));
    assert.ok(csvExport.files.includes("jobs.csv"));
    assert.ok(csvExport.files.includes("role-opportunities.csv"));
    assert.ok(csvExport.files.includes("skill-priorities.csv"));
    assert.ok(csvExport.files.includes("sponsorship-friction.csv"));
    assert.ok(csvExport.files.includes("market-strategy-actions.csv"));
    assert.ok(csvExport.files.includes("export-metadata.json"));

    const second = await seedAnalysis(h, {
      title: "Product Analyst",
      company: "Beta Corp",
      url: "https://jobs.example.com/jobs/456",
      pageText: "Product Analyst. Required: SQL and Tableau. Remote. Full-time."
    });
    const backfill = await h.service.backfill(h.context);
    assert.equal(backfill.status, "completed");
    assert.equal(backfill.recordsExamined, 2);
    assert.equal(backfill.recordsCreated, 1);
    assert.ok(backfill.recordsSkipped >= 1);
    assert.ok(second.job.id);
  } finally {
    await h.cleanup();
  }
});


test("outdated backfill reuses reference data and does not double-count entity observations", async () => {
  const h = await harness();
  try {
    const { job, jobAnalysis } = await seedAnalysis(h);
    const first = await h.service.captureAnalysis({
      context: h.context,
      jobRecord: job,
      jobAnalysisRecord: jobAnalysis
    });

    const entityRepository =
      h.repositoryRegistry.getRepository("marketEntities");
    const snapshotRepository =
      h.repositoryRegistry.getRepository("marketJobSnapshots");

    const entitiesBefore =
      await entityRepository.list(h.context);

    assert.ok(entitiesBefore.length > 0);
    assert.ok(entitiesBefore.every((entity) => entity.observationCount === 1));

    await snapshotRepository.update(
      h.context,
      first.snapshot.id,
      {
        extractionVersion: "l1.1"
      }
    );

    const backfill =
      await h.service.backfill(
        h.context,
        {
          outdatedOnly: true
        }
      );

    assert.equal(backfill.recordsCreated, 1);

    const entitiesAfter =
      await entityRepository.list(h.context);

    assert.equal(entitiesAfter.length, entitiesBefore.length);
    assert.ok(entitiesAfter.every((entity) => entity.observationCount === 1));
  } finally {
    await h.cleanup();
  }
});

test("repository ownership prevents cross-user market access", async () => {
  const h = await harness();
  try {
    const { job, jobAnalysis } = await seedAnalysis(h);
    await h.service.captureAnalysis({
      context: h.context,
      jobRecord: job,
      jobAnalysisRecord: jobAnalysis
    });
    const otherIdentity = createIdentityContext({
      kind: IDENTITY_KINDS.LOCAL,
      providerId: "local",
      subjectId: "other-user",
      userId: "other-user",
      workspaceId: "other-workspace"
    });
    const otherContext = createRepositoryContext(otherIdentity, { requestId: "other" });
    const jobs = await h.service.listJobs(otherContext, {});
    assert.equal(jobs.total, 0);
    await assert.rejects(
      h.service.createDecision(otherContext, {
        jobId: job.id,
        decision: "apply"
      }),
      /not found/iu
    );
  } finally {
    await h.cleanup();
  }
});
