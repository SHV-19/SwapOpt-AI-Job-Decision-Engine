import { generateJSON } from "../utils/openaiClient.js";
import {
  parseJsonResponse,
  requireFields
} from "../utils/responseValidation.js";
import { buildApplicationPrompt } from "../prompts/applicationPrompt.js";
import { buildContext } from "./contextBuilder.js";

export async function generateApplicationAnswers({
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

  const prompt = buildApplicationPrompt({
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
  userPrompt: prompt.user,

  feature: "application",
  reasoningEffort: "low",
  maxOutputTokens: 1500
});

  return requireFields(
    parseJsonResponse(response),
    [
      "summary",
      "strengths",
      "concerns",
      "recommended_answers"
    ]
  );
}