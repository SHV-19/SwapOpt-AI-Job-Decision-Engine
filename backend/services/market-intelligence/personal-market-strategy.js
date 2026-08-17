const SUBMITTED_STATUSES =
  new Set([
    "applied",
    "interview",
    "offer",
    "rejected",
    "withdrawn"
  ]);

const INTERVIEW_STATUSES =
  new Set([
    "interview",
    "offer"
  ]);

const CLOSED_STATUSES =
  new Set([
    "offer",
    "rejected",
    "withdrawn"
  ]);

const RESTRICTIVE_SPONSORSHIP_STATUSES =
  new Set([
    "restricted",
    "citizenship-required"
  ]);

const MARKET_READINESS_THRESHOLDS =
  Object.freeze({
    emerging:
      10,

    usable:
      25,

    established:
      50
  });

const OUTCOME_READINESS_THRESHOLDS =
  Object.freeze({
    emerging:
      3,

    usable:
      8,

    established:
      20
  });

export const PERSONAL_MARKET_STRATEGY_SCHEMA_VERSION =
  1;

export const PERSONAL_MARKET_STRATEGY_CALCULATION_VERSION =
  "2026-08-14.1";

export function calculatePersonalMarketStrategy(
  dataset
) {
  const snapshots =
    latestByJob(
      Array.isArray(
        dataset?.snapshots
      )
        ? dataset.snapshots
        : [],
      (
        item
      ) =>
        item.capturedAt ??
        item.updatedAt ??
        item.createdAt
    );

  const decisions =
    latestByJob(
      Array.isArray(
        dataset?.decisions
      )
        ? dataset.decisions
        : [],
      (
        item
      ) =>
        item.decidedAt ??
        item.updatedAt ??
        item.createdAt
    );

  const applications =
    latestByJob(
      Array.isArray(
        dataset?.applications
      )
        ? dataset.applications
        : [],
      (
        item
      ) =>
        item.updatedAt ??
        item.dateApplied ??
        item.createdAt
    );

  const rows =
    [
      ...snapshots.values()
    ].map(
      (
        snapshot
      ) => ({
        snapshot,
        decision:
          decisions.get(
            snapshot.jobId
          ) ??
          null,
        application:
          applications.get(
            snapshot.jobId
          ) ??
          null
      })
    );

  const funnel =
    createFunnel(
      rows
    );

  const roleOpportunities =
    buildRoleOpportunityMap(
      rows
    );

  const skillPriorities =
    buildSkillPriorities(
      rows
    );

  const sponsorshipFriction =
    buildSponsorshipFriction(
      rows
    );

  const readiness =
    createReadiness({
      observedJobs:
        rows.length,
      submittedApplications:
        funnel.submittedApplications,
      closedOutcomes:
        funnel.closedOutcomes
    });

  const actions =
    buildThirtyDayActions({
      funnel,
      roleOpportunities,
      skillPriorities,
      sponsorshipFriction,
      readiness
    });

  return deepFreeze({
    schemaVersion:
      PERSONAL_MARKET_STRATEGY_SCHEMA_VERSION,

    calculationVersion:
      PERSONAL_MARKET_STRATEGY_CALCULATION_VERSION,

    readiness,

    funnel,

    roleOpportunities,

    skillPriorities,

    sponsorshipFriction,

    actions,

    definitions: {
      opportunityScore:
        "A deterministic prioritisation score combining observed role demand, current fit, resume coverage, proceed behaviour, and outcome evidence only when the personal sample is large enough.",

      skillPriority:
        "A deterministic evidence-priority signal based on how often a skill appears, whether it is mandatory, and whether verified candidate evidence matched or was missing.",

      sponsorshipFriction:
        "The share of observed postings containing explicit restrictive sponsorship or citizenship language. Unstated postings are not treated as sponsorship-friendly.",

      causality:
        "Application and outcome comparisons are observational associations only. They do not prove that a role, skill, workflow action, or market condition caused an interview, offer, or rejection."
    },

    limitations: [
      "All strategy signals describe only jobs observed in this user's SwapOpt history.",
      "A high opportunity score is a prioritisation aid, not a prediction of hiring success.",
      "Missing skill evidence means SwapOpt could not verify suitable candidate evidence for the observed requirement; it does not automatically mean the user lacks the skill.",
      "Sponsorship language is posting-specific evidence and must not be generalized into a permanent company policy.",
      "Small outcome samples remain advisory and are deliberately down-weighted."
    ]
  });
}

