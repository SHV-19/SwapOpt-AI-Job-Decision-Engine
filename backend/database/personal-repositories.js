import {
  homedir
} from "node:os";

import path from "node:path";

import {
  createJsonFileRepository
} from "./json-file-repository.js";

import {
  assertRepository
} from "./repository.js";

export const PERSONAL_REPOSITORY_REGISTRY_SCHEMA_VERSION =
  1;

export const PERSONAL_REPOSITORY_MODE =
  "personal";

export const DEFAULT_PERSONAL_DATA_DIRECTORY =
  path.resolve(
    homedir(),
    ".swapopt",
    "data"
  );

const RAW_PERSONAL_REPOSITORY_DEFINITIONS = {
  resumes: {
    repositoryName:
      "resumeRepository",

    entityName:
      "resume",

    fileName:
      "resumes.json"
  },

  resumeVersions: {
    repositoryName:
      "resumeVersionRepository",

    entityName:
      "resume-version",

    fileName:
      "resume-versions.json"
  },

  jobs: {
    repositoryName:
      "jobRepository",

    entityName:
      "job",

    fileName:
      "jobs.json"
  },

  companies: {
    repositoryName:
      "companyRepository",

    entityName:
      "company",

    fileName:
      "companies.json"
  },

  jobAnalyses: {
    repositoryName:
      "jobAnalysisRepository",

    entityName:
      "job-analysis",

    fileName:
      "job-analyses.json"
  },

  applications: {
    repositoryName:
      "applicationRepository",

    entityName:
      "application",

    fileName:
      "applications.json"
  },

  coverLetters: {
    repositoryName:
      "coverLetterRepository",

    entityName:
      "cover-letter",

    fileName:
      "cover-letters.json"
  },

  coverLetterVersions: {
    repositoryName:
      "coverLetterVersionRepository",

    entityName:
      "cover-letter-version",

    fileName:
      "cover-letter-versions.json"
  },

  aiSessions: {
    repositoryName:
      "aiSessionRepository",

    entityName:
      "ai-session",

    fileName:
      "ai-sessions.json"
  },

  userPreferences: {
    repositoryName:
      "userPreferenceRepository",

    entityName:
      "user-preference",

    fileName:
      "user-preferences.json"
  },

  networkingContacts: {
    repositoryName:
      "networkingContactRepository",

    entityName:
      "networking-contact",

    fileName:
      "networking-contacts.json"
  },

  gmailAccounts: {
    repositoryName:
      "gmailAccountRepository",

    entityName:
      "gmail-account",

    fileName:
      "gmail-accounts.json"
  },

  gmailOAuthTransactions: {
    repositoryName:
      "gmailOAuthTransactionRepository",

    entityName:
      "gmail-oauth-transaction",

    fileName:
      "gmail-oauth-transactions.json"
  },

  gmailMessages: {
    repositoryName:
      "gmailMessageRepository",

    entityName:
      "gmail-message",

    fileName:
      "gmail-messages.json"
  },

  gmailClassifications: {
    repositoryName:
      "gmailClassificationRepository",

    entityName:
      "gmail-classification",

    fileName:
      "gmail-classifications.json"
  },

  applicationStatusEvents: {
    repositoryName:
      "applicationStatusEventRepository",

    entityName:
      "application-status-event",

    fileName:
      "application-status-events.json"
  },

  calendarEventLinks: {
    repositoryName:
      "calendarEventLinkRepository",

    entityName:
      "calendar-event-link",

    fileName:
      "calendar-event-links.json"
  },

  baseResumes: {
    repositoryName:
      "baseResumeRepository",

    entityName:
      "base-resume",

    fileName:
      "base-resumes.json"
  },

  skills: {
    repositoryName:
      "skillRepository",

    entityName:
      "skill",

    fileName:
      "skills.json"
  },

  skillGapAssessments: {
    repositoryName:
      "skillGapAssessmentRepository",

    entityName:
      "skill-gap-assessment",

    fileName:
      "skill-gap-assessments.json"
  },

  learningPlans: {
    repositoryName:
      "learningPlanRepository",

    entityName:
      "learning-plan",

    fileName:
      "learning-plans.json"
  },

  linkedinVersions: {
    repositoryName:
      "linkedinVersionRepository",

    entityName:
      "linkedin-version",

    fileName:
      "linkedin-versions.json"
  },

  portfolioProjects: {
    repositoryName:
      "portfolioProjectRepository",

    entityName:
      "portfolio-project",

    fileName:
      "portfolio-projects.json"
  },

  projectLibrary: {
    repositoryName:
      "projectLibraryRepository",

    entityName:
      "project-library-item",

    fileName:
      "project-library.json"
  },

  sourceDocuments: {
    repositoryName:
      "sourceDocumentRepository",

    entityName:
      "source-document",

    fileName:
      "source-documents.json"
  },

  projectSelections: {
    repositoryName:
      "projectSelectionRepository",

    entityName:
      "project-selection",

    fileName:
      "project-selections.json"
  },

  applicationResumeDocuments: {
    repositoryName:
      "applicationResumeDocumentRepository",

    entityName:
      "application-resume-document",

    fileName:
      "application-resume-documents.json"
  },

  applicationResumeVersions: {
    repositoryName:
      "applicationResumeVersionRepository",

    entityName:
      "application-resume-version",

    fileName:
      "application-resume-versions.json"
  },

  resumeExportHistory: {
    repositoryName:
      "resumeExportHistoryRepository",

    entityName:
      "resume-export-history",

    fileName:
      "resume-export-history.json"
  },

  portfolioVersions: {
    repositoryName:
      "portfolioVersionRepository",

    entityName:
      "portfolio-version",

    fileName:
      "portfolio-versions.json"
  },

  careerPlans: {
    repositoryName:
      "careerPlanRepository",

    entityName:
      "career-plan",

    fileName:
      "career-plans.json"
  },

  compensationOffers: {
    repositoryName:
      "compensationOfferRepository",

    entityName:
      "compensation-offer",

    fileName:
      "compensation-offers.json"
  },

  negotiationPlans: {
    repositoryName:
      "negotiationPlanRepository",

    entityName:
      "negotiation-plan",

    fileName:
      "negotiation-plans.json"
  },

  coachingSessions: {
    repositoryName:
      "coachingSessionRepository",

    entityName:
      "coaching-session",

    fileName:
      "coaching-sessions.json"
  },

  usageEvents: {
    repositoryName:
      "usageEventRepository",

    entityName:
      "usage-event",

    fileName:
      "usage-events.json"
  },

  auditEvents: {
    repositoryName:
      "auditEventRepository",

    entityName:
      "audit-event",

    fileName:
      "audit-events.json"
  },

  applicationBehaviorEvents: {
    repositoryName:
      "applicationBehaviorEventRepository",

    entityName:
      "application-behavior-event",

    fileName:
      "application-behavior-events.json"
  },

  marketJobSnapshots: {
    repositoryName:
      "marketJobSnapshotRepository",

    entityName:
      "market-job-snapshot",

    fileName:
      "market-job-snapshots.json"
  },

  marketEntities: {
    repositoryName:
      "marketEntityRepository",

    entityName:
      "market-entity",

    fileName:
      "market-entities.json"
  },

  jobDecisions: {
    repositoryName:
      "jobDecisionRepository",

    entityName:
      "job-decision",

    fileName:
      "job-decisions.json"
  },

  marketTrendSnapshots: {
    repositoryName:
      "marketTrendSnapshotRepository",

    entityName:
      "market-trend-snapshot",

    fileName:
      "market-trend-snapshots.json"
  },

  marketBackfillRuns: {
    repositoryName:
      "marketBackfillRunRepository",

    entityName:
      "market-backfill-run",

    fileName:
      "market-backfill-runs.json"
  },

  marketAgentQuestions: {
    repositoryName:
      "marketAgentQuestionRepository",

    entityName:
      "market-agent-question",

    fileName:
      "market-agent-questions.json"
  },

  marketAgentUsageEvents: {
    repositoryName:
      "marketAgentUsageEventRepository",

    entityName:
      "market-agent-usage-event",

    fileName:
      "market-agent-usage-events.json"
  },

  careerEvidenceClaims: {
    repositoryName:
      "careerEvidenceClaimRepository",

    entityName:
      "career-evidence-claim",

    fileName:
      "career-evidence-claims.json"
  }
};

