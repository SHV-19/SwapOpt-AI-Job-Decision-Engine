import { generateJSON } from "../utils/openaiClient.js";
import {
  parseJsonResponse,
  requireFields
} from "../utils/responseValidation.js";

import { buildAnalyzePrompt } from "../prompts/analyzePrompt.js";
import { buildContext } from "./contextBuilder.js";

export async function analyzeJob({
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

  const prompt = buildAnalyzePrompt({
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
  "swapopt_verdict",
  "current_match_percent",
  "tailored_match_percent",
  "hiring_logic_score",
  "missing_keywords",
  "keywords_to_emphasize",
  "decision",
  "next_action"
]
  );
}