function createFunnel(
  rows
) {
  const proceedDecisions =
    rows.filter(
      (
        row
      ) =>
        row.decision
          ?.decision ===
            "apply"
    ).length;

  const submittedRows =
    rows.filter(
      (
        row
      ) =>
        isSubmittedApplication(
          row.application
        )
    );

  const interviewRows =
    submittedRows.filter(
      (
        row
      ) =>
        INTERVIEW_STATUSES.has(
          applicationStatus(
            row.application
          )
        )
    );

  const offers =
    submittedRows.filter(
      (
        row
      ) =>
        applicationStatus(
          row.application
        ) ===
          "offer"
    ).length;

  const rejections =
    submittedRows.filter(
      (
        row
      ) =>
        applicationStatus(
          row.application
        ) ===
          "rejected"
    ).length;

  const closedOutcomes =
    submittedRows.filter(
      (
        row
      ) =>
        CLOSED_STATUSES.has(
          applicationStatus(
            row.application
          )
        )
    ).length;

  return {
    observedJobs:
      rows.length,

    proceedDecisions,

    submittedApplications:
      submittedRows.length,

    interviewStage:
      interviewRows.length,

    offers,

    rejections,

    closedOutcomes,

    proceedToApplicationRate:
      percentage(
        submittedRows.length,
        proceedDecisions
      ),

    applicationToInterviewRate:
      percentage(
        interviewRows.length,
        submittedRows.length
      ),

    applicationToOfferRate:
      percentage(
        offers,
        submittedRows.length
      ),

    rejectionRateAmongClosed:
      percentage(
        rejections,
        closedOutcomes
      )
  };
}

function buildRoleOpportunityMap(
  rows
) {
  const groups =
    new Map();

  for (
    const row of
    rows
  ) {
    const name =
      normaliseText(
        row.snapshot
          ?.role
          ?.canonicalName
      ) ??
      "Unknown role";

    const key =
      normaliseKey(
        name
      );

    const current =
      groups.get(
        key
      ) ??
      {
        name,
        observations:
          0,
        companies:
          new Set(),
        matchValues:
          [],
        coverageValues:
          [],
        proceed:
          0,
        submitted:
          0,
        interviews:
          0,
        offers:
          0
      };

    current.observations +=
      1;

    const company =
      normaliseText(
        row.snapshot
          ?.company
          ?.canonicalName
      );

    if (
      company
    ) {
      current.companies.add(
        company
      );
    }

    pushFinite(
      current.matchValues,
      row.snapshot
        ?.fit
        ?.currentMatchPercent
    );

    pushFinite(
      current.coverageValues,
      row.snapshot
        ?.resumeGap
        ?.coveragePercentage
    );

    if (
      row.decision
        ?.decision ===
          "apply"
    ) {
      current.proceed +=
        1;
    }

    if (
      isSubmittedApplication(
        row.application
      )
    ) {
      current.submitted +=
        1;

      const status =
        applicationStatus(
          row.application
        );

      if (
        INTERVIEW_STATUSES.has(
          status
        )
      ) {
        current.interviews +=
          1;
      }

      if (
        status ===
          "offer"
      ) {
        current.offers +=
          1;
      }
    }

    groups.set(
      key,
      current
    );
  }

  const totalObservations =
    Math.max(
      1,
      rows.length
    );

  return [
    ...groups.values()
  ]
    .map(
      (
        item
      ) => {
        const averageMatch =
          average(
            item.matchValues
          );

        const averageResumeCoverage =
          average(
            item.coverageValues
          );

        const demandShare =
          percentage(
            item.observations,
            totalObservations
          );

        const proceedRate =
          percentage(
            item.proceed,
            item.observations
          );

        const interviewRate =
          percentage(
            item.interviews,
            item.submitted
          );

        const outcomeSignal =
          item.submitted >=
            3
            ? interviewRate
            : 50;

        const score =
          round(
            clamp(
              (
                averageMatch *
                  0.35
              ) +
                (
                  averageResumeCoverage *
                    0.25
                ) +
                (
                  Math.min(
                    100,
                    demandShare *
                      3
                  ) *
                    0.2
                ) +
                (
                  proceedRate *
                    0.1
                ) +
                (
                  outcomeSignal *
                    0.1
                ),
              0,
              100
            ),
            1
          );

        return {
          roleFamily:
            item.name,

          observations:
            item.observations,

          companies:
            item.companies.size,

          averageMatchPercent:
            round(
              averageMatch,
              1
            ),

          averageResumeCoverage:
            round(
              averageResumeCoverage,
              1
            ),

          demandSharePercent:
            demandShare,

          proceed:
            item.proceed,

          submittedApplications:
            item.submitted,

          interviews:
            item.interviews,

          offers:
            item.offers,

          interviewRateAmongApplied:
            interviewRate,

          opportunityScore:
            score,

          confidence:
            observationConfidence(
              item.observations,
              item.companies.size
            ),

          rationale:
            createRoleRationale({
              item,
              averageMatch,
              averageResumeCoverage,
              demandShare,
              interviewRate
            })
        };
      }
    )
    .sort(
      (
        left,
        right
      ) =>
        right.opportunityScore -
          left.opportunityScore ||
        right.observations -
          left.observations ||
        left.roleFamily.localeCompare(
          right.roleFamily
        )
    )
    .slice(
      0,
      20
    );
}

