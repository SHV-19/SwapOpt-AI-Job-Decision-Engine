import personalRepositories from "../database/personal-repositories.js";

import {
  assertRepositoryContext
} from "../database/repository.js";

import {
  CAREER_EVIDENCE_CALCULATION_VERSION,
  CAREER_EVIDENCE_GRAPH_SCHEMA_VERSION,
  CAREER_EVIDENCE_SERVICE_NAME,
  CAREER_EVIDENCE_SERVICE_SCHEMA_VERSION,
  DEFAULT_OBSERVED_JOB_LIMIT
} from "./career-evidence-constants.js";

import {
  createCareerEvidenceGraphBuilder
} from "./career-evidence-graph-builder.js";

import {
  addCareerEvidenceProfile
} from "./career-evidence-profile-adapter.js";

import {
  addStoredCareerEvidenceClaims,
  addCareerProjectEvidence,
  addCareerResumeEvidence,
  addCareerSkillEvidence
} from "./career-evidence-candidate-adapter.js";

import {
  addCareerApplicationEvidence
} from "./career-evidence-application-adapter.js";

import {
  addCareerObservedMarketEvidence
} from "./career-evidence-market-adapter.js";

import {
  createCareerEvidenceClaimStore
} from "./career-evidence-claim-store.js";

import {
  createCareerEvidenceDataSource
} from "./career-evidence-data-source.js";

import {
  normaliseCareerEvidenceGraphOptions
} from "./career-evidence-query.js";

import {
  deepFreeze,
  nowIso,
  sourceRef
} from "./career-evidence-utils.js";

const SERVICE_METHODS =
  Object.freeze([
    "getSummary",
    "getGraph",
    "getDecisionContext",
    "listClaims",
    "createClaim",
    "updateClaim",
    "archiveClaim"
  ]);

