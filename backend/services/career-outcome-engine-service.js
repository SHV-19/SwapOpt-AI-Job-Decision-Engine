import {
  assertRepositoryContext
} from "../database/repository.js";

import {
  validateJobAnalysisResponse
} from "../validation/job-analysis-response.js";

import {
  applyAdaptiveJobAnalysis
} from "./adaptive-job-analysis-policy.js";

import {
  assertCareerEvidenceService
} from "./career-evidence-service.js";

import {
  CAREER_OUTCOME_ENGINE_CALCULATION_VERSION,
  createCareerOutcomeEvaluation,
  createCareerOutcomeProfile
} from "./career-outcome-intelligence.js";

import {
  assertPersonalLearningService
} from "./personal-learning-service.js";

import {
  assertCareerLearningLoopService
} from "./career-learning-loop-service.js";

export const CAREER_OUTCOME_ENGINE_SERVICE_SCHEMA_VERSION = 1;
export {
  CAREER_OUTCOME_ENGINE_CALCULATION_VERSION
};
export const CAREER_OUTCOME_ENGINE_SERVICE_NAME = "careerOutcomeEngineService";

const SERVICE_METHODS =
  Object.freeze([
    "getProfile",
    "evaluate"
  ]);

export function createCareerOutcomeEngineService({
  personalLearningService,
  careerEvidenceService,
  careerLearningLoopService,
  clock =
    () =>
      new Date()
} = {}) {
  const learning =
    assertPersonalLearningService(
      personalLearningService
    );

  const evidence =
    assertCareerEvidenceService(
      careerEvidenceService
    );

  const learningLoop =
    careerLearningLoopService ===
        undefined ||
      careerLearningLoopService ===
        null
      ? null
      : assertCareerLearningLoopService(
          careerLearningLoopService
        );

  if (
    typeof clock !==
      "function"
  ) {
    throw new TypeError(
      "Career Outcome Engine clock must be a function."
    );
  }

  async function loadSources(
    context
  ) {
    const ctx =
      assertRepositoryContext(
        context
      );

    const [
      learningProfile,
      decisionContext,
      learningLoopSummary
    ] =
      await Promise.all([
        learning.getProfile(
          ctx
        ),
        evidence.getDecisionContext(
          ctx
        ),
        learningLoop ===
          null
          ? Promise.resolve(
              null
            )
          : learningLoop.getSummary(
              ctx
            )
      ]);

    return {
      learningProfile,
      decisionContext,
      learningLoopSummary
    };
  }

  async function getProfile(
    context
  ) {
    const {
      learningProfile,
      decisionContext,
      learningLoopSummary
    } =
      await loadSources(
        context
      );

    return createCareerOutcomeProfile({
      learningProfile,
      decisionContext,
      learningLoopSummary,
      generatedAt:
        clock()
          .toISOString()
    });
  }

  async function evaluate(
    context,
    input
  ) {
    assertEvaluationInput(
      input
    );

    const baselineAnalysis =
      validateEvaluationAnalysis(
        input.analysis
      );

    const {
      learningProfile,
      decisionContext,
      learningLoopSummary
    } =
      await loadSources(
        context
      );

    const adaptive =
      applyAdaptiveJobAnalysis({
        payload:
          input.payload,
        analysis:
          baselineAnalysis,
        personalLearningProfile:
          learningProfile
      });

    const profile =
      createCareerOutcomeProfile({
        learningProfile,
        decisionContext,
        learningLoopSummary,
        generatedAt:
          clock()
            .toISOString()
      });

    return deepFreeze({
      analysis:
        adaptive.analysis,

      metadata: {
        adaptiveLearning:
          adaptive.metadata,

        careerOutcome:
          createCareerOutcomeEvaluation({
            baselineAnalysis,
            adaptive,
            profile
          })
      }
    });
  }

  return assertCareerOutcomeEngineService(
    Object.freeze({
      schemaVersion:
        CAREER_OUTCOME_ENGINE_SERVICE_SCHEMA_VERSION,

      name:
        CAREER_OUTCOME_ENGINE_SERVICE_NAME,

      getProfile,
      evaluate
    })
  );
}

export function assertCareerOutcomeEngineService(
  service
) {
  if (
    !service ||
    typeof service !==
      "object" ||
    Array.isArray(
      service
    ) ||
    service.schemaVersion !==
      CAREER_OUTCOME_ENGINE_SERVICE_SCHEMA_VERSION ||
    service.name !==
      CAREER_OUTCOME_ENGINE_SERVICE_NAME
  ) {
    throw new TypeError(
      "A valid Career Outcome Engine service is required."
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
        `Career Outcome Engine service must expose ${method}.`
      );
    }
  }

  return service;
}

function assertEvaluationInput(
  input
) {
  if (
    !isRecord(
      input
    )
  ) {
    throw new TypeError(
      "Career Outcome Engine evaluation input must be an object."
    );
  }

  const keys =
    Object.keys(
      input
    );

  if (
    keys.some(
      (key) =>
        ![
          "payload",
          "analysis"
        ].includes(
          key
        )
    )
  ) {
    throw new RangeError(
      "Career Outcome Engine evaluation input contains unsupported fields."
    );
  }

  if (
    !isRecord(
      input.payload
    )
  ) {
    throw new TypeError(
      "Career Outcome Engine evaluation requires a job payload object."
    );
  }

  if (
    !isRecord(
      input.analysis
    )
  ) {
    throw new TypeError(
      "Career Outcome Engine evaluation requires a job analysis object."
    );
  }
}

function validateEvaluationAnalysis(
  analysis
) {
  try {
    return validateJobAnalysisResponse(
      analysis
    );
  } catch (
    error
  ) {
    throw new TypeError(
      "Career Outcome Engine evaluation requires a valid current-job analysis.",
      {
        cause:
          error
      }
    );
  }
}

function isRecord(
  value
) {
  return (
    value !==
      null &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  );
}

function deepFreeze(
  value
) {
  if (
    value &&
    typeof value ===
      "object" &&
    !Object.isFrozen(
      value
    )
  ) {
    Object.freeze(
      value
    );

    for (
      const nested of
      Object.values(
        value
      )
    ) {
      deepFreeze(
        nested
      );
    }
  }

  return value;
}