function buildSkillPriorities(
  rows
) {
  const skills =
    new Map();

  for (
    const row of
    rows
  ) {
    const verified =
      new Set(
        (
          row.snapshot
            ?.resumeGap
            ?.matchedVerifiedSkills ??
          []
        ).map(
          normaliseKey
        )
      );

    const missing =
      new Set(
        (
          row.snapshot
            ?.resumeGap
            ?.missingMandatorySkills ??
          []
        ).map(
          normaliseKey
        )
      );

    for (
      const skill of
      row.snapshot
        ?.skills ??
      []
    ) {
      const name =
        normaliseText(
          skill.name
        );

      if (
        !name
      ) {
        continue;
      }

      const key =
        normaliseKey(
          name
        );

      const current =
        skills.get(
          key
        ) ??
        {
          name,
          observations:
            0,
          mandatory:
            0,
          preferred:
            0,
          mentioned:
            0,
          verifiedMatches:
            0,
          missingMandatory:
            0,
          companies:
            new Set()
        };

      current.observations +=
        1;

      const requirement =
        [
          "mandatory",
          "preferred",
          "mentioned"
        ].includes(
          skill.requirement
        )
          ? skill.requirement
          : "mentioned";

      current[
        requirement
      ] +=
        1;

      if (
        verified.has(
          key
        )
      ) {
        current.verifiedMatches +=
          1;
      }

      if (
        missing.has(
          key
        )
      ) {
        current.missingMandatory +=
          1;
      }

      const company =
        normaliseText(
          row.snapshot
            ?.company
            ?.canonicalName
        );

      if (
        company
      ) {
        current.companies.add(
          company
        );
      }

      skills.set(
        key,
        current
      );
    }
  }

  return [
    ...skills.values()
  ]
    .map(
      (
        item
      ) => {
        const classification =
          item.missingMandatory >=
              2 &&
            item.mandatory >=
              2
            ? "evidence-gap"
            : item.verifiedMatches >=
                  2 &&
                item.observations >=
                  3
              ? "leverage-strength"
              : "observe";

        const priorityScore =
          Math.round(
            (
              item.mandatory *
                5
            ) +
              (
                item.preferred *
                  2
              ) +
              (
                item.missingMandatory *
                  6
              ) +
              (
                classification ===
                  "leverage-strength"
                  ? item.verifiedMatches *
                    2
                  : 0
              )
          );

        return {
          skill:
            item.name,

          classification,

          priorityScore,

          observations:
            item.observations,

          companies:
            item.companies.size,

          mandatory:
            item.mandatory,

          preferred:
            item.preferred,

          verifiedMatches:
            item.verifiedMatches,

          missingMandatory:
            item.missingMandatory,

          action:
            skillAction(
              item.name,
              classification
            )
        };
      }
    )
    .sort(
      (
        left,
        right
      ) =>
        right.priorityScore -
          left.priorityScore ||
        right.mandatory -
          left.mandatory ||
        left.skill.localeCompare(
          right.skill
        )
    )
    .slice(
      0,
      20
    );
}

function buildSponsorshipFriction(
  rows
) {
  const regions =
    new Map();

  let explicitAvailable =
    0;

  let restrictive =
    0;

  let unstated =
    0;

  for (
    const row of
    rows
  ) {
    const region =
      normaliseText(
        row.snapshot
          ?.region
      ) ??
      "Unknown";

    const current =
      regions.get(
        region
      ) ??
      {
        region,
        observations:
          0,
        explicitAvailable:
          0,
        restrictive:
          0,
        unstated:
          0
      };

    current.observations +=
      1;

    const status =
      normaliseKey(
        row.snapshot
          ?.sponsorship
          ?.status
      );

    if (
      status ===
        "available"
    ) {
      current.explicitAvailable +=
        1;
      explicitAvailable +=
        1;
    } else if (
      RESTRICTIVE_SPONSORSHIP_STATUSES.has(
        status
      )
    ) {
      current.restrictive +=
        1;
      restrictive +=
        1;
    } else {
      current.unstated +=
        1;
      unstated +=
        1;
    }

    regions.set(
      region,
      current
    );
  }

  const total =
    rows.length;

  return {
    totalObserved:
      total,

    explicitAvailable,

    restrictive,

    unstated,

    restrictiveRate:
      percentage(
        restrictive,
        total
      ),

    explicitlyAvailableRate:
      percentage(
        explicitAvailable,
        total
      ),

    regions:
      [
        ...regions.values()
      ]
        .map(
          (
            item
          ) => ({
            ...item,

            restrictiveRate:
              percentage(
                item.restrictive,
                item.observations
              ),

            explicitlyAvailableRate:
              percentage(
                item.explicitAvailable,
                item.observations
              )
          })
        )
        .sort(
          (
            left,
            right
          ) =>
            right.observations -
              left.observations ||
            right.restrictiveRate -
              left.restrictiveRate ||
            left.region.localeCompare(
              right.region
            )
        )
  };
}

