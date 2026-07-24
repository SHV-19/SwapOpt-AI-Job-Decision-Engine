import { generateJSON } from "../utils/openaiClient.js";
import {
  parseJsonResponse,
  requireFields
} from "../utils/responseValidation.js";

import { buildContext } from "./contextBuilder.js";
import { buildCoverLetterPrompt } from "../prompts/coverLetterPrompt.js";

export async function generateCoverLetter({
  jobDescription = "",
  companyName = "",
  jobTitle = "",
  resumeType = "general"
} = {}) {
  const context = buildContext({
    jobDescription,
    companyName,
    jobTitle,
    resumeType
  });

  const prompt = buildCoverLetterPrompt({
    profile: context.profile,
    preferences: context.preferences,
    resume: context.resume,
    skills: context.skills,
    experience: context.experience,
    jobDescription: context.job.description,
    companyName: context.job.companyName,
    jobTitle: context.job.jobTitle,
    resumeType: context.resumeType
  });

  const response = await generateJSON({
    systemPrompt: prompt.system,
    userPrompt: prompt.user
  });

  return requireFields(
    parseJsonResponse(response),
    [
      "coverLetter",
      "opening",
      "body",
      "closing"
    ]
  );
}