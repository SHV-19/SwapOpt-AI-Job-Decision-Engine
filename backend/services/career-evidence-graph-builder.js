import {
  CAREER_EVIDENCE_CALCULATION_VERSION,
  CAREER_EVIDENCE_GRAPH_SCHEMA_VERSION
} from "./career-evidence-constants.js";

import {
  deepFreeze,
  mergeMetadata,
  mergeSourceRefs,
  normaliseEvidenceClass,
  strongerEvidence
} from "./career-evidence-utils.js";

export function createCareerEvidenceGraphBuilder(
  generatedAt
) {
  const nodes =
    new Map();

  const edges =
    new Map();

  function addNode(
    node
  ) {
    validateGraphNode(
      node
    );

    const current =
      nodes.get(
        node.id
      );

    if (
      !current
    ) {
      nodes.set(
        node.id,
        freezeGraphNode(
          node
        )
      );

      return;
    }

    nodes.set(
      node.id,
      freezeGraphNode({
        ...current,

        label:
          current.label ||
          node.label,

        evidenceClass:
          strongerEvidence(
            current.evidenceClass,
            node.evidenceClass
          ),

        decisionEligible:
          current.decisionEligible ===
            true ||
          node.decisionEligible ===
            true,

        sourceRefs:
          mergeSourceRefs(
            current.sourceRefs,
            node.sourceRefs
          ),

        metadata:
          mergeMetadata(
            current.metadata,
            node.metadata
          )
      })
    );
  }

  function addClaimNode({
    id,
    category,
    key,
    label,
    value,
    unit,
    evidenceClass,
    decisionEligible,
    sensitivity,
    sourceRefs
  }) {
    addNode({
      id,
      type:
        "claim",
      label,
      evidenceClass,
      decisionEligible,
      sourceRefs,
      metadata: {
        category,
        key,
        value,
        unit:
          unit ??
          null,
        sensitivity
      }
    });

    addEdge({
      from:
        "candidate:self",
      to:
        id,
      type:
        "has-claim",
      evidenceClass,
      decisionEligible,
      sourceRefs
    });
  }

  function addEdge(
    edge
  ) {
    if (
      !edge ||
      !edge.from ||
      !edge.to ||
      !edge.type
    ) {
      throw new TypeError(
        "Career Evidence Graph edge is invalid."
      );
    }

    const id =
      edge.id ??
      [
        "edge",
        edge.from,
        edge.type,
        edge.to
      ].join(
        ":"
      );

    const next =
      Object.freeze({
        id:
          String(
            id
          ),

        from:
          String(
            edge.from
          ),

        to:
          String(
            edge.to
          ),

        type:
          String(
            edge.type
          ),

        evidenceClass:
          normaliseEvidenceClass(
            edge.evidenceClass
          ),

        decisionEligible:
          edge.decisionEligible ===
          true,

        sourceRefs:
          Object.freeze(
            mergeSourceRefs(
              [],
              edge.sourceRefs
            )
          )
      });

    const current =
      edges.get(
        id
      );

    if (
      !current
    ) {
      edges.set(
        id,
        next
      );

      return;
    }

    edges.set(
      id,
      Object.freeze({
        ...current,

        evidenceClass:
          strongerEvidence(
            current.evidenceClass,
            next.evidenceClass
          ),

        decisionEligible:
          current.decisionEligible ===
            true ||
          next.decisionEligible ===
            true,

        sourceRefs:
          Object.freeze(
            mergeSourceRefs(
              current.sourceRefs,
              next.sourceRefs
            )
          )
      })
    );
  }

  function hasNode(
    id
  ) {
    return nodes.has(
      id
    );
  }

  function build(
    metadata = {}
  ) {
    const nodeList =
      [
        ...nodes.values()
      ].sort(
        compareGraphNode
      );

    const edgeList =
      [
        ...edges.values()
      ].sort(
        compareGraphEdge
      );

    const applicationNodes =
      nodeList.filter(
        (node) =>
          node.type ===
          "application"
      );

    return deepFreeze({
      schemaVersion:
        CAREER_EVIDENCE_GRAPH_SCHEMA_VERSION,

      calculationVersion:
        CAREER_EVIDENCE_CALCULATION_VERSION,

      generatedAt,

      mode:
        "career-evidence-graph",

      candidateNodeId:
        "candidate:self",

      summary:
        createSummary({
          nodeList,
          edgeList,
          applicationNodes,
          metadata
        }),

      nodes:
        nodeList,

      edges:
        edgeList,

      limitations: [
        "Protected demographic self-identification values are intentionally excluded from the graph.",
        "Observed job-market nodes describe opportunities and requirements, not candidate qualifications.",
        "Only user-confirmed or verified-source candidate evidence is decision-eligible.",
        "The graph preserves provenance so future outcome learning can explain which evidence supported a recommendation."
      ]
    });
  }

  return Object.freeze({
    addNode,
    addClaimNode,
    addEdge,
    hasNode,
    build
  });
}