function createReadiness({
  observedJobs,
  submittedApplications,
  closedOutcomes
}) {
  return {
    marketSample:
      readinessLevel(
        observedJobs,
        MARKET_READINESS_THRESHOLDS
      ),

    outcomeSample:
      readinessLevel(
        submittedApplications,
        OUTCOME_READINESS_THRESHOLDS
      ),

    observedJobs,

    submittedApplications,

    closedOutcomes,

    explanation:
      createReadinessExplanation(
        observedJobs,
        submittedApplications
      )
  };
}

function buildThirtyDayActions({
  funnel,
  roleOpportunities,
  skillPriorities,
  sponsorshipFriction,
  readiness
}) {
  const actions =
    [];

  const bestRole =
    roleOpportunities.find(
      (
        item
      ) =>
        item.observations >=
          3 &&
        item.averageMatchPercent >=
          70
    );

  if (
    bestRole
  ) {
    actions.push({
      priority:
        "High",

      action:
        `Prioritize ${bestRole.roleFamily} opportunities in the next search cycle.`,

      reason:
        `${bestRole.observations} observed postings across ${bestRole.companies} companies averaged ${bestRole.averageMatchPercent}% current fit.`,

      evidenceType:
        "observed-market-fit"
    });
  }

  const evidenceGap =
    skillPriorities.find(
      (
        item
      ) =>
        item.classification ===
          "evidence-gap"
    );

  if (
    evidenceGap
  ) {
    actions.push({
      priority:
        "High",

      action:
        `Close or validate the ${evidenceGap.skill} evidence gap before targeting more roles that require it.`,

      reason:
        `${evidenceGap.skill} was mandatory in ${evidenceGap.mandatory} observed postings and lacked verified matching evidence in ${evidenceGap.missingMandatory}.`,

      evidenceType:
        "verified-evidence-gap"
    });
  }

  if (
    sponsorshipFriction.totalObserved >=
      5 &&
    sponsorshipFriction.restrictiveRate >=
      25
  ) {
    actions.push({
      priority:
        "High",

      action:
        "Screen explicit sponsorship restrictions before investing in tailoring.",

      reason:
        `${sponsorshipFriction.restrictiveRate}% of the observed sample contained restrictive sponsorship or citizenship language.`,

      evidenceType:
        "posting-sponsorship-evidence"
    });
  }

  const proceedGap =
    Math.max(
      0,
      funnel.proceedDecisions -
        funnel.submittedApplications
    );

  if (
    proceedGap >=
      3
  ) {
    actions.push({
      priority:
        "Medium",

      action:
        "Review proceed decisions that have not become tracked submitted applications.",

      reason:
        `The observed sample contains ${proceedGap} more Proceed decisions than submitted applications.`,

      evidenceType:
        "workflow-funnel"
    });
  }

  if (
    funnel.submittedApplications >=
      5 &&
    funnel.interviewStage ===
      0
  ) {
    actions.push({
      priority:
        "Medium",

      action:
        "Tighten targeting and resume-positioning experiments before increasing application volume.",

      reason:
        `${funnel.submittedApplications} submitted applications are observed without an interview-stage outcome yet.`,

      evidenceType:
        "observational-outcomes"
    });
  }

  if (
    actions.length ===
      0
  ) {
    actions.push({
      priority:
        "Observe",

      action:
        "Keep expanding the observed job sample before making a stronger market-strategy change.",

      reason:
        readiness.explanation,

      evidenceType:
        "sample-readiness"
    });
  }

  return actions.slice(
    0,
    5
  );
}

