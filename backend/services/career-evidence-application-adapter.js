import {
  SUBMITTED_APPLICATION_STATUSES
} from "./career-evidence-constants.js";

import {
  cleanString,
  sourceRef
} from "./career-evidence-utils.js";

export function addCareerApplicationEvidence(
  graph,
  {
    applications,
    jobs,
    includeObservedJobs =
      false,
    includedJobIds =
      new Set()
  }
) {
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

  for (
    const application of
    Array.isArray(
      applications
    )
      ? applications
      : []
  ) {
    if (
      !application?.id ||
      !application.jobId
    ) {
      continue;
    }

    addApplicationRecord(
      graph,
      application,
      {
        jobById,
        includeObservedJobs,
        includedJobIds
      }
    );
  }
}

export function isSubmittedApplication(
  application
) {
  if (
    !application
  ) {
    return false;
  }

  const dateApplied =
    application.dateApplied ??
    application.appliedAt ??
    application.submittedAt ??
    null;

  if (
    dateApplied !==
      null &&
    String(
      dateApplied
    ).trim() !==
      ""
  ) {
    return true;
  }

  return SUBMITTED_APPLICATION_STATUSES.includes(
    normaliseApplicationStatus(
      application
    )
  );
}

function addApplicationRecord(
  graph,
  application,
  {
    jobById,
    includeObservedJobs,
    includedJobIds
  }
) {
  const applicationNode =
    `application:${application.id}`;

  const status =
    normaliseApplicationStatus(
      application
    );

  const submitted =
    isSubmittedApplication(
      application
    );

  const ref =
    sourceRef({
      sourceType:
        "repository",

      repositoryKey:
        "applications",

      recordId:
        application.id,

      label:
        "Application tracker record",

      capturedAt:
        application.updatedAt ??
        application.createdAt ??
        application.dateApplied ??
        null
    });

  graph.addNode({
    id:
      applicationNode,

    type:
      "application",

    label:
      `Application — ${status || "unknown"}`,

    evidenceClass:
      "verified-source",

    decisionEligible:
      true,

    sourceRefs: [
      ref
    ],

    metadata: {
      jobId:
        application.jobId,

      status,

      submitted,

      dateApplied:
        cleanString(
          application.dateApplied,
          80,
          true
        ),

      recommendation:
        cleanString(
          application.recommendation,
          160,
          true
        )
    }
  });

  graph.addEdge({
    from:
      "candidate:self",

    to:
      applicationNode,

    type:
      "has-application",

    evidenceClass:
      "verified-source",

    decisionEligible:
      true,

    sourceRefs: [
      ref
    ]
  });

  const jobNode =
    ensureApplicationJobNode(
      graph,
      application,
      {
        jobById,
        includeObservedJobs,
        includedJobIds
      }
    );

  if (
    jobNode
  ) {
    graph.addEdge({
      from:
        applicationNode,

      to:
        jobNode,

      type:
        "application-for-job",

      evidenceClass:
        "verified-source",

      decisionEligible:
        true,

      sourceRefs: [
        ref
      ]
    });
  }

  linkApplicationResume(
    graph,
    application,
    applicationNode
  );
}

function ensureApplicationJobNode(
  graph,
  application,
  {
    jobById,
    includeObservedJobs,
    includedJobIds
  }
) {
  const jobNode =
    `job:${application.jobId}`;

  if (
    graph.hasNode(
      jobNode
    )
  ) {
    return jobNode;
  }

  if (
    !includeObservedJobs
  ) {
    return null;
  }

  const rawJob =
    jobById.get(
      application.jobId
    );

  if (
    !rawJob
  ) {
    return null;
  }

  addTrackedJob(
    graph,
    rawJob
  );

  includedJobIds.add(
    application.jobId
  );

  return jobNode;
}

function addTrackedJob(
  graph,
  rawJob
) {
  const id =
    `job:${rawJob.id}`;

  graph.addNode({
    id,

    type:
      "job",

    label:
      [
        cleanString(
          rawJob.title,
          300,
          true
        ),

        cleanString(
          rawJob.company,
          300,
          true
        )
      ]
        .filter(
          Boolean
        )
        .join(
          " — "
        ) ||
      "Tracked job",

    evidenceClass:
      "observed",

    decisionEligible:
      false,

    sourceRefs: [
      sourceRef({
        sourceType:
          "repository",

        repositoryKey:
          "jobs",

        recordId:
          rawJob.id,

        label:
          "Tracked job",

        sourceUrl:
          rawJob.url ??
          null,

        capturedAt:
          rawJob.updatedAt ??
          rawJob.createdAt ??
          rawJob.analysedAt ??
          null
      })
    ],

    metadata: {
      title:
        cleanString(
          rawJob.title,
          300,
          true
        ),

      company:
        cleanString(
          rawJob.company,
          300,
          true
        ),

      location:
        cleanString(
          rawJob.location,
          300,
          true
        )
    }
  });
}

function linkApplicationResume(
  graph,
  application,
  applicationNode
) {
  const resumeVersionId =
    cleanString(
      application.resumeVersionId,
      160,
      true
    );

  if (
    !resumeVersionId
  ) {
    return;
  }

  const resumeNode =
    [
      `application-resume-version:${resumeVersionId}`,
      `resume:${resumeVersionId}`
    ].find(
      (id) =>
        graph.hasNode(
          id
        )
    );

  if (
    !resumeNode
  ) {
    return;
  }

  graph.addEdge({
    from:
      applicationNode,

    to:
      resumeNode,

    type:
      "application-used-resume",

    evidenceClass:
      "verified-source",

    decisionEligible:
      true,

    sourceRefs: [
      sourceRef({
        sourceType:
          "repository",

        repositoryKey:
          "applications",

        recordId:
          application.id,

        label:
          "Application resume linkage"
      })
    ]
  });
}

function normaliseApplicationStatus(
  application
) {
  return String(
    application?.status ??
    application?.currentStatus ??
    application?.applicationStatus ??
    application?.stage ??
    ""
  )
    .trim()
    .toLowerCase();
}