export function createCareerEvidenceService({
  repositoryRegistry =
    personalRepositories,

  profileService =
    null,

  clock =
    () =>
      new Date()
} = {}) {
  const dataSource =
    createCareerEvidenceDataSource({
      repositoryRegistry,
      profileService
    });

  const claimStore =
    createCareerEvidenceClaimStore({
      repository:
        dataSource.repositories.claims,
      clock
    });

  async function getSummary(
    context
  ) {
    const graph =
      await getGraph(
        context,
        {
          includeObserved:
            true,

          observedJobLimit:
            DEFAULT_OBSERVED_JOB_LIMIT
        }
      );

    return graph.summary;
  }

  async function getGraph(
    context,
    options =
      {}
  ) {
    const ctx =
      assertRepositoryContext(
        context
      );

    const query =
      normaliseCareerEvidenceGraphOptions(
        options
      );

    const data =
      await dataSource.load(
        ctx,
        query
      );

    const graph =
      createCareerEvidenceGraphBuilder(
        nowIso(
          clock
        )
      );

    addCandidateRoot(
      graph
    );

    addCareerEvidenceProfile(
      graph,
      data.profile
    );

    addStoredCareerEvidenceClaims(
      graph,
      data.claims.filter(
        (record) =>
          query.includeArchivedClaims ||
          !record.archivedAt
      )
    );

    addCareerSkillEvidence(
      graph,
      data.skills,
      {
        includeUnverified:
          query.includeUnverified
      }
    );

    addCareerProjectEvidence(
      graph,
      data.projects,
      {
        includeUnverified:
          query.includeUnverified
      }
    );

    addCareerResumeEvidence(
      graph,
      data.baseResumes,
      data.applicationResumeVersions
    );

    addWorkflowEvidence(
      graph,
      data,
      query
    );

    return graph.build({
      excludedProtectedProfileFieldCount:
        data.profile
          .excludedProtectedProfileFieldCount,

      profileLoaded:
        data.profile.loaded,

      observedJobLimit:
        query.observedJobLimit,

      includeObserved:
        query.includeObserved
    });
  }

  async function getDecisionContext(
    context
  ) {
    const graph =
      await getGraph(
        context,
        {
          includeObserved:
            false,

          includeUnverified:
            false,

          includeArchivedClaims:
            false
        }
      );

    const nodes =
      graph.nodes.filter(
        (node) =>
          node.decisionEligible ===
          true
      );

    const nodeIds =
      new Set(
        nodes.map(
          (node) =>
            node.id
        )
      );

    const edges =
      graph.edges.filter(
        (edge) =>
          edge.decisionEligible ===
            true &&
          nodeIds.has(
            edge.from
          ) &&
          nodeIds.has(
            edge.to
          )
      );

    return deepFreeze({
      schemaVersion:
        CAREER_EVIDENCE_GRAPH_SCHEMA_VERSION,

      calculationVersion:
        CAREER_EVIDENCE_CALCULATION_VERSION,

      generatedAt:
        graph.generatedAt,

      mode:
        "decision-eligible-only",

      candidateNodeId:
        "candidate:self",

      nodes,

      edges,

      summary: {
        nodes:
          nodes.length,

        edges:
          edges.length,

        userConfirmedNodes:
          nodes.filter(
            (node) =>
              node.evidenceClass ===
              "user-confirmed"
          ).length,

        verifiedSourceNodes:
          nodes.filter(
            (node) =>
              node.evidenceClass ===
              "verified-source"
          ).length
      },

      limitations: [
        "Protected demographic self-identification fields are intentionally excluded from the Career Evidence Graph.",
        "Observed job-market evidence is excluded from this decision context because it is not candidate evidence.",
        "Unverified skills and projects are excluded until they are verified."
      ]
    });
  }

  return assertCareerEvidenceService(
    Object.freeze({
      schemaVersion:
        CAREER_EVIDENCE_SERVICE_SCHEMA_VERSION,

      name:
        CAREER_EVIDENCE_SERVICE_NAME,

      getSummary,
      getGraph,
      getDecisionContext,

      listClaims:
        claimStore.listClaims,

      createClaim:
        claimStore.createClaim,

      updateClaim:
        claimStore.updateClaim,

      archiveClaim:
        claimStore.archiveClaim
    })
  );
}

export function assertCareerEvidenceService(
  service
) {
  if (
    !service ||
    typeof service !==
      "object" ||
    service.schemaVersion !==
      CAREER_EVIDENCE_SERVICE_SCHEMA_VERSION ||
    service.name !==
      CAREER_EVIDENCE_SERVICE_NAME
  ) {
    throw new TypeError(
      "A valid career evidence service is required."
    );
  }

  for (
    const method of
    SERVICE_METHODS
  ) {
    if (
      typeof service[
        method
      ] !==
      "function"
    ) {
      throw new TypeError(
        `Career evidence service must expose ${method}.`
      );
    }
  }

  return service;
}

function addWorkflowEvidence(
  graph,
  data,
  query
) {
  if (
    query.includeObserved
  ) {
    addCareerObservedMarketEvidence(
      graph,
      {
        snapshots:
          data.snapshots,

        jobs:
          data.jobs,

        applications:
          data.applications,

        decisions:
          data.decisions,

        observedJobLimit:
          query.observedJobLimit
      }
    );

    return;
  }

  addCareerApplicationEvidence(
    graph,
    {
      applications:
        data.applications,

      jobs:
        [],

      includeObservedJobs:
        false
    }
  );
}

function addCandidateRoot(
  graph
) {
  graph.addNode({
    id:
      "candidate:self",

    type:
      "candidate",

    label:
      "Candidate",

    evidenceClass:
      "user-confirmed",

    decisionEligible:
      true,

    sourceRefs: [
      sourceRef({
        sourceType:
          "system",

        label:
          "SwapOpt single-user candidate"
      })
    ],

    metadata:
      {}
  });
}