function createRoleRationale({
  item,
  averageMatch,
  averageResumeCoverage,
  demandShare,
  interviewRate
}) {
  const parts =
    [
      `${item.observations} observed`,
      `${round(averageMatch, 1)}% average fit`,
      `${round(averageResumeCoverage, 1)}% resume coverage`,
      `${demandShare}% of observed sample`
    ];

  if (
    item.submitted >=
      3
  ) {
    parts.push(
      `${interviewRate}% interview-stage rate among submitted`
    );
  } else {
    parts.push(
      "outcome sample too small to materially weight"
    );
  }

  return parts.join(
    " · "
  );
}

function skillAction(
  name,
  classification
) {
  if (
    classification ===
      "evidence-gap"
  ) {
    return `Verify existing ${name} evidence or build truthful evidence before relying on this requirement.`;
  }

  if (
    classification ===
      "leverage-strength"
  ) {
    return `Keep verified ${name} evidence prominent when it is relevant to the role.`;
  }

  return `Continue observing ${name} demand before changing strategy.`;
}

function readinessLevel(
  value,
  thresholds
) {
  if (
    value >=
      thresholds.established
  ) {
    return "established";
  }

  if (
    value >=
      thresholds.usable
  ) {
    return "usable";
  }

  if (
    value >=
      thresholds.emerging
  ) {
    return "emerging";
  }

  return "collecting";
}

function createReadinessExplanation(
  observedJobs,
  submittedApplications
) {
  if (
    observedJobs <
      MARKET_READINESS_THRESHOLDS.emerging
  ) {
    return `Only ${observedJobs} observed jobs are available; market strategy remains exploratory.`;
  }

  if (
    submittedApplications <
      OUTCOME_READINESS_THRESHOLDS.emerging
  ) {
    return `${observedJobs} jobs support market-demand analysis, but only ${submittedApplications} submitted applications are available for outcome context.`;
  }

  return `${observedJobs} observed jobs and ${submittedApplications} submitted applications support deterministic personal market strategy; causal claims remain prohibited.`;
}

function observationConfidence(
  observations,
  companies
) {
  if (
    observations >=
      10 &&
    companies >=
      5
  ) {
    return "high";
  }

  if (
    observations >=
      5 &&
    companies >=
      3
  ) {
    return "medium";
  }

  return "low";
}

function isSubmittedApplication(
  application
) {
  if (
    !application ||
    typeof application !==
      "object"
  ) {
    return false;
  }

  if (
    normaliseText(
      application.dateApplied
    )
  ) {
    return true;
  }

  return SUBMITTED_STATUSES.has(
    applicationStatus(
      application
    )
  );
}

function applicationStatus(
  application
) {
  return normaliseKey(
    application
      ?.status
  );
}

function latestByJob(
  items,
  dateSelector
) {
  const latest =
    new Map();

  for (
    const item of
    items
  ) {
    const jobId =
      normaliseText(
        item?.jobId
      );

    if (
      !jobId
    ) {
      continue;
    }

    const existing =
      latest.get(
        jobId
      );

    if (
      !existing ||
      timestamp(
        dateSelector(
          item
        )
      ) >=
        timestamp(
          dateSelector(
            existing
          )
        )
    ) {
      latest.set(
        jobId,
        item
      );
    }
  }

  return latest;
}

function pushFinite(
  values,
  value
) {
  const number =
    Number(
      value
    );

  if (
    Number.isFinite(
      number
    )
  ) {
    values.push(
      clamp(
        number,
        0,
        100
      )
    );
  }
}

function average(
  values
) {
  if (
    values.length ===
      0
  ) {
    return 0;
  }

  return values.reduce(
    (
      sum,
      value
    ) =>
      sum +
      value,
    0
  ) /
    values.length;
}

function percentage(
  numerator,
  denominator
) {
  if (
    denominator <=
      0
  ) {
    return 0;
  }

  return round(
    clamp(
      (
        numerator /
        denominator
      ) *
        100,
      0,
      100
    ),
    1
  );
}

function round(
  value,
  digits =
    0
) {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return 0;
  }

  const factor =
    10 **
      digits;

  return Math.round(
    value *
      factor
  ) /
    factor;
}

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}

function timestamp(
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

function normaliseText(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const text =
    value.trim();

  return text ===
    ""
    ? null
    : text;
}

function normaliseKey(
  value
) {
  return String(
    value ??
    ""
  )
    .trim()
    .toLocaleLowerCase(
      "en-US"
    );
}

function deepFreeze(
  value
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Object.isFrozen(
      value
    )
  ) {
    return value;
  }

  Object.freeze(
    value
  );

  for (
    const child of
    Object.values(
      value
    )
  ) {
    deepFreeze(
      child
    );
  }

  return value;
}
