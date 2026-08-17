import {
  addCareerApplicationEvidence
} from "./career-evidence-application-adapter.js";

import {
  cleanString,
  companyNodeId,
  latestByKey,
  normaliseEntityKey,
  sourceRef
} from "./career-evidence-utils.js";

export function addCareerObservedMarketEvidence(
  graph,
  {
    snapshots,
    jobs,
    applications,
    decisions,
    observedJobLimit
  }
) {
  const latestSnapshots =
    latestByKey(
      Array.isArray(snapshots)
        ? snapshots
        : [],
      (record) =>
        record.sourceFingerprint ??
        record.jobId ??
        record.id,
      (record) =>
        record.capturedAt ??
        record.updatedAt ??
        record.createdAt
    )
      .sort(
        (
          left,
          right
        ) =>
          timestampValue(
            right.capturedAt ??
            right.updatedAt ??
            right.createdAt
          ) -
          timestampValue(
            left.capturedAt ??
            left.updatedAt ??
            left.createdAt
          )
      )
      .slice(
        0,
        observedJobLimit
      );

  const jobById =
    new Map(
      (
        Array.isArray(
          jobs
        )
          ? jobs
          : []
      )
        .filter(
          (record) =>
            record?.id
        )
        .map(
          (record) => [
            record.id,
            record
          ]
        )
    );

  const includedJobIds =
    new Set();

  for (
    const snapshot of
    latestSnapshots
  ) {
    const jobId =
      snapshot.jobId ??
      snapshot.id;

    if (
      !jobId
    ) {
      continue;
    }

    includedJobIds.add(
      jobId
    );

    addObservedJob(
      graph,
      snapshot,
      jobById.get(
        jobId
      )
    );
  }

  addCareerApplicationEvidence(
    graph,
    {
      applications,
      jobs,
      includeObservedJobs:
        true,
      includedJobIds
    }
  );

  addDecisionEvidence(
    graph,
    decisions,
    includedJobIds
  );
}

function addObservedJob(
  graph,
  snapshot,
  rawJob
) {
  const jobId =
    snapshot.jobId ??
    rawJob?.id ??
    snapshot.id;

  if (
    !jobId
  ) {
    return;
  }

  const company =
    cleanString(
      snapshot.company
        ?.canonicalName ??
      rawJob?.company,
      300,
      true
    );

  const title =
    cleanString(
      snapshot.role
        ?.originalTitle ??
      snapshot.role
        ?.canonicalName ??
      rawJob?.title,
      300,
      true
    );

  const jobNode =
    `job:${jobId}`;

  const ref =
    sourceRef({
      sourceType:
        "repository",

      repositoryKey:
        "marketJobSnapshots",

      recordId:
        snapshot.id,

      label:
        "Observed market job snapshot",

      sourceUrl:
        snapshot.sourceUrl ??
        rawJob?.url ??
        null,

      capturedAt:
        snapshot.capturedAt ??
        snapshot.updatedAt ??
        snapshot.createdAt ??
        null
    });

  graph.addNode({
    id:
      jobNode,

    type:
      "job",

    label:
      [
        title,
        company
      ]
        .filter(
          Boolean
        )
        .join(
          " — "
        ) ||
      "Observed job",

    evidenceClass:
      "observed",

    decisionEligible:
      false,

    sourceRefs: [
      ref
    ],

    metadata: {
      jobId,

      title,

      company,

      roleFamily:
        cleanString(
          snapshot.role
            ?.canonicalName,
          200,
          true
        ),

      region:
        cleanString(
          snapshot.region,
          300,
          true
        ),

      workModel:
        cleanString(
          snapshot.workModel,
          100,
          true
        ),

      sourcePlatform:
        cleanString(
          snapshot.sourcePlatform,
          120,
          true
        ),

      matchScore:
        finiteNumber(
          snapshot.matchScore
        )
    }
  });

  addObservedCompany(
    graph,
    company,
    snapshot,
    jobNode
  );

  addObservedJobSkills(
    graph,
    snapshot,
    jobNode
  );
}

