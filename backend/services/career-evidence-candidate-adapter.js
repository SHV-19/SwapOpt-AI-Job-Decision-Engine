import {
  CLAIM_SENSITIVITY_LEVELS
} from "./career-evidence-constants.js";

import {
  cleanString,
  sourceRef,
  stringList
} from "./career-evidence-utils.js";

export function addStoredCareerEvidenceClaims(
  graph,
  records
) {
  for (
    const record of
    Array.isArray(records)
      ? records
      : []
  ) {
    if (
      !record ||
      record.archivedAt
    ) {
      continue;
    }

    graph.addClaimNode({
      id:
        `claim:${record.key}`,

      category:
        record.category,

      key:
        record.key,

      label:
        record.label,

      value:
        cloneGraphValue(
          record.value
        ),

      unit:
        record.unit ??
        null,

      evidenceClass:
        record.evidenceClass ===
          "verified-source"
          ? "verified-source"
          : "user-confirmed",

      decisionEligible:
        record.decisionEligible ===
        true,

      sensitivity:
        CLAIM_SENSITIVITY_LEVELS.includes(
          record.sensitivity
        )
          ? record.sensitivity
          : "standard",

      sourceRefs: [
        sourceRef({
          sourceType:
            "career-evidence-claim",

          repositoryKey:
            "careerEvidenceClaims",

          recordId:
            record.id,

          label:
            record.sourceLabel ??
            "Career Evidence claim",

          sourceUrl:
            record.sourceUrl ??
            null,

          capturedAt:
            record.updatedAt ??
            record.createdAt ??
            null
        })
      ]
    });
  }
}

export function addCareerSkillEvidence(
  graph,
  records,
  {
    includeUnverified =
      false
  } = {}
) {
  for (
    const record of
    Array.isArray(records)
      ? records
      : []
  ) {
    if (
      !record ||
      record.archivedAt
    ) {
      continue;
    }

    if (
      !includeUnverified &&
      record.verified !==
        true
    ) {
      continue;
    }

    const name =
      cleanString(
        record.name,
        300,
        true
      );

    if (
      !name
    ) {
      continue;
    }

    const verified =
      record.verified ===
      true;

    const id =
      `skill:${canonicalSkillKey(name)}`;

    const ref =
      sourceRef({
        sourceType:
          "repository",

        repositoryKey:
          "skills",

        recordId:
          record.id,

        label:
          verified
            ? "Verified career skill"
            : "Unverified career skill",

        capturedAt:
          record.updatedAt ??
          record.createdAt ??
          null
      });

    graph.addNode({
      id,

      type:
        "skill",

      label:
        name,

      evidenceClass:
        verified
          ? "verified-source"
          : "observed",

      decisionEligible:
        verified,

      sourceRefs: [
        ref
      ],

      metadata: {
        category:
          cleanString(
            record.category,
            120,
            true
          ),

        confidence:
          finiteNumber(
            record.confidence
          ),

        jobDemandFrequency:
          finiteNumber(
            record.jobDemandFrequency
          ),

        evidenceCount:
          Array.isArray(
            record.evidence
          )
            ? record.evidence.length
            : 0
      }
    });

    graph.addEdge({
      from:
        "candidate:self",

      to:
        id,

      type:
        "has-skill",

      evidenceClass:
        verified
          ? "verified-source"
          : "observed",

      decisionEligible:
        verified,

      sourceRefs: [
        ref
      ]
    });
  }
}

export function addCareerProjectEvidence(
  graph,
  records,
  {
    includeUnverified =
      false
  } = {}
) {
  for (
    const record of
    Array.isArray(records)
      ? records
      : []
  ) {
    if (
      !record ||
      record.archivedAt
    ) {
      continue;
    }

    if (
      !includeUnverified &&
      record.verified !==
        true
    ) {
      continue;
    }

    const name =
      cleanString(
        record.name,
        300,
        true
      );

    if (
      !name
    ) {
      continue;
    }

    const verified =
      record.verified ===
      true;

    const id =
      `project:${record.id}`;

    const ref =
      sourceRef({
        sourceType:
          "repository",

        repositoryKey:
          "projectLibrary",

        recordId:
          record.id,

        label:
          verified
            ? "Verified project library item"
            : "Unverified project library item",

        capturedAt:
          record.updatedAt ??
          record.createdAt ??
          null
      });

    graph.addNode({
      id,

      type:
        "project",

      label:
        name,

      evidenceClass:
        verified
          ? "verified-source"
          : "observed",

      decisionEligible:
        verified,

      sourceRefs: [
        ref
      ],

      metadata: {
        projectType:
          cleanString(
            record.projectType,
            120,
            true
          ),

        industries:
          stringList(
            record.industries,
            20,
            160
          ),

        targetRoles:
          stringList(
            record.targetRoles,
            20,
            160
          )
      }
    });

    graph.addEdge({
      from:
        "candidate:self",

      to:
        id,

      type:
        "has-project",

      evidenceClass:
        verified
          ? "verified-source"
          : "observed",

      decisionEligible:
        verified,

      sourceRefs: [
        ref
      ]
    });

    addProjectSkillEdges(
      graph,
      record,
      id,
      verified
    );
  }
}