export const PERSONAL_REPOSITORY_DEFINITIONS =
  Object.freeze(
    Object.fromEntries(
      Object.entries(
        RAW_PERSONAL_REPOSITORY_DEFINITIONS
      ).map(
        ([
          repositoryKey,
          definition
        ]) => [
          repositoryKey,
          Object.freeze({
            ...definition
          })
        ]
      )
    )
  );

export const PERSONAL_REPOSITORY_KEYS =
  Object.freeze(
    Object.keys(
      PERSONAL_REPOSITORY_DEFINITIONS
    )
  );

const PERSONAL_REPOSITORY_KEY_SET =
  new Set(
    PERSONAL_REPOSITORY_KEYS
  );

const SUPPORTED_OPTION_KEYS =
  new Set([
    "dataDirectory",
    "maxFileBytes",
    "idFactory",
    "clock"
  ]);

const REGISTRY_KEYS =
  Object.freeze([
    "schemaVersion",
    "mode",
    "dataDirectory",
    "paths",
    "repositories",
    "getRepository"
  ]);

function isRecord(
  value
) {
  return (
    value !== null &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  );
}

function isPlainObject(
  value
) {
  if (
    !isRecord(
      value
    )
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(
      value
    );

  return (
    prototype ===
      Object.prototype ||
    prototype ===
      null
  );
}

function assertPlainObject(
  value,
  message
) {
  if (
    !isPlainObject(
      value
    )
  ) {
    throw new TypeError(
      message
    );
  }
}

function assertSupportedOptionKeys(
  options
) {
  const unsupportedKeys =
    Reflect.ownKeys(
      options
    ).filter(
      (key) =>
        typeof key !==
          "string" ||
        !SUPPORTED_OPTION_KEYS.has(
          key
        )
    );

  if (
    unsupportedKeys.length >
    0
  ) {
    throw new RangeError(
      [
        "Personal repository options contain unsupported fields:",
        `${unsupportedKeys.map(String).join(", ")}.`
      ].join(" ")
    );
  }
}

function assertExactStringKeys(
  value,
  expectedKeys,
  description
) {
  const ownKeys =
    Reflect.ownKeys(
      value
    );

  if (
    ownKeys.some(
      (key) =>
        typeof key !==
          "string"
    )
  ) {
    throw new TypeError(
      `${description} must not contain symbol fields.`
    );
  }

  const actualKeys =
    ownKeys.sort();

  const sortedExpectedKeys =
    [
      ...expectedKeys
    ].sort();

  if (
    actualKeys.length !==
      sortedExpectedKeys.length ||
    !actualKeys.every(
      (
        key,
        index
      ) =>
        key ===
        sortedExpectedKeys[index]
    )
  ) {
    throw new TypeError(
      `${description} contains unsupported or missing fields.`
    );
  }
}

function normaliseDataDirectory(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "Personal repository data directory must be a string."
    );
  }

  const trimmedValue =
    value.trim();

  if (
    trimmedValue ===
      "" ||
    trimmedValue.includes(
      "\u0000"
    )
  ) {
    throw new RangeError(
      "Personal repository data directory must not be blank or contain null characters."
    );
  }

  const resolvedDirectory =
    path.resolve(
      trimmedValue
    );

  if (
    resolvedDirectory ===
      path.parse(
        resolvedDirectory
      ).root
  ) {
    throw new RangeError(
      "Personal repository data directory must not be a filesystem root."
    );
  }

  return resolvedDirectory;
}

