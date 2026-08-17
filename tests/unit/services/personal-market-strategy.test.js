import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePersonalMarketStrategy
} from "../../../backend/services/market-intelligence/personal-market-strategy.js";

function snapshot({
  id,
  jobId,
  role = "Data Analyst",
  company = "Acme",
  capturedAt = "2026-08-14T12:00:00.000Z",
  match = 80,
  coverage = 75,
  sponsorship = "not-explicitly-stated",
  region = "Arizona",
  skills = []
}) {
  return {
    id,
    jobId,
    capturedAt,
    role: {
      canonicalName: role
    },
    company: {
      canonicalName: company
    },
    region,
    sponsorship: {
      status: sponsorship
    },
    fit: {
      currentMatchPercent: match
    },
    resumeGap: {
      coveragePercentage: coverage,
      matchedVerifiedSkills: skills
        .filter((item) => item.verified)
        .map((item) => item.name),
      missingMandatorySkills: skills
        .filter((item) => item.missing)
        .map((item) => item.name)
    },
    skills: skills.map((item) => ({
      name: item.name,
      requirement: item.requirement ?? "mentioned"
    }))
  };
}

function application(jobId, status, dateApplied = "2026-08-14T12:05:00.000Z") {
  return {
    id: `application-${jobId}`,
    jobId,
    status,
    dateApplied,
    updatedAt: "2026-08-14T12:10:00.000Z"
  };
}

function decision(jobId, value) {
  return {
    id: `decision-${jobId}`,
    jobId,
    decision: value,
    decidedAt: "2026-08-14T12:02:00.000Z"
  };
}

test("personal market strategy separates observed demand, submissions, and outcomes", () => {
  const strategy = calculatePersonalMarketStrategy({
    snapshots: [
      snapshot({
        id: "snapshot-1",
        jobId: "job-1",
        company: "Alpha",
        sponsorship: "restricted",
        skills: [
          { name: "SQL", requirement: "mandatory", verified: true },
          { name: "Power BI", requirement: "mandatory", missing: true }
        ]
      }),
      snapshot({
        id: "snapshot-2",
        jobId: "job-2",
        company: "Beta",
        match: 86,
        coverage: 82,
        sponsorship: "available",
        skills: [
          { name: "SQL", requirement: "mandatory", verified: true },
          { name: "Power BI", requirement: "mandatory", missing: true }
        ]
      }),
      snapshot({
        id: "snapshot-3",
        jobId: "job-3",
        role: "Business Intelligence Analyst",
        company: "Gamma",
        match: 72,
        coverage: 70,
        sponsorship: "not-explicitly-stated",
        skills: [
          { name: "SQL", requirement: "mandatory", verified: true }
        ]
      })
    ],
    decisions: [
      decision("job-1", "apply"),
      decision("job-2", "apply"),
      decision("job-3", "save")
    ],
    applications: [
      application("job-1", "Rejected"),
      application("job-2", "Interview")
    ]
  });

  assert.equal(strategy.funnel.observedJobs, 3);
  assert.equal(strategy.funnel.proceedDecisions, 2);
  assert.equal(strategy.funnel.submittedApplications, 2);
  assert.equal(strategy.funnel.interviewStage, 1);
  assert.equal(strategy.funnel.rejections, 1);
  assert.equal(strategy.funnel.proceedToApplicationRate, 100);
  assert.equal(strategy.funnel.applicationToInterviewRate, 50);

  assert.equal(strategy.sponsorshipFriction.totalObserved, 3);
  assert.equal(strategy.sponsorshipFriction.restrictive, 1);
  assert.equal(strategy.sponsorshipFriction.explicitAvailable, 1);
  assert.equal(strategy.sponsorshipFriction.unstated, 1);
  assert.equal(strategy.sponsorshipFriction.restrictiveRate, 33.3);

  const powerBi =
    strategy.skillPriorities.find((item) => item.skill === "Power BI");
  assert.equal(powerBi.classification, "evidence-gap");
  assert.equal(powerBi.missingMandatory, 2);
  assert.match(powerBi.action, /Verify existing Power BI evidence|build truthful evidence/u);

  assert.equal(strategy.readiness.marketSample, "collecting");
  assert.equal(strategy.readiness.outcomeSample, "collecting");
  assert.match(strategy.definitions.causality, /observational associations only/iu);
});

test("personal market strategy uses the latest snapshot per job and keeps scores bounded", () => {
  const strategy = calculatePersonalMarketStrategy({
    snapshots: [
      snapshot({
        id: "older",
        jobId: "job-1",
        role: "Old Role",
        capturedAt: "2026-08-13T12:00:00.000Z",
        match: 10,
        coverage: 10
      }),
      snapshot({
        id: "newer",
        jobId: "job-1",
        role: "Data Analyst",
        capturedAt: "2026-08-14T12:00:00.000Z",
        match: 95,
        coverage: 100
      })
    ],
    decisions: [],
    applications: []
  });

  assert.equal(strategy.funnel.observedJobs, 1);
  assert.equal(strategy.roleOpportunities.length, 1);
  assert.equal(strategy.roleOpportunities[0].roleFamily, "Data Analyst");
  assert.ok(strategy.roleOpportunities[0].opportunityScore >= 0);
  assert.ok(strategy.roleOpportunities[0].opportunityScore <= 100);
  assert.equal(strategy.roleOpportunities[0].averageResumeCoverage, 100);
});

test("unstated sponsorship never becomes explicit availability", () => {
  const strategy = calculatePersonalMarketStrategy({
    snapshots: [
      snapshot({
        id: "snapshot-1",
        jobId: "job-1",
        sponsorship: "not-explicitly-stated"
      }),
      snapshot({
        id: "snapshot-2",
        jobId: "job-2",
        sponsorship: null
      })
    ],
    decisions: [],
    applications: []
  });

  assert.equal(strategy.sponsorshipFriction.explicitAvailable, 0);
  assert.equal(strategy.sponsorshipFriction.unstated, 2);
  assert.equal(strategy.sponsorshipFriction.explicitlyAvailableRate, 0);
});