export function addCareerResumeEvidence(
  graph,
  baseResumes,
  applicationResumeVersions
) {
  addBaseResumeEvidence(
    graph,
    baseResumes
  );

  addApplicationResumeVersionEvidence(
    graph,
    applicationResumeVersions
  );
}

function addProjectSkillEdges(
  graph,
  record,
  projectId,
  verified
) {
  for (
    const skill of
    stringList(
      record.skills,
      50,
      200
    )
  ) {
    const skillId =
      `skill:${canonicalSkillKey(skill)}`;

    const ref =
      sourceRef({
        sourceType:
          "repository",

        repositoryKey:
          "projectLibrary",

        recordId:
          record.id,

        label:
          "Project skill evidence"
      });

    graph.addNode({
      id:
        skillId,

      type:
        "skill",

      label:
        skill,

      evidenceClass:
        verified
          ? "verified-source"
          : "observed",

      decisionEligible:
        verified,

      sourceRefs: [
        ref
      ],

      metadata:
        {}
    });

    graph.addEdge({
      from:
        projectId,

      to:
        skillId,

      type:
        "project-uses-skill",

      evidenceClass:
        verified
          ? "verified-source"
          : "observed",

      decisionEligible:
        verified,

      sourceRefs: [
        ref
      ]
    });
  }
}

function addBaseResumeEvidence(
  graph,
  records
) {
  for (
    const record of
    Array.isArray(records)
      ? records
      : []
  ) {
    if (
      !record ||
      record.archivedAt
    ) {
      continue;
    }

    const id =
      `resume:${record.id}`;

    const ref =
      sourceRef({
        sourceType:
          "repository",

        repositoryKey:
          "baseResumes",

        recordId:
          record.id,

        label:
          "Base resume",

        capturedAt:
          record.updatedAt ??
          record.createdAt ??
          record.importedAt ??
          null
      });

    graph.addNode({
      id,

      type:
        "resume",

      label:
        cleanString(
          record.name ??
            record.label,
          300,
          true
        ) ??
        "Base resume",

      evidenceClass:
        "verified-source",

      decisionEligible:
        true,

      sourceRefs: [
        ref
      ],

      metadata: {
        isDefault:
          record.isDefault ===
          true,

        targetRoles:
          stringList(
            record.targetRoles,
            20,
            160
          )
      }
    });

    graph.addEdge({
      from:
        "candidate:self",

      to:
        id,

      type:
        "has-resume",

      evidenceClass:
        "verified-source",

      decisionEligible:
        true,

      sourceRefs: [
        ref
      ]
    });
  }
}

function addApplicationResumeVersionEvidence(
  graph,
  records
) {
  for (
    const record of
    Array.isArray(records)
      ? records
      : []
  ) {
    if (
      !record
    ) {
      continue;
    }

    const id =
      `application-resume-version:${record.id}`;

    graph.addNode({
      id,

      type:
        "resume-version",

      label:
        cleanString(
          record.name ??
            record.label,
          300,
          true
        ) ??
        `Application resume version ${record.versionNumber ?? ""}`
          .trim(),

      evidenceClass:
        "verified-source",

      decisionEligible:
        true,

      sourceRefs: [
        sourceRef({
          sourceType:
            "repository",

          repositoryKey:
            "applicationResumeVersions",

          recordId:
            record.id,

          label:
            "Application resume version",

          capturedAt:
            record.updatedAt ??
            record.createdAt ??
            null
        })
      ],

      metadata: {
        applicationResumeDocumentId:
          cleanString(
            record.applicationResumeDocumentId,
            160,
            true
          ),

        jobId:
          cleanString(
            record.jobId,
            160,
            true
          ),

        versionNumber:
          finiteNumber(
            record.versionNumber
          )
      }
    });
  }
}

function cloneGraphValue(
  value
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return value;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value
      .slice(
        0,
        50
      )
      .map(
        cloneGraphValue
      );
  }

  return null;
}

function canonicalSkillKey(
  value
) {
  return String(
    value ??
    ""
  )
    .normalize(
      "NFKC"
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/gu,
      "-"
    )
    .replace(
      /^-+|-+$/gu,
      ""
    ) ||
    "unknown";
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
