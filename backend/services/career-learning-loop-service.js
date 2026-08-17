import {
  assertRepositoryContext
} from "../database/repository.js";

import {
  assertCareerEvidenceService
} from "./career-evidence-service.js";

import {
  calculateCareerLearningLoop
} from "./career-learning-loop-intelligence.js";

import {
  assertMarketIntelligenceService
} from "./market-intelligence/market-intelligence-service.js";

export const CAREER_LEARNING_LOOP_SERVICE_SCHEMA_VERSION = 1;
export const CAREER_LEARNING_LOOP_SERVICE_NAME = "careerLearningLoopService";

const SERVICE_METHODS = Object.freeze([
  "getReport",
  "getSummary",
  "listAudits"
]);

const ALLOWED_AUDIT_QUERY_FIELDS = new Set([
  "recommendation",
  "outcome",
  "learningInfluenced",
  "behaviorAlignment",
  "limit",
  "offset"
]);

export function createCareerLearningLoopService({
  marketIntelligenceService,
  careerEvidenceService,
  clock = () => new Date()
} = {}) {
  const market =
    assertMarketIntelligenceService(
      marketIntelligenceService
    );

  const evidence =
    assertCareerEvidenceService(
      careerEvidenceService
    );

  if (typeof clock !== "function") {
    throw new TypeError(
      "Career Learning Loop clock must be a function."
    );
  }

  async function getReport(
    context,
    {
      auditLimit = 250
    } = {}
  ) {
    const ctx = assertRepositoryContext(context);

    const [
      dataset,
      evidenceSummary
    ] = await Promise.all([
      market.getDataset(ctx),
      evidence.getSummary(ctx)
    ]);

    return calculateCareerLearningLoop(dataset, {
      generatedAt: clock().toISOString(),
      careerEvidenceSummary: evidenceSummary,
      auditLimit
    });
  }

  async function getSummary(context) {
    const report = await getReport(context);

    return deepFreeze({
      schemaVersion: report.schemaVersion,
      calculationVersion: report.calculationVersion,
      generatedAt: report.generatedAt,
      mode: report.mode,
      readiness: report.readiness,
      summary: report.summary,
      maturity: report.maturity,
      calibration: report.calibration,
      learningInfluence: report.learningInfluence,
      drift: report.drift,
      actions: report.actions,
      definitions: report.definitions,
      guardrails: report.guardrails
    });
  }

  async function listAudits(context, rawQuery = {}) {
    const query = normaliseAuditQuery(rawQuery);
    const report = await getReport(
      context,
      {
        auditLimit: null
      }
    );

    const filtered = report.audits.filter((audit) => {
      if (
        query.recommendation !== null &&
        audit.recommendation !== query.recommendation
      ) {
        return false;
      }

      if (
        query.outcome !== null &&
        audit.outcome !== query.outcome
      ) {
        return false;
      }

      if (
        query.learningInfluenced !== null &&
        audit.learningInfluenced !== query.learningInfluenced
      ) {
        return false;
      }

      if (
        query.behaviorAlignment !== null &&
        audit.behaviorAlignment !== query.behaviorAlignment
      ) {
        return false;
      }

      return true;
    });

    const items = filtered.slice(
      query.offset,
      query.offset + query.limit
    );

    return deepFreeze({
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    });
  }

  return assertCareerLearningLoopService(
    Object.freeze({
      schemaVersion:
        CAREER_LEARNING_LOOP_SERVICE_SCHEMA_VERSION,
      name:
        CAREER_LEARNING_LOOP_SERVICE_NAME,
      getReport,
      getSummary,
      listAudits
    })
  );
}

export function assertCareerLearningLoopService(service) {
  if (
    !service ||
    typeof service !== "object" ||
    Array.isArray(service) ||
    service.schemaVersion !==
      CAREER_LEARNING_LOOP_SERVICE_SCHEMA_VERSION ||
    service.name !==
      CAREER_LEARNING_LOOP_SERVICE_NAME
  ) {
    throw new TypeError(
      "A valid Career Learning Loop service is required."
    );
  }

  for (const method of SERVICE_METHODS) {
    if (typeof service[method] !== "function") {
      throw new TypeError(
        `Career Learning Loop service must expose ${method}.`
      );
    }
  }

  return service;
}

function normaliseAuditQuery(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(
      "Career Learning Loop audit query must be an object."
    );
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_AUDIT_QUERY_FIELDS.has(key)) {
      throw new RangeError(
        `Unsupported Career Learning Loop audit query field: ${key}.`
      );
    }
  }

  return Object.freeze({
    recommendation:
      normaliseOptionalRecommendation(
        value.recommendation
      ),
    outcome:
      normaliseOptionalText(
        value.outcome,
        80
      ),
    learningInfluenced:
      normaliseOptionalBoolean(
        value.learningInfluenced
      ),
    behaviorAlignment:
      normaliseOptionalText(
        value.behaviorAlignment,
        40
      ),
    limit:
      normaliseInteger(
        value.limit,
        1,
        250,
        50
      ),
    offset:
      normaliseInteger(
        value.offset,
        0,
        Number.MAX_SAFE_INTEGER,
        0
      )
  });
}

function normaliseOptionalRecommendation(value) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  const recommendation = {
    apply: "Apply",
    tailor: "Tailor",
    save: "Save",
    skip: "Skip"
  }[normalized];

  if (!recommendation) {
    throw new RangeError(
      "Career Learning Loop recommendation must be Apply, Tailor, Save, or Skip."
    );
  }

  return recommendation;
}

function normaliseOptionalText(value, maximumLength) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const normalized = String(value).trim();

  if (normalized.length > maximumLength) {
    throw new RangeError(
      `Career Learning Loop query value must be at most ${maximumLength} characters.`
    );
  }

  return normalized;
}

function normaliseOptionalBoolean(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  throw new TypeError(
    "Career Learning Loop learningInfluenced must be true or false."
  );
}

function normaliseInteger(value, minimum, maximum, fallback) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const numeric = Number(value);

  if (
    !Number.isInteger(numeric) ||
    numeric < minimum ||
    numeric > maximum
  ) {
    throw new RangeError(
      `Career Learning Loop numeric query value must be an integer between ${minimum} and ${maximum}.`
    );
  }

  return numeric;
}

function deepFreeze(value) {
  if (
    value &&
    typeof value === "object" &&
    !Object.isFrozen(value)
  ) {
    Object.freeze(value);

    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }

  return value;
}