function normaliseRepositoryKey(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "Personal repository key must be a string."
    );
  }

  const repositoryKey =
    value.trim();

  if (
    !PERSONAL_REPOSITORY_KEY_SET.has(
      repositoryKey
    )
  ) {
    throw new RangeError(
      [
        `Unsupported personal repository: ${repositoryKey || "(blank)"}.`,
        "Supported repositories:",
        `${PERSONAL_REPOSITORY_KEYS.join(", ")}.`
      ].join(" ")
    );
  }

  return repositoryKey;
}

function validateOptionalDependencies(
  options
) {
  if (
    Object.hasOwn(
      options,
      "maxFileBytes"
    ) &&
    (
      !Number.isSafeInteger(
        options.maxFileBytes
      ) ||
      options.maxFileBytes <
        1_024
    )
  ) {
    throw new RangeError(
      "Personal repository maximum file size must be a safe integer of at least 1024 bytes."
    );
  }

  if (
    Object.hasOwn(
      options,
      "idFactory"
    ) &&
    typeof options.idFactory !==
      "function"
  ) {
    throw new TypeError(
      "Personal repository ID factory must be a function."
    );
  }

  if (
    Object.hasOwn(
      options,
      "clock"
    ) &&
    typeof options.clock !==
      "function"
  ) {
    throw new TypeError(
      "Personal repository clock must be a function."
    );
  }
}

function createRepositoryPath(
  dataDirectory,
  fileName
) {
  const repositoryPath =
    path.resolve(
      dataDirectory,
      fileName
    );

  const expectedPrefix =
    `${dataDirectory}${path.sep}`;

  if (
    !repositoryPath.startsWith(
      expectedPrefix
    )
  ) {
    throw new Error(
      "Personal repository path resolved outside the configured data directory."
    );
  }

  return repositoryPath;
}

function createAdapterOptions(
  definition,
  filePath,
  options
) {
  const adapterOptions = {
    name:
      definition.repositoryName,

    entityName:
      definition.entityName,

    filePath
  };

  for (
    const optionName of
    [
      "maxFileBytes",
      "idFactory",
      "clock"
    ]
  ) {
    if (
      Object.hasOwn(
        options,
        optionName
      )
    ) {
      adapterOptions[
        optionName
      ] =
        options[
          optionName
        ];
    }
  }

  return adapterOptions;
}