function addObservedCompany(
  graph,
  company,
  snapshot,
  jobNode
) {
  if (
    !company
  ) {
    return;
  }

  const companyId =
    companyNodeId(
      company
    );

  const ref =
    sourceRef({
      sourceType:
        "repository",

      repositoryKey:
        "marketJobSnapshots",

      recordId:
        snapshot.id,

      label:
        "Observed company"
    });

  graph.addNode({
    id:
      companyId,

    type:
      "company",

    label:
      company,

    evidenceClass:
      "observed",

    decisionEligible:
      false,

    sourceRefs: [
      ref
    ],

    metadata:
      {}
  });

  graph.addEdge({
    from:
      jobNode,

    to:
      companyId,

    type:
      "job-at-company",

    evidenceClass:
      "observed",

    decisionEligible:
      false,

    sourceRefs: [
      ref
    ]
  });
}

function addObservedJobSkills(
  graph,
  snapshot,
  jobNode
) {
  const skills =
    Array.isArray(
      snapshot.skills
    )
      ? snapshot.skills
      : [];

  for (
    const skill of
    skills
  ) {
    const skillName =
      cleanString(
        skill?.name,
        200,
        true
      );

    if (
      !skillName
    ) {
      continue;
    }

    const skillId =
      `market-skill:${normaliseEntityKey(skillName)}`;

    const ref =
      sourceRef({
        sourceType:
          "repository",

        repositoryKey:
          "marketJobSnapshots",

        recordId:
          snapshot.id,

        label:
          "Observed job skill requirement"
      });

    graph.addNode({
      id:
        skillId,

      type:
        "market-skill",

      label:
        skillName,

      evidenceClass:
        "observed",

      decisionEligible:
        false,

      sourceRefs: [
        ref
      ],

      metadata: {
        requirement:
          cleanString(
            skill.requirement,
            120,
            true
          ),

        verified:
          skill.verified ===
          true
      }
    });

    graph.addEdge({
      from:
        jobNode,

      to:
        skillId,

      type:
        "job-requires-skill",

      evidenceClass:
        "observed",

      decisionEligible:
        false,

      sourceRefs: [
        ref
      ]
    });
  }
}

function addDecisionEvidence(
  graph,
  decisions,
  includedJobIds
) {
  const latestDecisions =
    latestByKey(
      Array.isArray(
        decisions
      )
        ? decisions
        : [],
      (record) =>
        record.jobId,
      (record) =>
        record.decidedAt ??
        record.updatedAt ??
        record.createdAt
    );

  for (
    const decision of
    latestDecisions
  ) {
    if (
      !decision?.jobId ||
      !includedJobIds.has(
        decision.jobId
      )
    ) {
      continue;
    }

    const jobNode =
      `job:${decision.jobId}`;

    if (
      !graph.hasNode(
        jobNode
      )
    ) {
      continue;
    }

    const decisionNode =
      `decision:${decision.id}`;

    const ref =
      sourceRef({
        sourceType:
          "repository",

        repositoryKey:
          "jobDecisions",

        recordId:
          decision.id,

        label:
          "SwapOpt job decision",

        capturedAt:
          decision.decidedAt ??
          decision.updatedAt ??
          decision.createdAt ??
          null
      });

    graph.addNode({
      id:
        decisionNode,

      type:
        "decision",

      label:
        cleanString(
          decision.decision,
          120,
          true
        ) ??
        "Job decision",

      evidenceClass:
        "derived",

      decisionEligible:
        false,

      sourceRefs: [
        ref
      ],

      metadata: {
        decision:
          cleanString(
            decision.decision,
            120,
            true
          ),

        primaryReason:
          cleanString(
            decision.primaryReason,
            500,
            true
          )
      }
    });

    graph.addEdge({
      from:
        decisionNode,

      to:
        jobNode,

      type:
        "decision-for-job",

      evidenceClass:
        "derived",

      decisionEligible:
        false,

      sourceRefs: [
        ref
      ]
    });
  }
}

function finiteNumber(
  value
) {
  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function timestampValue(
  value
) {
  const result =
    new Date(
      value ??
      0
    ).getTime();

  return Number.isFinite(
    result
  )
    ? result
    : 0;
}
