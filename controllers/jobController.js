import { validateJobRequest } from "../utils/requestValidation.js";

import { analyzeJob } from "../services/jobService.js";
import { tailorResume } from "../services/tailorService.js";
import { generateResume } from "../services/resumeService.js";
import { generateApplicationAnswers } from "../services/applicationService.js";
import { generateCoverLetter } from "../services/coverLetterService.js";
import { generateNetworkPlan } from "../services/networkService.js";

import {
  hunterSearch,
  filterRelevantHunterContacts
} from "../services/hunterService.js";

function ensureObject(value) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value;
  }

  return {
    result: value
  };
}

function clampScore(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getVerdictScore(body = {}) {
  const score = Number(
    body.applyScore ??
    body.verdictScore ??
    body.swapopt_verdict?.apply_score
  );

  if (!Number.isFinite(score)) {
    const error = new Error(
      "A valid apply score is required. Analyze the job first."
    );
    error.status = 400;
    throw error;
  }

  return Math.max(
    0,
    Math.min(10, Math.round(score))
  );
}

  /*
   * Retain support for the previous verdictScore payload
   * so older stored extension state does not immediately break.
   */
  if (
    body.verdictScore !== undefined &&
    body.verdictScore !== null &&
    body.verdictScore !== ""
  ) {
    const verdictScore = Number(body.verdictScore);

    if (!Number.isFinite(verdictScore)) {
      const error = new Error(
        "A valid verdict score is required. Analyze the job first."
      );
      error.status = 400;
      throw error;
    }

    return Math.round(
      clampScore(verdictScore)
    );
  }

  const nestedApplyScore = Number(
    body.swapopt_verdict?.apply_score
  );

  if (Number.isFinite(nestedApplyScore)) {
    return Math.round(
      clampScore(nestedApplyScore, 1, 10) * 10
    );
  }

  const error = new Error(
    "A valid apply score is required. Analyze the job first."
  );
  error.status = 400;
  throw error;
}

function tailoringEffort(score) {
  if (score >= 8) {
    return "Maximum Effort";
  }

  if (score >= 6) {
    return "Strong Tailoring";
  }

  return "Do Not Tailor";
}

function formatHunterContact(person = {}) {
  return {
    name: `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim(),
    position: String(
      person.position ?? ""
    ).trim(),
    email: String(
      person.value ??
      person.email ??
      ""
    ).trim(),
    confidence:
      person.confidence ?? null,
    type: String(
      person.type ?? ""
    ).trim()
  };
}

export async function analyzeJobController(req, res) {
  const {
    jobDescription,
    companyName,
    jobTitle,
    resumeType
  } = validateJobRequest(req.body);

  const result = await analyzeJob({
    jobDescription,
    companyName,
    jobTitle,
    resumeType
  });

  return res.status(200).json(
    ensureObject(result)
  );
}

export async function tailorController(req, res) {
  const {
    jobDescription,
    companyName,
    jobTitle,
    resumeType
  } = validateJobRequest(req.body);

  const verdictScore = getVerdictScore(
    req.body
  );

  const result = ensureObject(
    await tailorResume({
      jobDescription,
      companyName,
      jobTitle,
      resumeType,
      verdictScore
    })
  );

  return res.status(200).json({
    ...result,
    tailoring_effort:
      tailoringEffort(verdictScore),
    tailoring_score:
      verdictScore
  });
}

export async function resumeDraftController(
  req,
  res
) {
  const {
    jobDescription,
    companyName,
    jobTitle,
    resumeType
  } = validateJobRequest(req.body);

  const verdictScore = getVerdictScore(
    req.body
  );

  const result = ensureObject(
    await generateResume({
      jobDescription,
      companyName,
      jobTitle,
      resumeType,
      verdictScore
    })
  );

  return res.status(200).json({
    ...result,
    resume_score:
      verdictScore
  });
}

export async function applicationHelpController(
  req,
  res
) {
  const {
    jobDescription,
    companyName,
    jobTitle,
    resumeType
  } = validateJobRequest(req.body);

  const result = await generateApplicationAnswers({
    jobDescription,
    companyName,
    jobTitle,
    resumeType
  });

  return res.status(200).json(
    ensureObject(result)
  );
}

export async function coverLetterController(
  req,
  res
) {
  const {
    jobDescription,
    companyName,
    jobTitle,
    resumeType
  } = validateJobRequest(req.body);

  const result = await generateCoverLetter({
    jobDescription,
    companyName,
    jobTitle,
    resumeType
  });

  return res.status(200).json(
    ensureObject(result)
  );
}

export async function networkController(
  req,
  res
) {
  const {
    jobDescription,
    companyName,
    jobTitle,
    resumeType
  } = validateJobRequest(req.body);

  const result = ensureObject(
    await generateNetworkPlan({
      jobDescription,
      companyName,
      jobTitle,
      resumeType
    })
  );

  const hunterRecommended =
    result.hunterSearch?.recommended === true;

  const companyDomain = String(
    result.hunterSearch?.companyDomain ?? ""
  ).trim();

  let discoveredContacts = [];

  if (
    hunterRecommended &&
    companyDomain
  ) {
    const contacts = await hunterSearch(
      companyDomain
    );

    discoveredContacts =
      filterRelevantHunterContacts(
        contacts
      ).map(formatHunterContact);
  }

  return res.status(200).json({
    ...result,
    discovered_contacts:
      discoveredContacts
  });
}