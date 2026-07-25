import { generateJSON } from "../utils/openaiClient.js";
import {
  parseJsonResponse,
  requireFields
} from "../utils/responseValidation.js";

import { buildContext } from "./contextBuilder.js";
import { buildNetworkPrompt } from "../prompts/networkPrompt.js";

export async function generateNetworkPlan({
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

  const prompt = buildNetworkPrompt({
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

  feature: "network",
  reasoningEffort: "low",
  maxOutputTokens: 1000
});

  return requireFields(
    parseJsonResponse(response),
   [
  "networkStrategy",
  "hunterSearch",
  "targetContacts",
  "outreachMessages",
  "followUpPlan"
]
  );
}