function createSummary({
  nodeList,
  edgeList,
  applicationNodes,
  metadata
}) {
  return Object.freeze({
    nodes:
      nodeList.length,

    edges:
      edgeList.length,

    claims:
      countNodes(
        nodeList,
        "claim"
      ),

    verifiedCandidateSkills:
      nodeList.filter(
        (node) =>
          node.type ===
            "skill" &&
          node.decisionEligible ===
            true
      ).length,

    verifiedProjects:
      nodeList.filter(
        (node) =>
          node.type ===
            "project" &&
          node.decisionEligible ===
            true
      ).length,

    employmentRecords:
      countNodes(
        nodeList,
        "employment"
      ),

    educationRecords:
      countNodes(
        nodeList,
        "education"
      ),

    observedJobs:
      countNodes(
        nodeList,
        "job"
      ),

    trackedApplications:
      applicationNodes.length,

    submittedApplications:
      applicationNodes.filter(
        (node) =>
          node.metadata
            ?.submitted ===
          true
      ).length,

    decisionEligibleNodes:
      nodeList.filter(
        (node) =>
          node.decisionEligible ===
          true
      ).length,

    userConfirmedNodes:
      nodeList.filter(
        (node) =>
          node.evidenceClass ===
          "user-confirmed"
      ).length,

    verifiedSourceNodes:
      nodeList.filter(
        (node) =>
          node.evidenceClass ===
          "verified-source"
      ).length,

    protectedProfileValuesExcluded:
      Number(
        metadata
          .excludedProtectedProfileFieldCount ??
        0
      ),

    profileLoaded:
      metadata.profileLoaded ===
      true,

    includeObserved:
      metadata.includeObserved ===
      true,

    observedJobLimit:
      Number(
        metadata.observedJobLimit ??
        0
      )
  });
}

function countNodes(
  nodes,
  type
) {
  return nodes.filter(
    (node) =>
      node.type ===
      type
  ).length;
}

function validateGraphNode(
  node
) {
  if (
    !node ||
    typeof node !==
      "object" ||
    typeof node.id !==
      "string" ||
    node.id.trim() ===
      "" ||
    typeof node.type !==
      "string" ||
    node.type.trim() ===
      "" ||
    typeof node.label !==
      "string" ||
    node.label.trim() ===
      ""
  ) {
    throw new TypeError(
      "Career Evidence Graph node is invalid."
    );
  }

  normaliseEvidenceClass(
    node.evidenceClass
  );
}

function freezeGraphNode(
  node
) {
  return Object.freeze({
    id:
      String(
        node.id
      ),

    type:
      String(
        node.type
      ),

    label:
      String(
        node.label
      ),

    evidenceClass:
      normaliseEvidenceClass(
        node.evidenceClass
      ),

    decisionEligible:
      node.decisionEligible ===
      true,

    sourceRefs:
      Object.freeze(
        mergeSourceRefs(
          [],
          node.sourceRefs
        )
      ),

    metadata:
      deepFreeze(
        node.metadata &&
        typeof node.metadata ===
          "object" &&
        !Array.isArray(
          node.metadata
        )
          ? structuredClone(
              node.metadata
            )
          : {}
      )
  });
}

function compareGraphNode(
  left,
  right
) {
  const typeOrder =
    {
      candidate:
        0,

      claim:
        1,

      employment:
        2,

      education:
        3,

      skill:
        4,

      project:
        5,

      resume:
        6,

      "resume-version":
        7,

      application:
        8,

      job:
        9,

      company:
        10,

      "market-skill":
        11,

      decision:
        12
    };

  return (
    (
      typeOrder[
        left.type
      ] ??
      99
    ) -
      (
        typeOrder[
          right.type
        ] ??
        99
      ) ||
    left.label.localeCompare(
      right.label
    ) ||
    left.id.localeCompare(
      right.id
    )
  );
}

function compareGraphEdge(
  left,
  right
) {
  return (
    left.type.localeCompare(
      right.type
    ) ||
    left.from.localeCompare(
      right.from
    ) ||
    left.to.localeCompare(
      right.to
    )
  );
}
