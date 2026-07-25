import { generateJSON } from "../utils/openaiClient.js";
import {
  parseJsonResponse,
  requireFields
} from "../utils/responseValidation.js";

import { buildContext } from "./contextBuilder.js";
import { buildTailorPrompt } from "../prompts/tailorResumePrompt.js";

export async function tailorResume({
  jobDescription = "",
  companyName = "",
  jobTitle = "",
  verdictScore = null,
  resumeType = "general"
} = {}) {
  const context = buildContext({
    jobDescription,
    companyName,
    jobTitle,
    resumeType
  });

  const prompt = buildTailorPrompt({
    profile: context.profile,
    preferences: context.preferences,
    resume: context.resume,
    skills: context.skills,
    experience: context.experience,
    jobDescription: context.job.description,
    companyName: context.job.companyName,
    jobTitle: context.job.jobTitle,
    verdictScore,
    resumeType: context.resumeType
  });

const response = await generateJSON({
  systemPrompt: prompt.system,
  userPrompt: prompt.user,

  feature: "tailor",
  reasoningEffort: "low",
  maxOutputTokens: 1800
});

  return requireFields(
    parseJsonResponse(response),
    [
      "professionalSummary",
      "skills",
      "experience",
      "projects",
      "atsKeywords",
      "tailoringNotes"
    ]
  );
}