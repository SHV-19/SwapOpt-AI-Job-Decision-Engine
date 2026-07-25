import { generateJSON } from "../utils/openaiClient.js";
import {
  parseJsonResponse,
  requireFields
} from "../utils/responseValidation.js";

import { buildContext } from "./contextBuilder.js";
import { buildResumePrompt } from "../prompts/resumePrompt.js";

export async function generateResume({
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

  const prompt = buildResumePrompt({
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

  feature: "resume",
  reasoningEffort: "low",
  maxOutputTokens: 2200
});

  return requireFields(
    parseJsonResponse(response),
    [
      "resume",
      "summary",
      "skills",
      "experience",
      "projects",
      "atsKeywords",
      "notes"
    ]
  );
}