export function createPersonalRepositories(
  options = {}
) {
  assertPlainObject(
    options,
    "Personal repository options must be a plain object."
  );

  assertSupportedOptionKeys(
    options
  );

  validateOptionalDependencies(
    options
  );

  const dataDirectory =
    normaliseDataDirectory(
      Object.hasOwn(
        options,
        "dataDirectory"
      )
        ? options.dataDirectory
        : DEFAULT_PERSONAL_DATA_DIRECTORY
    );

  const pathEntries =
    [];

  const repositoryEntries =
    [];

  for (
    const repositoryKey of
    PERSONAL_REPOSITORY_KEYS
  ) {
    const definition =
      PERSONAL_REPOSITORY_DEFINITIONS[
        repositoryKey
      ];

    const repositoryPath =
      createRepositoryPath(
        dataDirectory,
        definition.fileName
      );

    const repository =
      createJsonFileRepository(
        createAdapterOptions(
          definition,
          repositoryPath,
          options
        )
      );

    pathEntries.push([
      repositoryKey,
      repositoryPath
    ]);

    repositoryEntries.push([
      repositoryKey,
      repository
    ]);
  }

  const paths =
    Object.freeze(
      Object.fromEntries(
        pathEntries
      )
    );

  const repositories =
    Object.freeze(
      Object.fromEntries(
        repositoryEntries
      )
    );

  function getRepository(
    repositoryKey
  ) {
    const validatedRepositoryKey =
      normaliseRepositoryKey(
        repositoryKey
      );

    return repositories[
      validatedRepositoryKey
    ];
  }

  const registry =
    Object.freeze({
      schemaVersion:
        PERSONAL_REPOSITORY_REGISTRY_SCHEMA_VERSION,

      mode:
        PERSONAL_REPOSITORY_MODE,

      dataDirectory,

      paths,

      repositories,

      getRepository
    });

  return assertPersonalRepositoryRegistry(
    registry
  );
}

export function assertPersonalRepositoryRegistry(
  registry
) {
  assertPlainObject(
    registry,
    "A valid personal repository registry is required."
  );

  assertExactStringKeys(
    registry,
    REGISTRY_KEYS,
    "Personal repository registry"
  );

  if (
    registry.schemaVersion !==
      PERSONAL_REPOSITORY_REGISTRY_SCHEMA_VERSION
  ) {
    throw new RangeError(
      [
        "Unsupported personal repository registry schema version:",
        `${String(registry.schemaVersion)}.`
      ].join(" ")
    );
  }

  if (
    registry.mode !==
      PERSONAL_REPOSITORY_MODE
  ) {
    throw new TypeError(
      'Personal repository registry mode must be "personal".'
    );
  }

  const dataDirectory =
    normaliseDataDirectory(
      registry.dataDirectory
    );

  if (
    registry.dataDirectory !==
      dataDirectory
  ) {
    throw new TypeError(
      "Personal repository data directory must already be normalised."
    );
  }

  assertPlainObject(
    registry.paths,
    "Personal repository paths must be a plain object."
  );

  assertPlainObject(
    registry.repositories,
    "Personal repositories must be a plain object."
  );

  assertExactStringKeys(
    registry.paths,
    PERSONAL_REPOSITORY_KEYS,
    "Personal repository paths"
  );

  assertExactStringKeys(
    registry.repositories,
    PERSONAL_REPOSITORY_KEYS,
    "Personal repositories"
  );

  if (
    typeof registry.getRepository !==
      "function"
  ) {
    throw new TypeError(
      "Personal repository registry must expose a getRepository function."
    );
  }

  for (
    const repositoryKey of
    PERSONAL_REPOSITORY_KEYS
  ) {
    const definition =
      PERSONAL_REPOSITORY_DEFINITIONS[
        repositoryKey
      ];

    const expectedPath =
      createRepositoryPath(
        dataDirectory,
        definition.fileName
      );

    if (
      registry.paths[
        repositoryKey
      ] !==
      expectedPath
    ) {
      throw new TypeError(
        `Personal repository path is invalid for ${repositoryKey}.`
      );
    }

    const repository =
      assertRepository(
        registry.repositories[
          repositoryKey
        ]
      );

    if (
      repository.name !==
        definition.repositoryName ||
      repository.entityName !==
        definition.entityName
    ) {
      throw new TypeError(
        `Personal repository metadata is invalid for ${repositoryKey}.`
      );
    }

    if (
      registry.getRepository(
        repositoryKey
      ) !==
      repository
    ) {
      throw new TypeError(
        `Personal repository lookup is inconsistent for ${repositoryKey}.`
      );
    }
  }

  return registry;
}

export function isPersonalRepositoryRegistry(
  value
) {
  try {
    assertPersonalRepositoryRegistry(
      value
    );

    return true;
  } catch {
    return false;
  }
}

export const personalRepositories =
  createPersonalRepositories();

export default personalRepositories;